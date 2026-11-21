"""Адмін-панель: рейси, списки пасажирів, дати, ручне додавання, розсилка, анонс у канал."""
from __future__ import annotations

import asyncio
import logging
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import BufferedInputFile, CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message
from sqlalchemy import select

from .. import catalog as cat
from .. import keyboards as kb
from ..config import settings
from ..db import Booking, Departure, Session, TripPhoto, WaitlistEntry, trip_photo
from ..services import (load_booking, BookingError, active_bookings, add_departures, booking_admin_text, booking_client_text,
                        cancel_booking, create_booking, departure_label, free_count, manifest_csv, manifest_text,
                        notify_new_booking, upcoming_departures)
from .. import ai
from .support import IsAdmin

log = logging.getLogger(__name__)
router = Router(name="admin")
router.message.filter(IsAdmin())


class Adm(StatesGroup):
    dates = State()
    broadcast = State()
    note = State()
    m_name = State()
    m_phone = State()
    m_city = State()
    m_address = State()
    m_pax = State()
    photo = State()


ADMIN_HELP = (
    "<b>👑 Адмін-панель SVOI</b>\n\n"
    "• Нові заявки й питання клієнтів приходять сюди автоматично.\n"
    "• Щоб відповісти клієнту — натисніть «Відповісти» на його питання.\n"
    "• Команда /admin — відкрити це меню."
)


async def menu_kb() -> InlineKeyboardMarkup:
    if not settings.ANTHROPIC_API_KEY:
        label = "🤖 ШІ-помічник: не підключено"
    elif await ai.is_enabled():
        label = "🤖 ШІ-помічник: УВІМКНЕНО (вимкнути)"
    else:
        label = "🤖 ШІ-помічник: вимкнено (увімкнути)"
    return kb.admin_menu_kb(label)


def is_admin_cb(callback: CallbackQuery) -> bool:
    return callback.from_user.id in settings.admin_ids


