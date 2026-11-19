"""Спільна логіка бронювання для бота та Mini App: створення, скасування, списки пасажирів."""
from __future__ import annotations

import csv
import io
import logging
from datetime import date
from html import escape

from aiogram import Bot
from aiogram.types import InlineKeyboardMarkup
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from . import catalog as cat
from .config import settings
from .db import Booking, Customer, Departure, SeatHold, taken_seats

log = logging.getLogger(__name__)


class BookingError(Exception):
    """Помилка, текст якої можна показати клієнту."""


# ---------- Рейси ----------

async def upcoming_departures(session: AsyncSession, trip_id: str | None = None,
                              include_closed: bool = False) -> list[Departure]:
    q = select(Departure).where(Departure.date >= cat.today()).order_by(Departure.date)
    if trip_id:
        q = q.where(Departure.trip_id == trip_id)
    if not include_closed:
        q = q.where(Departure.status == "open")
    else:
        q = q.where(Departure.status != "cancelled")
    return list(await session.scalars(q))


def active_bookings(dep: Departure) -> list[Booking]:
    return sorted([b for b in dep.bookings if b.status != "cancelled"], key=lambda b: b.id)


def free_count(dep: Departure) -> int:
    return cat.CAPACITY - sum(b.pax for b in active_bookings(dep))


def taken_from_bookings(dep: Departure) -> list[int]:
    return sorted(s for b in active_bookings(dep) for s in b.seat_list)


def departure_label(dep: Departure) -> str:
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    return f"{trip.get('flag', '')} {trip.get('short_title', dep.trip_id)} — {cat.fmt_departure(dep.date, trip.get('days', 1))}"


def departure_public(dep: Departure) -> dict:
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    return {
        "id": dep.id,
        "trip_id": dep.trip_id,
        "date": dep.date.isoformat(),
        "label": cat.fmt_departure(dep.date, trip.get("days", 1)),
        "free": free_count(dep),
        "taken": taken_from_bookings(dep),
        "status": dep.status,
    }


async def add_departures(session: AsyncSession, trip_id: str, dates: list[date]) -> tuple[list[date], list[date]]:
    """Додає дати. Повертає (додані, вже існували)."""
    added, existed = [], []
    for d in dates:
        dep = await session.scalar(select(Departure).where(Departure.trip_id == trip_id, Departure.date == d))
        if dep:
            if dep.status == "cancelled":
                dep.status = "open"
                added.append(d)
            else:
                existed.append(d)
            continue
        session.add(Departure(trip_id=trip_id, date=d))
        added.append(d)
    await session.commit()
    return added, existed


# ---------- Бронювання ----------

async def load_booking(session: AsyncSession, booking_id: int) -> Booking | None:
    """Бронь разом із рейсом і всіма бронями рейсу (для підрахунку місць)."""
    return await session.scalar(
        select(Booking).where(Booking.id == booking_id)
        .options(selectinload(Booking.departure).selectinload(Departure.bookings))
        .execution_options(populate_existing=True))


def price_for(trip: dict, pax: int, seats: list[int], auto: bool) -> int:
    return trip["price"] * pax + cat.seat_fee(seats, auto)


