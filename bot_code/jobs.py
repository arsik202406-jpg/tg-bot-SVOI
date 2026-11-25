"""Планувальник: автоматичні дії за розкладом (перевірка щохвилини).

• За 3 дні до поїздки: якщо людей менше мінімуму — попередження адміну.
• Напередодні о CONFIRM_HOUR (14:00, ~15 год до виїзду): кожному пасажиру «Підтвердіть участь» + час посадки.
  Якщо маршрут ще не затверджено — нагадування адміну.
• Напередодні о 21:00: адміну список тих, хто не відповів.
• Наступного дня після поїздки о 11:00: прохання оцінити поїздку.
• Напередодні о 18:00: група поїздки (програма, локації, погода) і посилання пасажирам.
• У день поїздки за годину до посадки: пам'ятка з погодою й нагадуванням про паспорт/ID.
• За 30 хв до першої посадки: адміну кнопка «Режим водія».
• Наступного дня після поїздки о 21:00: група поїздки очищується й звільняється.
• Щонеділі о 20:00: резервна копія всіх бронювань (таблиця) адміну.
• Щоночі: телефон і адреса у бронюваннях старших за 6 місяців видаляються.
Кожна дія записується в job_log, тож після перезапуску бот нічого не надішле двічі.
"""
from __future__ import annotations

import asyncio
import csv
import io
import logging
from collections.abc import Awaitable, Callable
from datetime import date, datetime, timedelta
from functools import partial
from html import escape

from aiogram import Bot
from aiogram.types import BufferedInputFile, InlineKeyboardButton as IB, InlineKeyboardMarkup
from sqlalchemy import select, update

from . import catalog as cat
from . import keyboards as kb
from .config import settings
from .db import Booking, Departure, Session, job_done
from .screens import keep
from .services import STATUS_UA, active_bookings, departure_label, full_address, notify_admins, seats_text

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
        await _release_groups(bot, now)
    except Exception:  # noqa: BLE001
        log.exception("Планувальник: групи поїздок")
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
                        f"{cat.fmt_departure(dep.date, days)}\n\n{when}📍 {escape(full_address(b))}\n"
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

    # 5) Група поїздки — напередодні о 18:00
    active = [b for b in bookings if b.attend != "no"]
    if active and at(eve, 18) <= now < at(dep.date, 12) and dep.status != "cancelled":
        from .handlers.tripday import HOW_TO, open_trip_group
        link = await open_trip_group(bot, dep.id)
        if not link:
            async with Session() as s:
                if await job_done(s, f"nogroup:{dep.id}"):
                    await notify_admins(bot, f"👥 Завтра поїздка {label}, але немає вільної групи поїздки.\n\n{HOW_TO}")

    # 6) День поїздки: пам'ятка пасажирам і «Режим водія» адміну — точно за часом посадки
    plan_day(bot, dep, now)

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


# ---------- Точні за часом дії (пам'ятка, режим водія) ----------
# Ключ → (коли, що зробити). Живе в пам'яті: після перезапуску відновлюється першою ж перевіркою.
_timed: dict[str, tuple[datetime, Callable[[], Awaitable]]] = {}


def plan_at(key: str, when: datetime, action: Callable[[], Awaitable]) -> None:
    _timed[key] = (when, action)


async def run_due(now: datetime) -> None:
    for key, (when, action) in list(_timed.items()):
        if when <= now:
            _timed.pop(key, None)
            try:
                await action()
            except Exception:  # noqa: BLE001
                log.exception("Завдання %s", key)


def _hhmm(d: date, value: str | None) -> datetime | None:
    try:
        h, m = map(int, (value or "").split(":"))
        return at(d, h, m)
    except ValueError:
        return None


def plan_day(bot: Bot, dep: Departure, now: datetime) -> None:
    """Запланувати пам'ятки (за годину до посадки) і кнопку «Режим водія» (за 30 хв до першої посадки)."""
    if dep.status == "cancelled" or not (now.date() <= dep.date <= now.date() + timedelta(days=1)):
        return
    from .handlers.tripday import morning_driver, send_memo
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    default = _hhmm(dep.date, trip.get("pickup_time")) or at(dep.date, 6)
    starts = []
    for b in active_bookings(dep):
        if b.attend == "no":
            continue
        pick = _hhmm(dep.date, b.pickup_time) or default
        starts.append(pick)
        if b.user_id and now < pick:
            plan_at(f"memo:{b.id}", pick - timedelta(minutes=60), partial(send_memo, bot, b.id))
    if dep.start_time:
        starts.append(_hhmm(dep.date, dep.start_time) or default)
    if starts and now < min(starts) + timedelta(hours=2):
        plan_at(f"driver:{dep.id}", min(starts) - timedelta(minutes=30), partial(morning_driver, bot, dep.id))


async def replan(bot: Bot, dep_id: int) -> None:
    """Після затвердження маршруту — перепланувати пам'ятки під новий час посадки."""
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if dep:
            await s.refresh(dep, ["bookings"])
    if dep:
        plan_day(bot, dep, datetime.now(cat.TZ))


async def _release_groups(bot: Bot, now: datetime) -> None:
    """Наступного дня після поїздки о 21:00 — очистити групу поїздки."""
    from .db import TripGroup
    from .handlers.tripday import close_trip_group, trip_end
    async with Session() as s:
        groups = list(await s.scalars(select(TripGroup).where(TripGroup.departure_id.is_not(None))))
        deps = {g.chat_id: await s.get(Departure, g.departure_id) for g in groups}
    for g in groups:
        dep = deps[g.chat_id]
        if dep is None or dep.status == "cancelled" or now >= at(trip_end(dep) + timedelta(days=1), 21):
            await close_trip_group(bot, g.chat_id)


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
    w.writerow(["Дата", "Поїздка", "Бронь", "Статус", "Ім'я", "Телефон", "Місто", "Адреса", "Індекс", "Пасажирів", "Місця",
                "Сума €", "Оплачено", "Час посадки"])
    for b in rows:
        t = cat.TRIPS_BY_ID.get(b.departure.trip_id, {})
        w.writerow([b.departure.date.isoformat(), t.get("short_title", b.departure.trip_id), b.code,
                    STATUS_UA.get(b.status, b.status), b.name, b.phone, b.city, b.address, b.postcode or "", b.pax, seats_text(b),
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


# Години, о котрих планувальник заглядає в базу (о HH:05). Рідкі перевірки дають базі Neon «заснути»
# між ними й не витрачати безкоштовні години роботи. Усі вікна завдань («о 14:00 і пізніше») це враховують.
CHECK_HOURS = {3, *range(7, 23)}


def should_check(now: datetime, last: datetime | None) -> bool:
    if now.hour not in CHECK_HOURS or now.minute < 5:
        return False
    return last is None or (now.date(), now.hour) != (last.date(), last.hour)


async def scheduler(bot: Bot) -> None:
    await asyncio.sleep(20)  # даємо боту запуститись
    last: datetime | None = None
    first = True  # одразу після запуску — одна перевірка, щоб відновити заплановані пам'ятки
    while True:
        now = datetime.now(cat.TZ)
        if first or should_check(now, last):
            first = False
            last = now
            try:
                await run_once(bot, now)
            except Exception:  # noqa: BLE001
                log.exception("Планувальник")
        await run_due(now)  # пам'ятки за часом — без звернень до бази, доки не настане час
        await asyncio.sleep(60)
