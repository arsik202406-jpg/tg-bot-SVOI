"""Планувальник: автоматичні дії за розкладом (перевірка щохвилини).

• За 3 дні до поїздки: якщо людей менше мінімуму — попередження адміну.
• Напередодні о CONFIRM_HOUR (14:00, ~15 год до виїзду): кожному пасажиру «Підтвердіть участь» + час посадки.
  Якщо маршрут ще не затверджено — нагадування адміну.
• Напередодні о 21:00: адміну список тих, хто не відповів.
• Наступного дня після поїздки о 11:00: прохання оцінити поїздку.
• Щонеділі о 20:00: резервна копія всіх бронювань (таблиця) адміну.
• Щоночі: телефон і адреса у бронюваннях старших за 6 місяців видаляються.
Кожна дія записується в job_log, тож після перезапуску бот нічого не надішле двічі.
"""
from __future__ import annotations

import asyncio
import csv
import io
import logging
from datetime import date, datetime, timedelta
from html import escape

from aiogram import Bot
from aiogram.types import BufferedInputFile, InlineKeyboardButton as IB, InlineKeyboardMarkup
from sqlalchemy import select, update

from . import catalog as cat
from . import keyboards as kb
from .config import settings
from .db import Booking, Departure, Session, job_done
from .screens import keep
from .services import STATUS_UA, active_bookings, departure_label, notify_admins, seats_text

log = logging.getLogger(__name__)


def at(d: date, hour: int, minute: int = 0) -> datetime:
    return datetime(d.year, d.month, d.day, hour, minute, tzinfo=cat.TZ)


async def run_once(bot: Bot, now: datetime | None = None) -> None:
    now = now or datetime.now(cat.TZ)
    today = now.date()
    async with Session() as s:
        deps = list(await s.scalars(select(Departure).where(
            Departure.status != "cancelled", Departure.date >= today - timedelta(days=8),
            Departure.date <= today + timedelta(days=4))))
    for dep in deps:
        try:
            await _departure_jobs(bot, dep, now)
        except Exception:  # noqa: BLE001
            log.exception("Планувальник: рейс %s", dep.id)
    try:
        await _weekly_backup(bot, now)
        await _retention(now)
    except Exception:  # noqa: BLE001
        log.exception("Планувальник: обслуговування")


async def _departure_jobs(bot: Bot, dep: Departure, now: datetime) -> None:
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    days = trip.get("days", 1)
    bookings = active_bookings(dep)
    pax = sum(b.pax for b in bookings)
    label = escape(departure_label(dep))

    # 1) Мінімум людей — за 3 дні о 10:00
    if at(dep.date - timedelta(days=3), 10) <= now < at(dep.date, 0) and pax < settings.MIN_PAX:
        async with Session() as s:
            if await job_done(s, f"minpax:{dep.id}"):
                await notify_admins(bot, (
                    f"⚠️ <b>Мало людей на рейсі</b>\n{label}\nЗаброньовано {pax} з мінімальних {settings.MIN_PAX}.\n\n"
                    "Можна скасувати рейс (пасажири отримають повідомлення) або все одно їхати."),
                    InlineKeyboardMarkup(inline_keyboard=[
                        [IB(text="🚐 Відкрити рейс", callback_data=kb.AdmCb(action="dep", id=dep.id).pack())],
                        [IB(text="🗑 Скасувати рейс", callback_data=kb.AdmCb(action="cancel_dep", id=dep.id).pack())]]))

    # 2) Підтвердження участі — напередодні о CONFIRM_HOUR
    eve = dep.date - timedelta(days=1)
    if at(eve, settings.CONFIRM_HOUR) <= now < at(dep.date, 6) and dep.status != "cancelled":
        from .handlers.extras import attend_kb
        if bookings and not all(b.pickup_time for b in bookings):
            async with Session() as s:
                if await job_done(s, f"needroute:{dep.id}"):
                    await notify_admins(bot, f"🗺 Завтра поїздка {label}, а час посадки ще не затверджено.\n"
                                             "Відкрийте рейс → «🗺 Маршрут і час збору».",
                                        InlineKeyboardMarkup(inline_keyboard=[[IB(
                                            text="🗺 Скласти маршрут", callback_data=f"o:route:{dep.id}")]]))
        for b in bookings:
            if not b.user_id or b.attend in ("yes", "no"):
                continue
            async with Session() as s:
                if not await job_done(s, f"confirm:{b.id}"):
                    continue
                await s.execute(update(Booking).where(Booking.id == b.id).values(attend="asked"))
                await s.commit()
            when = f"🕐 Заберемо вас о <b>{b.pickup_time}</b>\n" if b.pickup_time else "🕐 Точний час посадки надішлемо сьогодні ввечері\n"
            try:
                with keep():
                    await bot.send_message(
                        b.user_id,
                        f"🚐 <b>Завтра поїздка!</b>\n{trip.get('flag', '')} {escape(trip.get('short_title', ''))}, "
                        f"{cat.fmt_departure(dep.date, days)}\n\n{when}📍 {escape(b.address)}\n"
                        f"👥 {b.pax} ос. · 💶 {b.price_total} €\n\n<b>Підтвердіть, будь ласка, що ви їдете:</b>",
                        reply_markup=attend_kb(b.id))
            except Exception as e:  # noqa: BLE001
                log.warning("Підтвердження %s: %s", b.code, e)

    # 3) Хто не відповів — напередодні о 21:00
    if at(eve, 21) <= now < at(dep.date, 6):
        silent = [b for b in bookings if b.attend == "asked" or (not b.user_id and b.attend != "yes")]
        if silent:
            async with Session() as s:
                if await job_done(s, f"silent:{dep.id}"):
                    lines = [f"❔ <b>Не підтвердили участь</b> ({label}) — варто зателефонувати:"]
                    lines += [f"• {escape(b.name)} — <code>{escape(b.phone)}</code>" for b in silent]
                    await notify_admins(bot, "\n".join(lines))

    # 4) Відгук — наступного дня після завершення поїздки о 11:00
    end = dep.date + timedelta(days=days - 1)
    if at(end + timedelta(days=1), 11) <= now < at(end + timedelta(days=8), 0):
        from .handlers.extras import rate_kb
        for b in bookings:
            if not b.user_id or b.attend == "no":
                continue
            async with Session() as s:
                if not await job_done(s, f"review:{b.id}"):
                    continue
            try:
                with keep():
                    await bot.send_message(
                        b.user_id,
                        f"Дякуємо, що поїхали з нами в {trip.get('flag', '')} <b>{escape(trip.get('short_title', ''))}</b>! 🙏\n\n"
                        "Як вам поїздка? Оцініть, будь ласка, від 1 до 5 ⭐", reply_markup=rate_kb(b.id))
            except Exception as e:  # noqa: BLE001
                log.warning("Відгук %s: %s", b.code, e)