async def create_booking(
    session: AsyncSession, *, departure_id: int, pax: int, seats: list[int] | None,
    name: str, phone: str, city: str, address: str, user_id: int | None = None,
    username: str | None = None, comment: str | None = None, source: str = "bot",
) -> Booking:
    dep = await session.get(Departure, departure_id)
    if not dep or dep.status != "open" or dep.date < cat.today():
        raise BookingError("На жаль, набір на цей рейс уже закрито. Оберіть, будь ласка, іншу дату.")
    trip = cat.TRIPS_BY_ID.get(dep.trip_id)
    if not trip:
        raise BookingError("Тур не знайдено.")
    if not 1 <= pax <= cat.CAPACITY:
        raise BookingError("Невірна кількість пасажирів.")
    name, phone, address = name.strip()[:128], phone.strip()[:32], address.strip()[:500]
    if not name or not phone or not address:
        raise BookingError("Заповніть, будь ласка, ім'я, телефон і адресу.")

    taken = await taken_seats(session, dep.id)
    auto = not seats
    if auto:
        free = [s for s in cat.AUTO_SEAT_ORDER if s not in taken]
        if len(free) < pax:
            raise BookingError(f"Залишилось лише {len(free)} вільних місць.")
        seats = sorted(free[:pax])
    else:
        seats = sorted(set(seats))
        if len(seats) != pax or any(s not in cat.SEATS_BY_NO for s in seats):
            raise BookingError("Оберіть стільки місць, скільки пасажирів.")
        busy = [s for s in seats if s in taken]
        if busy:
            raise BookingError(f"Місце {', '.join(map(str, busy))} щойно зайняли. Оберіть, будь ласка, інше.")

    booking = Booking(
        departure_id=dep.id, user_id=user_id, name=name, username=username, phone=phone,
        city=city, address=address, pax=pax, seats=",".join(map(str, seats)), auto_seats=int(auto),
        price_total=price_for(trip, pax, seats, auto), comment=(comment or "").strip()[:500] or None,
        source=source,
    )
    session.add(booking)
    try:
        await session.flush()
        booking.code = f"SVOI-{booking.id:04d}"
        for s in seats:
            session.add(SeatHold(departure_id=dep.id, seat_no=s, booking_id=booking.id))
        await session.flush()
    except IntegrityError:
        await session.rollback()
        raise BookingError("Хтось щойно забронював ці місця. Оберіть, будь ласка, інші.")

    if user_id:
        cust = await session.get(Customer, user_id)
        if not cust:
            cust = Customer(user_id=user_id)
            session.add(cust)
        cust.name, cust.username, cust.phone, cust.city, cust.address = name, username, phone, city, address

    await session.commit()
    await session.refresh(booking, ["departure"])
    await session.refresh(booking.departure, ["bookings"])
    return booking


async def cancel_booking(session: AsyncSession, booking: Booking) -> None:
    booking.status = "cancelled"
    holds = await session.scalars(select(SeatHold).where(SeatHold.booking_id == booking.id))
    for h in holds:
        await session.delete(h)
    await session.commit()


async def user_bookings(session: AsyncSession, user_id: int) -> list[Booking]:
    q = (select(Booking).join(Departure)
         .where(Booking.user_id == user_id, Booking.status != "cancelled", Departure.date >= cat.today())
         .order_by(Departure.date))
    return list(await session.scalars(q))


# ---------- Тексти ----------

STATUS_UA = {"new": "🟡 нова", "confirmed": "🟢 підтверджена", "cancelled": "⚪️ скасована"}


def seats_text(b: Booking) -> str:
    seats = ", ".join(map(str, b.seat_list))
    return f"{seats} (будь-які вільні)" if b.auto_seats else seats


def booking_client_text(b: Booking) -> str:
    trip = cat.TRIPS_BY_ID.get(b.departure.trip_id, {})
    return (
        f"<b>{trip.get('flag', '')} {escape(trip.get('short_title', ''))}</b>\n"
        f"📅 {cat.fmt_departure(b.departure.date, trip.get('days', 1))}\n"
        f"👥 Пасажирів: {b.pax} · місця: {seats_text(b)}\n"
        f"📍 Звідки забрати: {escape(b.city)}, {escape(b.address)}\n"
        f"📞 {escape(b.phone)}\n"
        f"💶 До сплати: <b>{b.price_total} €</b>\n"
        f"Номер броні: <code>{b.code}</code>"
    )


def booking_admin_text(b: Booking, title: str = "🆕 Нова заявка") -> str:
    who = escape(b.name)
    if b.username:
        who += f" (@{escape(b.username)})"
    elif b.user_id:
        who = f'<a href="tg://user?id={b.user_id}">{who}</a>'
    src = {"miniapp": "Mini App", "bot": "бот", "admin": "додано вручну"}.get(b.source, b.source)
    text = (
        f"<b>{title} {b.code}</b> · {src}\n\n"
        f"{escape(departure_label(b.departure))}\n"
        f"👤 {who}\n"
        f"📞 <code>{escape(b.phone)}</code>\n"
        f"📍 {escape(b.city)}: {escape(b.address)}\n"
        f"👥 {b.pax} · місця {seats_text(b)}\n"
        f"💶 {b.price_total} €\n"
        f"Статус: {STATUS_UA.get(b.status, b.status)}"
    )
    if b.comment:
        text += f"\n💬 {escape(b.comment)}"
    dep = b.departure
    text += f"\n\nНа рейсі зайнято {cat.CAPACITY - free_count(dep)}/{cat.CAPACITY}"
    return text


