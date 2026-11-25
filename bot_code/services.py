"""Спільна логіка бронювання для бота та Mini App: створення, скасування, списки пасажирів."""
from __future__ import annotations

import csv
import io
import logging
from datetime import date
from html import escape
from urllib.parse import quote

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


POSTCODE_RE = __import__("re").compile(r"^(?:[A-Za-z]{1,2}-?)?\d{4,5}$")


def clean_postcode(value: str | None) -> str:
    """«66 111», «L-1234», «l1234» → «66111», «L-1234». Порожній рядок — якщо формат невірний."""
    v = (value or "").strip().replace(" ", "").upper()
    if not POSTCODE_RE.match(v):
        return ""
    if v[0].isalpha() and "-" not in v:
        letters = "".join(ch for ch in v if ch.isalpha())
        v = f"{letters}-{v[len(letters):]}"
    return v


def full_address(b) -> str:
    """Адреса для показу: «вулиця, будинок, місто · 66111 · район Х»."""
    parts = [b.address]
    if getattr(b, "postcode", None):
        parts.append(b.postcode)
    if getattr(b, "district", None):
        parts.append(f"район {b.district}")
    return " · ".join(parts)


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
        "booked": cat.CAPACITY - free_count(dep),
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


def price_for(trip: dict, pax: int, seats: list[int], auto: bool, children: int = 0) -> int:
    return trip["price"] * pax - cat.child_discount(trip) * children + cat.seat_fee(seats, auto)


def parse_ages(text: str | list | None) -> list[int]:
    """«4, 9» або [4, 9] → [4, 9]. Некоректне ігноруємо."""
    if text is None:
        return []
    items = text if isinstance(text, list) else __import__("re").findall(r"\d+", str(text))
    out = []
    for x in items:
        try:
            a = int(x)
        except (TypeError, ValueError):
            continue
        if 0 <= a <= 17:
            out.append(a)
    return out


def children_text(b) -> str:
    """«👶 2 дітей (4, 9 р.) — потрібно: автокрісло, бустер» або ''."""
    n = getattr(b, "children", 0) or 0
    if not n:
        return ""
    ages = parse_ages(getattr(b, "child_ages", None))
    line = f"👶 Дітей до 12 років: {n}"
    if ages:
        line += f" (вік: {', '.join(map(str, ages))})"
        line += " — потрібно: " + ", ".join(cat.seat_word(a) for a in ages)
    return line


async def create_booking(
    session: AsyncSession, *, departure_id: int, pax: int, seats: list[int] | None,
    name: str, phone: str, city: str, address: str, user_id: int | None = None,
    username: str | None = None, comment: str | None = None, source: str = "bot",
    postcode: str | None = None, district: str | None = None,
    children: int = 0, child_ages: list[int] | str | None = None,
) -> Booking:
    dep = await session.get(Departure, departure_id)
    if not dep or dep.status != "open" or dep.date < cat.today():
        raise BookingError("На жаль, набір на цей рейс уже закрито. Оберіть, будь ласка, іншу дату.")
    trip = cat.TRIPS_BY_ID.get(dep.trip_id)
    if not trip:
        raise BookingError("Тур не знайдено.")
    if not 1 <= pax <= cat.CAPACITY:
        raise BookingError("Невірна кількість пасажирів.")
    children = int(children or 0)
    if children < 0 or children > pax - 1:
        raise BookingError("Дитина може їхати лише разом із дорослим.")
    ages = parse_ages(child_ages)[:children]
    if any(a > cat.CHILD_MAX_AGE for a in ages):
        raise BookingError(f"Дитячий тариф діє до {cat.CHILD_MAX_AGE + 1} років.")
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
        city=city, address=address, postcode=clean_postcode(postcode) or None,
        district=(district or "").strip()[:80] or None,
        pax=pax, seats=",".join(map(str, seats)), auto_seats=int(auto),
        price_total=price_for(trip, pax, seats, auto, children), comment=(comment or "").strip()[:500] or None,
        source=source, children=children, child_ages=",".join(map(str, ages)) or None,
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
        cust.postcode, cust.district = booking.postcode, booking.district

    await session.commit()
    await session.refresh(booking, ["departure"])
    await session.refresh(booking.departure, ["bookings"])
    return booking