async def _weekly_backup(bot: Bot, now: datetime) -> None:
    if now.weekday() != 6 or now.hour < 20:
        return
    week = now.strftime("%G-%V")
    async with Session() as s:
        if not await job_done(s, f"backup:{week}"):
            return
        rows = list(await s.scalars(select(Booking).join(Departure)
                                    .where(Departure.date >= now.date() - timedelta(days=60))
                                    .order_by(Departure.date, Booking.id)))
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Дата", "Поїздка", "Бронь", "Статус", "Ім'я", "Телефон", "Місто", "Адреса", "Пасажирів", "Місця",
                "Сума €", "Оплачено", "Час посадки"])
    for b in rows:
        t = cat.TRIPS_BY_ID.get(b.departure.trip_id, {})
        w.writerow([b.departure.date.isoformat(), t.get("short_title", b.departure.trip_id), b.code,
                    STATUS_UA.get(b.status, b.status), b.name, b.phone, b.city, b.address, b.pax, seats_text(b),
                    b.price_total, "так" if b.paid else "ні", b.pickup_time or ""])
    data = ("﻿" + buf.getvalue()).encode("utf-8")
    for admin_id in settings.admin_ids:
        try:
            await bot.send_document(admin_id, BufferedInputFile(data, filename=f"svoi_backup_{week}.csv"),
                                    caption=f"💾 Щотижнева резервна копія: {len(rows)} бронювань (останні 60 днів і майбутні)")
        except Exception as e:  # noqa: BLE001
            log.warning("Бекап: %s", e)


async def _retention(now: datetime) -> None:
    """Політика конфіденційності: телефон і адреса — лише 6 місяців після поїздки."""
    if now.hour != 3:
        return
    async with Session() as s:
        if not await job_done(s, f"retention:{now.date().isoformat()}"):
            return
        old_ids = select(Departure.id).where(Departure.date < now.date() - timedelta(days=183))
        await s.execute(update(Booking).where(Booking.departure_id.in_(old_ids), Booking.address != "видалено")
                        .values(phone="", address="видалено", comment=None))
        await s.commit()


async def scheduler(bot: Bot) -> None:
    await asyncio.sleep(20)  # даємо боту запуститись
    while True:
        try:
            await run_once(bot)
        except Exception:  # noqa: BLE001
            log.exception("Планувальник")
        await asyncio.sleep(60)