def manifest_text(dep: Departure) -> str:
    """Повна інформація про рейс: хто, куди, які місця, скільки грошей."""
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    bookings = active_bookings(dep)
    pax = sum(b.pax for b in bookings)
    money = sum(b.price_total for b in bookings)
    status = {"open": "набір відкрито", "closed": "набір закрито", "cancelled": "скасовано"}[dep.status]
    lines = [
        f"<b>🚐 {escape(departure_label(dep))}</b>",
        f"Статус: {status} · пасажирів {pax}/{cat.CAPACITY} · до збору {money} €",
    ]
    if trip.get("pickup_time"):
        lines.append(f"Орієнтовний виїзд із Саарбрюккена: {trip['pickup_time']}")
    if dep.note:
        lines.append(f"📝 {escape(dep.note)}")
    if not bookings:
        lines.append("\nПоки що бронювань немає.")
        return "\n".join(lines)

    # групуємо за містом, щоб зручно будувати маршрут збору
    by_city: dict[str, list[Booking]] = {}
    for b in bookings:
        by_city.setdefault(b.city, []).append(b)
    for city, items in by_city.items():
        lines.append(f"\n<b>📍 {escape(city)}</b>")
        for b in items:
            mark = "" if b.status == "confirmed" else " 🟡"
            uname = f" @{escape(b.username)}" if b.username else ""
            lines.append(
                f"• <b>{escape(b.name)}</b>{uname}{mark} — {b.pax} ос., місця {seats_text(b)}, {b.price_total} €\n"
                f"   📞 <code>{escape(b.phone)}</code>\n"
                f"   🏠 {escape(b.address)}"
                + (f"\n   💬 {escape(b.comment)}" if b.comment else "")
            )
    seat_map = {s: b for b in bookings for s in b.seat_list}
    lines.append("\n<b>Посадка:</b>")
    for row in (1, 2, 3):
        cells = []
        for s in [x for x in cat.SEATS if x["row"] == row]:
            b = seat_map.get(s["no"])
            cells.append(f"{s['no']}: {escape(b.name.split()[0]) if b else '—'}")
        lines.append("   " + " | ".join(cells))
    lines.append("\n🟡 — заявка ще не підтверджена")
    return "\n".join(lines)


def manifest_csv(dep: Departure) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Бронь", "Статус", "Ім'я", "Telegram", "Телефон", "Місто", "Адреса", "Пасажирів", "Місця", "Сума €", "Коментар", "Джерело"])
    for b in active_bookings(dep):
        w.writerow([b.code, STATUS_UA.get(b.status, b.status), b.name, f"@{b.username}" if b.username else "",
                    b.phone, b.city, b.address, b.pax, seats_text(b), b.price_total, b.comment or "", b.source])
    return ("﻿" + buf.getvalue()).encode("utf-8")  # BOM, щоб Excel правильно показав кирилицю


def payment_note(trip_id: str) -> str:
    if cat.TRIPS_BY_ID.get(trip_id, {}).get("days", 1) > 1:
        return "Менеджер зв'яжеться з вами щодо передоплати за готель, решта — при посадці."
    return "Передоплата не потрібна — оплата водію при посадці."


# ---------- Сповіщення ----------

async def notify_admins(bot: Bot, text: str, markup: InlineKeyboardMarkup | None = None) -> None:
    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, text, reply_markup=markup, disable_web_page_preview=True)
        except Exception as e:  # noqa: BLE001
            log.error("Не вдалося надіслати адміну %s: %s", admin_id, e)


async def notify_new_booking(bot: Bot, booking: Booking) -> None:
    from .keyboards import admin_booking_kb, client_after_booking_kb
    await notify_admins(bot, booking_admin_text(booking), admin_booking_kb(booking))
    if booking.user_id and booking.source != "admin":
        try:
            await bot.send_message(
                booking.user_id,
                "✅ <b>Заявку прийнято!</b>\n\n" + booking_client_text(booking) +
                "\n\n" + payment_note(booking.departure.trip_id) +
                "\nМи напишемо вам напередодні ввечері з точним часом, коли під'їдемо.",
                reply_markup=client_after_booking_kb(),
            )
        except Exception as e:  # noqa: BLE001
            log.warning("Не вдалося надіслати підтвердження клієнту %s: %s", booking.user_id, e)