async def update_address(session: AsyncSession, booking: Booking, address: str, postcode: str,
                         district: str | None) -> bool:
    """Змінити адресу броні. Повертає True, якщо маршрут уже був затверджений (його треба перерахувати)."""
    address = address.strip()[:500]
    if len(address) < 5:
        raise BookingError("Напишіть повну адресу: вулицю, номер будинку і місто.")
    pc = clean_postcode(postcode)
    if not pc:
        raise BookingError("Невірний поштовий індекс. Наприклад: 66111 або L-1234.")
    had_route = bool(booking.pickup_time)
    booking.address, booking.postcode = address, pc
    booking.district = (district or "").strip()[:80] or None
    booking.pickup_time, booking.pickup_order = None, None
    if booking.user_id:
        cust = await session.get(Customer, booking.user_id)
        if cust:
            cust.address, cust.postcode, cust.district = booking.address, booking.postcode, booking.district
    await session.commit()
    return had_route


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
        + (f"{children_text(b)}\n" if b.children else "") +
        f"📍 Звідки забрати: {escape(b.city)}, {escape(full_address(b))}\n"
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
    src = {"miniapp": "Mini App", "bot": "бот", "admin": "додано вручну", "ai": "ШІ-помічник"}.get(b.source, b.source)
    text = (
        f"<b>{title} {b.code}</b> · {src}\n\n"
        f"{escape(departure_label(b.departure))}\n"
        f"👤 {who}\n"
        f"📞 <code>{escape(b.phone)}</code>\n"
        f"📍 {escape(b.city)}: {escape(full_address(b))}\n"
        f"👥 {b.pax} · місця {seats_text(b)}\n"
        + (f"{children_text(b)}\n" if b.children else "") +
        f"💶 {b.price_total} €\n"
        f"Статус: {STATUS_UA.get(b.status, b.status)}"
    )
    if b.comment:
        text += f"\n💬 {escape(b.comment)}"
    dep = b.departure
    if b.pickup_time:
        text += f"\n🕐 Посадка о {b.pickup_time}"
    text += "\n💶 Оплачено ✅" if b.paid else "\n💶 Ще не оплачено"
    if b.attend in ("yes", "no", "asked"):
        text += {"yes": "\n✅ Підтвердив участь", "no": "\n❌ Відмовився", "asked": "\n❔ Ще не відповів на підтвердження"}[b.attend]
    text += f"\n\nНа рейсі зайнято {cat.CAPACITY - free_count(dep)}/{cat.CAPACITY}"
    return text


def map_query(b) -> str:
    """Рядок для пошуку на карті: адреса + індекс (індекс розрізняє однакові вулиці в сусідніх містах)."""
    q = b.address
    if getattr(b, "postcode", None) and b.postcode not in q:
        q = f"{q}, {b.postcode}"
    return q


def maps_link(address: str) -> str:
    return "https://www.google.com/maps/search/?api=1&query=" + quote(address)


ATTEND_ICON = {"yes": "✅", "no": "❌", "asked": "❔"}