@router.message(Command("admin"))
async def cmd_admin(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(ADMIN_HELP, reply_markup=await menu_kb())


@router.message(Command("cancel"))
async def cmd_cancel(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Скасовано.", reply_markup=await menu_kb())


# ---------- Рейси ----------

async def render_deps() -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        deps = await upcoming_departures(s, include_closed=True)
        items = []
        for d in deps:
            busy = cat.CAPACITY - free_count(d)
            lock = "🔒 " if d.status == "closed" else ""
            new = sum(1 for b in active_bookings(d) if b.status == "new")
            items.append((d.id, f"{lock}{departure_label(d)} · {busy}/8" + (f" · 🟡{new}" if new else "")))
    if not items:
        return "Майбутніх рейсів немає. Додайте дати 👇", await menu_kb()
    return "<b>Майбутні рейси</b> (зайнято/8, 🟡 — непідтверджені заявки):", kb.admin_deps_kb(items)


async def render_dep(dep_id: int) -> tuple[str, InlineKeyboardMarkup] | None:
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if not dep:
            return None
        text = manifest_text(dep)
        items = [(b.id, f"{'🟡' if b.status == 'new' else '🟢'} {b.code} · {b.name} · {b.pax} ос.")
                 for b in active_bookings(dep)]
        return text, kb.admin_dep_kb(dep.id, dep.status, items)


async def show(callback: CallbackQuery, text: str, markup: InlineKeyboardMarkup, new: bool = False):
    if len(text) > 4000:
        text = text[:3990] + "…\n(повний список — у таблиці)"
    if new:
        await callback.message.answer(text, reply_markup=markup)
        return
    try:
        await callback.message.edit_text(text, reply_markup=markup)
    except Exception:  # noqa: BLE001
        await callback.message.answer(text, reply_markup=markup)


@router.callback_query(kb.AdmCb.filter(F.action == "menu"))
async def cb_menu(callback: CallbackQuery, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    await show(callback, ADMIN_HELP, await menu_kb())


@router.callback_query(kb.AdmCb.filter(F.action == "deps"))
async def cb_deps(callback: CallbackQuery, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    text, markup = await render_deps()
    await show(callback, text, markup)


@router.callback_query(kb.AdmCb.filter(F.action == "dep"))
async def cb_dep(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    res = await render_dep(callback_data.id)
    if not res:
        return await callback.message.answer("Рейс не знайдено.")
    # з повідомлення-заявки відкриваємо рейс новим повідомленням, щоб заявка залишилась у чаті
    await show(callback, *res, new="Нова заявка" in (callback.message.text or "") or "Клієнт" in (callback.message.text or ""))


@router.callback_query(kb.AdmCb.filter(F.action == "csv"))
async def cb_csv(callback: CallbackQuery, callback_data: kb.AdmCb):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    async with Session() as s:
        dep = await s.get(Departure, callback_data.id)
        data = manifest_csv(dep)
        name = f"{dep.date.isoformat()}_{dep.trip_id}.csv"
        caption = departure_label(dep)
    await callback.message.answer_document(BufferedInputFile(data, filename=name), caption=caption)


@router.callback_query(kb.AdmCb.filter(F.action == "toggle"))
async def cb_toggle(callback: CallbackQuery, callback_data: kb.AdmCb):
    if not is_admin_cb(callback):
        return await callback.answer()
    async with Session() as s:
        dep = await s.get(Departure, callback_data.id)
        dep.status = "open" if dep.status == "closed" else "closed"
        await s.commit()
        await callback.answer("Набір відкрито" if dep.status == "open" else "Набір закрито")
    text, markup = await render_dep(callback_data.id)
    await show(callback, text, markup)


@router.callback_query(kb.AdmCb.filter(F.action == "cancel_dep"))
async def cb_cancel_dep(callback: CallbackQuery, callback_data: kb.AdmCb):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await callback.message.answer(
        "Скасувати рейс? Усім пасажирам прийде повідомлення про скасування.",
        reply_markup=kb.admin_yes_no_kb("cancel_dep_yes", callback_data.id, "dep", callback_data.id))


@router.callback_query(kb.AdmCb.filter(F.action == "cancel_dep_yes"))
async def cb_cancel_dep_yes(callback: CallbackQuery, callback_data: kb.AdmCb, bot: Bot):
    if not is_admin_cb(callback):
        return await callback.answer()
    async with Session() as s:
        dep = await s.get(Departure, callback_data.id)
        label = departure_label(dep)
        notified = 0
        for b in active_bookings(dep):
            if b.user_id:
                try:
                    await bot.send_message(b.user_id, f"😔 На жаль, поїздку <b>{escape(label)}</b> скасовано. "
                                                      "Вибачте за незручності! Менеджер зв'яжеться з вами, щоб запропонувати іншу дату.")
                    notified += 1
                except Exception:  # noqa: BLE001
                    pass
            await cancel_booking(s, b)
        dep.status = "cancelled"
        await s.commit()
    await callback.answer()
    await callback.message.edit_text(f"🗑 Рейс {escape(label)} скасовано. Повідомлено пасажирів: {notified}.",
                                     reply_markup=await menu_kb())


# ---------- Окрема бронь ----------

@router.callback_query(kb.AdmCb.filter(F.action == "bk"))
async def cb_booking(callback: CallbackQuery, callback_data: kb.AdmCb):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    async with Session() as s:
        b = await load_booking(s, callback_data.id)
        await callback.message.answer(booking_admin_text(b, "📋 Бронь"), reply_markup=kb.admin_booking_kb(b))


@router.callback_query(kb.AdmCb.filter(F.action == "bk_ok"))
async def cb_booking_ok(callback: CallbackQuery, callback_data: kb.AdmCb, bot: Bot):
    if not is_admin_cb(callback):
        return await callback.answer()
    async with Session() as s:
        b = await load_booking(s, callback_data.id)
        if b.status != "new":
            return await callback.answer("Вже оброблено", show_alert=True)
        b.status = "confirmed"
        await s.commit()
        await callback.answer("Підтверджено ✅")
        await callback.message.edit_text(booking_admin_text(b, "✅ Підтверджено"), reply_markup=kb.admin_booking_kb(b))
        if b.user_id:
            try:
                await bot.send_message(b.user_id, "✅ <b>Вашу бронь підтверджено!</b>\n\n" + booking_client_text(b) +
                                       "\n\nНапередодні ввечері напишемо точний час, коли під'їдемо 🚐")
            except Exception as e:  # noqa: BLE001
                log.warning("Не вдалося повідомити клієнта: %s", e)


@router.callback_query(kb.AdmCb.filter(F.action == "bk_cancel"))
async def cb_booking_cancel(callback: CallbackQuery, callback_data: kb.AdmCb):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await callback.message.answer("Скасувати цю бронь? Клієнт отримає повідомлення.",
                                  reply_markup=kb.admin_yes_no_kb("bk_cancel_yes", callback_data.id, "bk", callback_data.id))


@router.callback_query(kb.AdmCb.filter(F.action == "bk_cancel_yes"))
async def cb_booking_cancel_yes(callback: CallbackQuery, callback_data: kb.AdmCb, bot: Bot):
    if not is_admin_cb(callback):
        return await callback.answer()
    async with Session() as s:
        b = await load_booking(s, callback_data.id)
        if b.status == "cancelled":
            return await callback.answer("Вже скасовано", show_alert=True)
        await cancel_booking(s, b)
        await s.refresh(b.departure, ["bookings"])
        await callback.answer("Скасовано")
        await callback.message.edit_text(booking_admin_text(b, "❌ Скасовано"), reply_markup=kb.admin_booking_kb(b))
        if b.user_id:
            try:
                await bot.send_message(b.user_id, f"Вашу бронь <code>{b.code}</code> скасовано. "
                                                  "Якщо це помилка — просто напишіть нам тут.")
            except Exception:  # noqa: BLE001
                pass


# ---------- Додати дати ----------

@router.callback_query(kb.AdmCb.filter(F.action == "add_dates"))
async def cb_add_dates(callback: CallbackQuery, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    await show(callback, "Оберіть тур, для якого додати дати:", kb.admin_trips_kb())


@router.callback_query(kb.AdmCb.filter(F.action == "pick_trip"))
async def cb_pick_trip(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    trip = cat.TRIPS_BY_ID[callback_data.extra]
    async with Session() as s:
        deps = await upcoming_departures(s, trip["id"], include_closed=True)
    existing = ", ".join(cat.fmt_date(d.date, False) for d in deps) or "немає"
    await state.set_state(Adm.dates)
    await state.update_data(trip_id=trip["id"])
    await callback.message.edit_text(
        f"{trip['flag']} <b>{escape(trip['short_title'])}</b>\nВже є дати: {existing}\n\n"
        "Напишіть нові дати через кому, наприклад:\n<code>28.11, 5.12, 12.12</code>\n\n/cancel — скасувати")


@router.message(Adm.dates, F.text)
async def msg_dates(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    try:
        dates = cat.parse_dates(message.text)
    except ValueError:
        await message.answer("Не зрозумів дату 🤔 Формат: <code>28.11</code> або <code>28.11.2026</code>, через кому.")
        return
    past = [d for d in dates if d < cat.today()]
    dates = [d for d in dates if d >= cat.today()]
    async with Session() as s:
        added, existed = await add_departures(s, data["trip_id"], dates)
        waiting = list(await s.scalars(select(WaitlistEntry).where(WaitlistEntry.trip_id == data["trip_id"])))
    await state.clear()
    trip = cat.TRIPS_BY_ID[data["trip_id"]]
    parts = []
    if added:
        parts.append("✅ Додано: " + ", ".join(cat.fmt_date(d) for d in added))
    if existed:
        parts.append("Вже були: " + ", ".join(cat.fmt_date(d, False) for d in existed))
    if past:
        parts.append("Пропущено (минулі): " + ", ".join(cat.fmt_date(d, False) for d in past))
    await message.answer(f"{trip['flag']} {escape(trip['short_title'])}\n" + "\n".join(parts or ["Нічого не додано."]),
                         reply_markup=await menu_kb())
    # повідомляємо лист очікування
    if added and waiting:
        sent = 0
        text = (f"🔔 З'явились дати на <b>{trip['flag']} {escape(trip['short_title'])}</b>: "
                + ", ".join(cat.fmt_date(d) for d in added) + "\nНатисніть, щоб забронювати 👇")
        markup = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
            text="🗺 Подивитись і забронювати", callback_data=kb.TripCb(trip=trip["id"]).pack())]])
        for w in waiting:
            try:
                await bot.send_message(w.user_id, text, reply_markup=markup)
                sent += 1
            except Exception:  # noqa: BLE001
                pass
            await asyncio.sleep(0.05)
        await message.answer(f"🔔 Повідомлено з листа очікування: {sent}")


# ---------- Нотатка до рейсу ----------

@router.callback_query(kb.AdmCb.filter(F.action == "note"))
async def cb_note(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.set_state(Adm.note)
    await state.update_data(dep_id=callback_data.id)
    await callback.message.answer("Напишіть нотатку до рейсу (бачите тільки ви). «-» — видалити. /cancel — скасувати")


@router.message(Adm.note, F.text)
async def msg_note(message: Message, state: FSMContext):
    data = await state.get_data()
    async with Session() as s:
        dep = await s.get(Departure, data["dep_id"])
        dep.note = None if message.text.strip() == "-" else message.text.strip()
        await s.commit()
    await state.clear()
    text, markup = await render_dep(data["dep_id"])
    await message.answer(text, reply_markup=markup)


# ---------- Розсилка пасажирам ----------

@router.callback_query(kb.AdmCb.filter(F.action == "broadcast"))
async def cb_broadcast(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.set_state(Adm.broadcast)
    await state.update_data(dep_id=callback_data.id)
    await callback.message.answer(
        "Напишіть повідомлення для всіх пасажирів рейсу. Наприклад:\n"
        "<i>Добрий вечір! Завтра забираємо о 5:30, водій Олександр, авто — сірий Opel Vivaro.</i>\n\n/cancel — скасувати")


@router.message(Adm.broadcast)
async def msg_broadcast(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()
    async with Session() as s:
        dep = await s.get(Departure, data["dep_id"])
        targets = {b.user_id for b in active_bookings(dep) if b.user_id}
        no_tg = [b for b in active_bookings(dep) if not b.user_id]
    sent = 0
    for uid in targets:
        try:
            await bot.copy_message(uid, message.chat.id, message.message_id)
            sent += 1
        except Exception:  # noqa: BLE001
            pass
        await asyncio.sleep(0.05)
    text = f"📨 Надіслано: {sent} з {len(targets)}"
    if no_tg:
        text += "\nБез Telegram (зателефонуйте): " + ", ".join(f"{escape(b.name)} <code>{escape(b.phone)}</code>" for b in no_tg)
    await message.answer(text)


# ---------- Ручне додавання пасажира ----------

@router.callback_query(kb.AdmCb.filter(F.action == "manual"))
async def cb_manual(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    await state.set_state(Adm.m_name)
    await state.update_data(dep_id=callback_data.id)
    await callback.message.answer("Додаємо пасажира вручну (наприклад, після дзвінка).\n\n1/5 Ім'я та прізвище?\n/cancel — скасувати")


@router.message(Adm.m_name, F.text)
async def m_name(message: Message, state: FSMContext):
    await state.update_data(name=message.text.strip())
    await state.set_state(Adm.m_phone)
    await message.answer("2/5 Телефон?")


@router.message(Adm.m_phone, F.text)
async def m_phone(message: Message, state: FSMContext):
    await state.update_data(phone=message.text.strip())
    await state.set_state(Adm.m_city)
    await message.answer("3/5 Звідки забрати?", reply_markup=kb.admin_city_kb())


@router.callback_query(kb.AdmCb.filter(F.action == "m_city"), Adm.m_city)
async def m_city(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    await callback.answer()
    city = cat.PICKUP_BY_ID[callback_data.extra]["name"]
    await state.update_data(city=city)
    await state.set_state(Adm.m_address)
    await callback.message.edit_text(f"📍 {city}\n\n4/5 Адреса?")


@router.message(Adm.m_address, F.text)
async def m_address(message: Message, state: FSMContext):
    await state.update_data(address=message.text.strip())
    await state.set_state(Adm.m_pax)
    await message.answer("5/5 Скільки людей? (цифрою; місця призначу автоматично)")


@router.message(Adm.m_pax, F.text)
async def m_pax(message: Message, state: FSMContext, bot: Bot):
    if not message.text.strip().isdigit():
        return await message.answer("Напишіть цифрою, наприклад 2")
    data = await state.get_data()
    await state.clear()
    try:
        async with Session() as s:
            b = await create_booking(s, departure_id=data["dep_id"], pax=int(message.text.strip()), seats=None,
                                     name=data["name"], phone=data["phone"], city=data["city"],
                                     address=data["address"], source="admin")
            b.status = "confirmed"
            await s.commit()
    except BookingError as e:
        return await message.answer(f"Не вийшло: {e}")
    await notify_new_booking(bot, b)
    text, markup = await render_dep(data["dep_id"])
    await message.answer(text, reply_markup=markup)


# ---------- Анонс у канал ----------

@router.callback_query(kb.AdmCb.filter(F.action == "announce"))
async def cb_announce(callback: CallbackQuery, callback_data: kb.AdmCb, bot: Bot):
    if not is_admin_cb(callback):
        return await callback.answer()
    async with Session() as s:
        dep = await s.get(Departure, callback_data.id)
        trip = cat.TRIPS_BY_ID[dep.trip_id]
        free = free_count(dep)
        photo = await trip_photo(s, dep.trip_id)
    me = await bot.me()
    caption = (
        f"<b>{trip['flag']} {escape(trip['title'])}</b>\n"
        f"📅 {cat.fmt_departure(dep.date, trip['days'])} · 💶 {trip['price']} €\n\n"
        + "\n".join(f"• {escape(h)}" for h in trip.get("highlights", [])[:4])
        + f"\n\n🏠 Забираємо від дому: Саарланд, Трір, Люксембург\n🚐 Вільних місць: {free} з 8"
    )
    markup = InlineKeyboardMarkup(inline_keyboard=[[InlineKeyboardButton(
        text="💺 Забронювати місце", url=f"https://t.me/{me.username}?start=dep_{dep.id}")]])
    try:
        if photo:
            await bot.send_photo(settings.CHANNEL_CHAT_ID, photo, caption=caption[:1024], reply_markup=markup)
        else:
            await bot.send_message(settings.CHANNEL_CHAT_ID, caption, reply_markup=markup)
        await callback.answer("Опубліковано в каналі ✅", show_alert=True)
    except Exception as e:  # noqa: BLE001
        await callback.answer()
        await callback.message.answer(
            f"Не вдалося опублікувати в {escape(settings.CHANNEL_CHAT_ID)}: {escape(str(e))}\n"
            "Перевірте, що бот доданий у канал адміністратором. Ось пост — можна переслати вручну:")
        if photo:
            await callback.message.answer_photo(photo, caption=caption[:1024], reply_markup=markup)
        else:
            await callback.message.answer(caption, reply_markup=markup)


# ---------- Лист очікування ----------

@router.callback_query(kb.AdmCb.filter(F.action == "waitlist"))
async def cb_waitlist(callback: CallbackQuery):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    async with Session() as s:
        items = list(await s.scalars(select(WaitlistEntry).order_by(WaitlistEntry.trip_id, WaitlistEntry.created_at)))
    if not items:
        return await show(callback, "Лист очікування порожній.", await menu_kb())
    lines, current = ["<b>🔔 Лист очікування</b>"], None
    for w in items:
        if w.trip_id != current:
            current = w.trip_id
            t = cat.TRIPS_BY_ID.get(current, {})
            lines.append(f"\n<b>{t.get('flag', '')} {escape(t.get('short_title', current))}</b>")
        lines.append(f"• {escape(w.name)}" + (f" @{escape(w.username)}" if w.username else ""))
    lines.append("\nКоли додасте дати цьому туру — бот сам повідомить цих людей.")
    await show(callback, "\n".join(lines)[:4000], await menu_kb())


# ---------- Фото турів ----------

@router.callback_query(kb.AdmCb.filter(F.action == "photos"))
async def cb_photos(callback: CallbackQuery, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    await state.clear()
    await show(callback, "Оберіть тур, для якого завантажити фото.\n"
                         "Фото буде і в боті, і в застосунку.", kb.admin_trips_kb("pick_photo"))


@router.callback_query(kb.AdmCb.filter(F.action == "pick_photo"))
async def cb_pick_photo(callback: CallbackQuery, callback_data: kb.AdmCb, state: FSMContext):
    if not is_admin_cb(callback):
        return await callback.answer()
    await callback.answer()
    trip = cat.TRIPS_BY_ID[callback_data.extra]
    await state.set_state(Adm.photo)
    await state.update_data(trip_id=trip["id"])
    await callback.message.edit_text(
        f"{trip['flag']} <b>{escape(trip['short_title'])}</b>\n\n"
        "Надішліть одне фото (як звичайне фото, не файлом). Краще горизонтальне.\n/cancel — скасувати")


@router.message(Adm.photo, F.photo)
async def msg_photo(message: Message, state: FSMContext):
    data = await state.get_data()
    file_id = message.photo[-1].file_id
    async with Session() as s:
        row = await s.get(TripPhoto, data["trip_id"])
        if row:
            row.file_id = file_id
        else:
            s.add(TripPhoto(trip_id=data["trip_id"], file_id=file_id))
        await s.commit()
    await state.clear()
    trip = cat.TRIPS_BY_ID[data["trip_id"]]
    await message.answer(f"✅ Фото для {trip['flag']} {escape(trip['short_title'])} збережено.",
                         reply_markup=kb.admin_trips_kb("pick_photo"))


@router.message(Adm.photo)
async def msg_photo_wrong(message: Message):
    await message.answer("Потрібне саме фото 📷 (не файл і не текст). Або /cancel")


# ---------- ШІ-помічник ----------

@router.callback_query(kb.AdmCb.filter(F.action == "ai_toggle"))
async def cb_ai_toggle(callback: CallbackQuery):
    if not is_admin_cb(callback):
        return await callback.answer()
    if not settings.ANTHROPIC_API_KEY:
        return await callback.answer("Додайте ANTHROPIC_API_KEY у Render → Environment, і помічник з'явиться.", show_alert=True)
    now_on = await ai.is_enabled()
    await ai.set_setting("ai_enabled", "0" if now_on else "1")
    await callback.answer("Помічник вимкнений — питання йдуть вам" if now_on else "Помічник увімкнений 🤖", show_alert=True)
    await show(callback, ADMIN_HELP, await menu_kb())