def manifest_text(dep: Departure, compact: bool = False) -> str:
    """Повна інформація про рейс: хто, звідки, о котрій, які місця, хто оплатив."""
    from .config import settings
    trip = cat.TRIPS_BY_ID.get(dep.trip_id, {})
    bookings = active_bookings(dep)
    pax = sum(b.pax for b in bookings)
    money = sum(b.price_total for b in bookings)
    paid = sum(b.price_total for b in bookings if b.paid)
    status = {"open": "набір відкрито", "closed": "набір закрито", "cancelled": "скасовано"}[dep.status]
    lines = [
        f"<b>🚐 {escape(departure_label(dep))}</b>",
        f"Статус: {status} · пасажирів <b>{pax}/{cat.CAPACITY}</b>",
        f"💶 До збору {money} € · оплачено {paid} € · залишилось {money - paid} €",
    ]
    if pax < settings.MIN_PAX:
        lines.append(f"⚠️ До мінімуму ({settings.MIN_PAX} ос.) не вистачає {settings.MIN_PAX - pax}")
    if dep.start_time:
        lines.append(f"🏠 Виїзд із дому о <b>{dep.start_time}</b> · прибуття {dep.arrive_time or settings.ARRIVE_TIME}")
    if dep.note:
        lines.append(f"📝 {escape(dep.note)}")
    if not bookings:
        lines.append("\nПоки що бронювань немає.")
        return "\n".join(lines)

    if any(b.pickup_order for b in bookings):  # маршрут затверджено — показуємо в порядку збору
        ordered = sorted(bookings, key=lambda b: (b.pickup_order or 99, b.id))
        lines.append("\n<b>Порядок збору:</b>")
        groups = [("", ordered)]
    else:
        by_city: dict[str, list[Booking]] = {}
        for b in bookings:
            by_city.setdefault(b.city, []).append(b)
        groups = list(by_city.items())
    for city, items in groups:
        if city:
            lines.append(f"\n<b>📍 {escape(city)}</b>")
        for b in items:
            mark = "" if b.status == "confirmed" else " 🟡"
            uname = f" @{escape(b.username)}" if b.username else ""
            time = f"<b>{b.pickup_time}</b> " if b.pickup_time else ""
            money_icon = "💶✅" if b.paid else "💶"
            att = f" {ATTEND_ICON[b.attend]}" if b.attend in ATTEND_ICON else ""
            lines.append(
                f"• {time}<b>{escape(b.name)}</b>{uname}{mark}{att} — {b.pax} ос., місця {seats_text(b)}, {money_icon} {b.price_total} €\n"
                f"   📞 <code>{escape(b.phone)}</code>\n"
                + (f"   🏠 {escape(full_address(b))}" if compact else
                   f'   🏠 <a href="{maps_link(map_query(b))}">{escape(full_address(b))}</a>')
                + (f"\n   {children_text(b)}" if b.children else "")
                + (f"\n   💬 {escape(b.comment)}" if b.comment and not compact else "")
            )
    kids = [a for b in bookings for a in parse_ages(b.child_ages)]
    if any(b.children for b in bookings):
        need: dict[str, int] = {}
        for a in kids:
            need[cat.seat_word(a)] = need.get(cat.seat_word(a), 0) + 1
        total_kids = sum(b.children or 0 for b in bookings)
        lines.append(f"\n👶 <b>Дітей: {total_kids}</b>" + (" · взяти: " + ", ".join(f"{k} ×{v}" for k, v in need.items()) if need else ""))
    seat_map = {s: b for b in bookings for s in b.seat_list}
    lines.append("\n<b>Посадка:</b>")
    for row in (1, 2, 3):
        cells = []
        for s in [x for x in cat.SEATS if x["row"] == row]:
            b = seat_map.get(s["no"])
            cells.append(f"{s['no']}: {escape(b.name.split()[0]) if b else '—'}")
        lines.append("   " + " | ".join(cells))
    lines.append("\n🟡 — заявка не підтверджена · ✅/❌/❔ — відповідь на «Підтвердіть участь»")
    return "\n".join(lines)


def manifest_csv(dep: Departure) -> bytes:
    buf = io.StringIO()
    w = csv.writer(buf, delimiter=";")
    w.writerow(["Порядок", "Час посадки", "Бронь", "Статус", "Ім'я", "Telegram", "Телефон", "Місто", "Адреса", "Індекс", "Район",
                "Пасажирів", "Дітей", "Вік дітей", "Місця", "Сума €", "Оплачено", "Участь", "Коментар", "Джерело"])
    for b in sorted(active_bookings(dep), key=lambda b: (b.pickup_order or 99, b.id)):
        w.writerow([b.pickup_order or "", b.pickup_time or "", b.code, STATUS_UA.get(b.status, b.status), b.name,
                    f"@{b.username}" if b.username else "", b.phone, b.city, b.address, b.postcode or "", b.district or "",
                    b.pax, b.children or 0, b.child_ages or "", seats_text(b),
                    b.price_total, "так" if b.paid else "ні", {"yes": "їде", "no": "не їде", "asked": "не відповів"}.get(b.attend or "", ""),
                    b.comment or "", b.source])
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
    from .screens import keep
    text = booking_admin_text(booking)
    if booking.user_id:
        from .db import BotUser, Session as _S
        async with _S() as s:
            u = await s.get(BotUser, booking.user_id)
            first = await s.scalar(select(Booking.id).where(Booking.user_id == booking.user_id, Booking.id != booking.id).limit(1))
            inviter = await s.get(BotUser, u.referred_by) if u and u.referred_by else None
        if inviter and not first:
            who = escape(inviter.name) + (f" @{escape(inviter.username)}" if inviter.username else "")
            text += f"\n\n🎁 Перша поїздка за запрошенням від {who} — бонус обом: безкоштовний вибір місця"
    await notify_admins(bot, text, admin_booking_kb(booking))
    if not booking.user_id or booking.source == "admin":
        return
    text = ("✅ <b>Заявку прийнято!</b>\n\n" + booking_client_text(booking) +
            "\n\n" + payment_note(booking.departure.trip_id) +
            "\nМенеджер підтвердить бронь, а напередодні ввечері напишемо точний час, коли під'їдемо.")
    try:
        with keep():  # підтвердження броні ніколи не видаляється з чату
            await bot.send_message(booking.user_id, text, reply_markup=client_after_booking_kb())
    except Exception as e:  # noqa: BLE001
        log.warning("Не вдалося надіслати підтвердження клієнту %s: %s", booking.user_id, e)
