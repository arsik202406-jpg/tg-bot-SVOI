"""Клієнтська частина: меню, поїздки, покрокове бронювання, «Мої бронювання»."""
from __future__ import annotations

import logging
import re
from urllib.parse import quote
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import CommandObject, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import CallbackQuery, InputMediaPhoto, Message, ReplyKeyboardRemove
from sqlalchemy import select

from .. import catalog as cat
from .. import keyboards as kb
from ..config import settings
from ..db import touch_user
from ..db import (Booking, DateRequest, Departure, Session, SupportThread, WaitlistEntry, get_customer, media_list,
                  taken_seats, trip_photo)
from ..services import (clean_postcode, full_address, load_booking, BookingError, booking_admin_text, booking_client_text, cancel_booking, create_booking,
                        free_count, notify_admins, notify_new_booking, parse_ages, payment_note, price_for, upcoming_departures,
                        user_bookings)

log = logging.getLogger(__name__)
router = Router(name="client")


class Propose(StatesGroup):
    text = State()


class Book(StatesGroup):
    pax = State()
    kids = State()
    kid_ages = State()
    seats = State()
    city = State()
    saved_address = State()
    address = State()
    postcode = State()
    district = State()
    phone = State()
    comment = State()
    confirm = State()


WELCOME = (
    "Вітаємо в <b>SVOI Travel</b>! 👋\n\n"
    "Поїздки по Європі маленькими групами (до 8 людей) на мінівені. "
    "Забираємо від дому: Саарланд, Трір, Люксембург.\n\n"
    "👇 Натисніть <b>«🗺 Поїздки та дати»</b> або просто напишіть питання.\n"
    "Повернутись сюди будь-коли — /start"
)

HOW_IT_WORKS = (
    "<b>Як усе працює</b>\n\n"
    "1️⃣ Обираєте поїздку і дату\n"
    "2️⃣ Вказуєте, скільки вас, адресу і телефон\n"
    "3️⃣ Ми підтверджуємо бронь, а напередодні ввечері пишемо точний час, коли під'їдемо\n"
    "4️⃣ Оплачуєте водію при посадці (готівкою або переказом)\n\n"
    "🚐 Мінівен Opel Vivaro на 8 місць, клімат-контроль, USB-зарядки\n"
    "🏠 Забираємо від дому: Саарланд, Трір, Люксембург. Інші міста по дорозі — за домовленістю\n"
    "🧳 Багаж: невелика сумка до 10 кг + ручна поклажа\n"
    "🛂 Документи: паспорт + посвідка на проживання (Aufenthaltstitel) або віза\n"
    "🔄 Скасувати бронь безкоштовно можна за 3 дні (72 години) до виїзду\n"
    "🏨 Для поїздок на 2–3 дні потрібна передоплата лише за готель"
)


def how_kb():
    return kb.InlineKeyboardMarkup(inline_keyboard=[
        [kb.IB(text=kb.BTN_VAN, callback_data="van_photos"), kb.IB(text="⭐ Відгуки", callback_data="reviews")],
        [kb.IB(text="🎁 Запросити друга", callback_data="invite")],
        [kb.IB(text="🔒 Політика конфіденційності", callback_data="privacy")],
        [kb.IB(text="🗺 Поїздки та дати", callback_data=kb.StepCb(action="to_trips").pack())],
        [kb.home_button()],
    ])

PHONE_RE = re.compile(r"^\+?[\d\s\-()]{7,20}$")


# ---------- Старт і меню ----------

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext, command: CommandObject):
    await state.clear()
    payload = (command.args or "").strip()
    ref = int(payload[4:]) if payload.startswith("ref_") and payload[4:].isdigit() else None
    is_new = await touch_user(message.from_user, source=payload[:32] or None, referred_by=ref)
    if is_new and ref:
        inviter = ref
        await notify_admins(message.bot, f"🎁 Новий користувач {escape(message.from_user.full_name)} прийшов "
                                         f"за запрошенням (ID {inviter}).")
    await send_welcome(message)
    if payload == "trips":
        text, markup = await trips_overview()
        await message.answer(text, reply_markup=markup)
    if payload.startswith("dep_") and payload[4:].isdigit():
        await start_booking(message, state, int(payload[4:]))
    elif payload.startswith("trip_"):
        await send_trip_card(message, payload[5:])


async def send_welcome(message: Message):
    """Привітання з фото/відео (якщо адмін завантажив його в /admin → 🖼 Фото і відео)."""
    async with Session() as s:
        items = await media_list(s, "welcome")
    m = items[-1] if items else None
    try:
        if m and m.kind == "photo":
            return await message.answer_photo(m.file_id, caption=WELCOME, reply_markup=kb.main_kb())
        if m and m.kind == "video":
            return await message.answer_video(m.file_id, caption=WELCOME, reply_markup=kb.main_kb())
        if m and m.kind == "animation":
            return await message.answer_animation(m.file_id, caption=WELCOME, reply_markup=kb.main_kb())
    except Exception as e:  # noqa: BLE001
        log.warning("Привітальне медіа: %s", e)
    await message.answer(WELCOME, reply_markup=kb.main_kb())


@router.callback_query(F.data == "home")
async def cb_home(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.clear()
    await send_welcome(callback.message)


@router.message(F.text == kb.BTN_CANCEL)
async def cancel_any(message: Message, state: FSMContext):
    await state.clear()
    await message.answer("Скасовано. Чим ще можу допомогти?", reply_markup=kb.main_kb())


@router.message(F.text == kb.BTN_GAMES)
async def games(message: Message, state: FSMContext):
    from .games import GAMES_TEXT, get_games_keyboard
    await state.clear()
    await message.answer(GAMES_TEXT, reply_markup=get_games_keyboard())


@router.message(F.text == kb.BTN_HOW)
async def how_it_works(message: Message):
    await message.answer(HOW_IT_WORKS, reply_markup=how_kb())


@router.callback_query(F.data == "van_photos")
async def cb_van_photos(callback: CallbackQuery):
    from aiogram.types import InputMediaPhoto, InputMediaVideo
    await callback.answer()
    async with Session() as s:
        items = await media_list(s, "van")
    if not items:
        return await callback.message.answer("Фото нашого мінівена Opel Vivaro скоро з'являться тут 🚐")
    album = [(InputMediaVideo if m.kind == "video" else InputMediaPhoto)(media=m.file_id) for m in items[:10]]
    album[0].caption = "🚐 Наш Opel Vivaro: 8 зручних місць, клімат-контроль, USB-зарядки"
    await callback.message.answer_media_group(album)
    await callback.message.answer("Готові поїхати? 👇", reply_markup=kb.InlineKeyboardMarkup(inline_keyboard=[
        [kb.IB(text="🗺 Поїздки та дати", callback_data=kb.StepCb(action="to_trips").pack())],
        [kb.home_button()]]))


# ---------- Список поїздок ----------

async def trips_overview(show_all: bool = False) -> tuple[str, object]:
    async with Session() as s:
        deps = await upcoming_departures(s)
    nearest: dict[str, str] = {}
    for d in deps:
        if d.trip_id not in nearest and free_count(d) > 0:
            trip = cat.TRIPS_BY_ID.get(d.trip_id, {})
            nearest[d.trip_id] = cat.fmt_departure(d.date, trip.get("days", 1))
    dated = [(cat.TRIPS_BY_ID[t], label) for t, label in nearest.items() if t in cat.TRIPS_BY_ID]
    if dated and not show_all:
        markup = kb.trips_kb(dated)
        markup.inline_keyboard.insert(len(dated), [kb.IB(text="🗓 Інші напрямки (дати скоро)", callback_data=kb.StepCb(action="all_trips").pack())])
        return "Найближчі поїздки 👇\nНатисніть на поїздку, щоб побачити програму і вільні місця.", markup
    rest = [(t, nearest.get(t["id"])) for t in cat.TRIPS if show_all or t["id"] not in nearest]
    text = ("Усі наші напрямки 👇\nДе дати ще не призначені — натисніть, і ми повідомимо, коли з'являться."
            if not dated or show_all else "")
    return text or "Усі напрямки 👇", kb.trips_kb(rest)


@router.message(F.text == kb.BTN_TRIPS)
async def show_trips(message: Message, state: FSMContext):
    await state.clear()
    text, markup = await trips_overview()
    await message.answer(text, reply_markup=markup)


@router.callback_query(kb.StepCb.filter(F.action.in_({"to_trips", "all_trips"})))
async def cb_trips(callback: CallbackQuery, callback_data: kb.StepCb, state: FSMContext):
    await callback.answer()
    await state.clear()
    text, markup = await trips_overview(show_all=callback_data.action == "all_trips")
    await callback.message.answer(text, reply_markup=markup)


def trip_caption(trip: dict, has_dates: bool) -> str:
    lines = [f"<b>{trip['flag']} {escape(trip['title'])}</b>",
             f"⏱ {trip['duration']} · 💶 <b>{trip['price']} €</b> з людини", ""]
    lines += [f"• {escape(h)}" for h in trip.get("highlights", [])[:5]]
    if trip.get("pickup_time"):
        lines.append(f"\n🕕 Виїзд із Саарбрюккена ≈ {trip['pickup_time']}")
    lines.append(f"🚐 Поїздка відбудеться, коли збереться від {settings.MIN_PAX} людей")
    lines.append("\nОберіть дату 👇" if has_dates else "\nДати ще не призначені — натисніть «Повідомити», і ми напишемо першими.")
    caption = "\n".join(lines)
    return caption[:1020]


async def send_trip_card(message: Message, trip_id: str):
    trip = cat.TRIPS_BY_ID.get(trip_id)
    if not trip:
        await message.answer("Поїздку не знайдено.")
        return
    async with Session() as s:
        deps = await upcoming_departures(s, trip_id)
        rows = [(d.id, cat.fmt_departure(d.date, trip["days"]), free_count(d)) for d in deps]
        photo, rel = await trip_photo(s, trip_id)
    caption = trip_caption(trip, bool(rows))
    markup = kb.trip_kb(trip_id, rows, photos=len(cat.gallery(trip_id)))
    me = await message.bot.me()
    share = ("https://t.me/share/url?url=" + quote(f"https://t.me/{me.username}?start=trip_{trip_id}") +
             "&text=" + quote(f"Поїхали разом: {trip['flag']} {trip['short_title']} 🚐"))
    from .extras import approved_reviews
    _, avg, count = await approved_reviews(trip_id, limit=0)
    extra = [kb.IB(text="📤 Поділитися", url=share)]
    if count:
        extra.insert(0, kb.IB(text=f"⭐ {avg:.1f} ({count})", callback_data=f"reviews:{trip_id}"))
    markup.inline_keyboard.insert(len(markup.inline_keyboard) - 1, extra)
    if photo:
        try:
            sent = await message.answer_photo(photo, caption=caption, reply_markup=markup)
            cat.remember_photo(rel, sent)
            return
        except Exception:  # noqa: BLE001 — фото недоступне, показуємо текстом
            pass
    await message.answer(caption, reply_markup=markup)


@router.callback_query(kb.TripCb.filter())
async def cb_trip(callback: CallbackQuery, callback_data: kb.TripCb, state: FSMContext):
    await callback.answer()
    await state.clear()
    await send_trip_card(callback.message, callback_data.trip)


@router.callback_query(kb.GalleryCb.filter())
async def cb_gallery(callback: CallbackQuery, callback_data: kb.GalleryCb):
    """Альбом фото локацій, а під ним — знову картка туру з кнопками."""
    await callback.answer()
    trip = cat.TRIPS_BY_ID.get(callback_data.trip)
    files = cat.gallery(callback_data.trip)[:10]
    if not trip or not files:
        return
    try:
        await callback.message.delete()
    except Exception:  # noqa: BLE001
        pass
    album = [InputMediaPhoto(media=cat.photo_input(f), caption=f"📸 {trip['flag']} {escape(trip['short_title'])}" if i == 0 else None)
             for i, f in enumerate(files)]
    try:
        sent = await callback.message.answer_media_group(album)
        for f, m in zip(files, sent):
            cat.remember_photo(f, m)
    except Exception:  # noqa: BLE001
        log.exception("Не вдалося надіслати альбом %s", callback_data.trip)
    await send_trip_card(callback.message, callback_data.trip)


@router.callback_query(kb.WaitCb.filter())
async def cb_waitlist(callback: CallbackQuery, callback_data: kb.WaitCb, bot: Bot):
    user = callback.from_user
    trip = cat.TRIPS_BY_ID.get(callback_data.trip, {})
    async with Session() as s:
        exists = await s.scalar(select(WaitlistEntry.id).where(
            WaitlistEntry.trip_id == callback_data.trip, WaitlistEntry.user_id == user.id))
        if not exists:
            s.add(WaitlistEntry(trip_id=callback_data.trip, user_id=user.id, name=user.full_name, username=user.username))
            await s.commit()
            await notify_admins(bot, f"🔔 Лист очікування: {escape(user.full_name)}"
                                     f"{' @' + user.username if user.username else ''} хоче на "
                                     f"{trip.get('flag', '')} {escape(trip.get('short_title', ''))}")
    await callback.answer("Готово! Напишемо, щойно з'являться місця 🙌", show_alert=True)


# ---------- Своя дата ----------

@router.callback_query(kb.ProposeCb.filter())
async def cb_propose(callback: CallbackQuery, callback_data: kb.ProposeCb, state: FSMContext):
    await callback.answer()
    trip = cat.TRIPS_BY_ID.get(callback_data.trip, {})
    await state.set_state(Propose.text)
    await state.update_data(trip_id=callback_data.trip)
    await callback.message.answer(
        f"📝 <b>{trip.get('flag', '')} {escape(trip.get('short_title', ''))}</b>\n\n"
        "Напишіть, яка дата вам зручна і скільки вас буде.\n"
        "Наприклад: <i>«14 грудня або 21 грудня, нас 4»</i>",
        reply_markup=kb.cancel_kb())


@router.message(Propose.text, F.text)
async def msg_propose(message: Message, state: FSMContext, bot: Bot):
    data = await state.get_data()
    await state.clear()
    u = message.from_user
    await save_date_request(bot, u.id, u.full_name, u.username, data["trip_id"], message.text.strip())
    await message.answer("Дякуємо! 🙌 Передали менеджеру. Якщо збереться група на цю дату — "
                         "додамо її і напишемо вам першими.", reply_markup=kb.main_kb())


async def save_date_request(bot: Bot, user_id: int, name: str, username: str | None, trip_id: str, text: str,
                            source: str = "бот") -> None:
    """Пропозиція своєї дати: зберігаємо, додаємо в лист очікування, повідомляємо менеджера."""
    trip = cat.TRIPS_BY_ID.get(trip_id, {})
    async with Session() as s:
        s.add(DateRequest(trip_id=trip_id, user_id=user_id, name=name, username=username, text=text[:500]))
        exists = await s.scalar(select(WaitlistEntry.id).where(
            WaitlistEntry.trip_id == trip_id, WaitlistEntry.user_id == user_id))
        if not exists:
            s.add(WaitlistEntry(trip_id=trip_id, user_id=user_id, name=name, username=username))
        who = escape(name) + (f" @{username}" if username else "")
        for admin_id in settings.admin_ids:
            try:
                m = await bot.send_message(
                    admin_id,
                    f"📝 <b>Пропозиція дати</b> ({source})\n{trip.get('flag', '')} {escape(trip.get('short_title', trip_id))}\n"
                    f"👤 {who}\n💬 {escape(text[:500])}\n\n<i>Натисніть «Відповісти», щоб написати клієнту.</i>")
                s.add(SupportThread(admin_chat_id=admin_id, admin_message_id=m.message_id, user_id=user_id))
            except Exception as e:  # noqa: BLE001
                log.error("Пропозиція дати: %s", e)
        await s.commit()


# ---------- Бронювання ----------

@router.callback_query(kb.DepCb.filter())
async def cb_departure(callback: CallbackQuery, callback_data: kb.DepCb, state: FSMContext):
    await callback.answer()
    await start_booking(callback.message, state, callback_data.dep)


async def start_booking(message: Message, state: FSMContext, dep_id: int):
    await state.clear()
    async with Session() as s:
        dep = await s.get(Departure, dep_id)
        if not dep or dep.status != "open" or dep.date < cat.today():
            await message.answer("На жаль, на цю дату набір уже закрито. Подивіться інші дати 👇")
            text, markup = await trips_overview()
            await message.answer(text, reply_markup=markup)
            return
        free = free_count(dep)
        trip = cat.TRIPS_BY_ID[dep.trip_id]
    if free <= 0:
        await message.answer("На цю дату місць уже немає 😔", reply_markup=kb.trip_kb(dep.trip_id, []))
        return
    await state.update_data(dep_id=dep_id, trip_id=dep.trip_id)
    await state.set_state(Book.pax)
    await message.answer(
        f"<b>{trip['flag']} {escape(trip['short_title'])}</b>, {cat.fmt_departure(dep.date, trip['days'])}\n\n"
        f"<b>Скільки людей поїде?</b> Разом із дітьми (вільно місць: {free})",
        reply_markup=kb.pax_kb(free),
    )


@router.callback_query(kb.PaxCb.filter(), Book.pax)
async def cb_pax(callback: CallbackQuery, callback_data: kb.PaxCb, state: FSMContext):
    await callback.answer()
    data = await state.get_data()
    async with Session() as s:
        taken = await taken_seats(s, data["dep_id"])
    await state.update_data(pax=callback_data.n, seats=[], children=0, child_ages=[])
    if callback_data.n >= 2:
        trip = cat.TRIPS_BY_ID[data["trip_id"]]
        await state.set_state(Book.kids)
        await callback.message.edit_text(
            f"<b>Чи є серед них діти до {cat.CHILD_MAX_AGE + 1} років?</b>\n\n"
            f"👶 Дитячий квиток: <b>{cat.child_price(trip)} €</b> замість {trip['price']} €",
            reply_markup=kb.kids_kb(callback_data.n))
        return
    await state.set_state(Book.seats)
    await callback.message.edit_text(seats_prompt(callback_data.n, []), reply_markup=kb.seats_kb(taken, [], callback_data.n))


@router.callback_query(kb.KidsCb.filter(), Book.kids)
async def cb_kids(callback: CallbackQuery, callback_data: kb.KidsCb, state: FSMContext):
    await callback.answer()
    data = await state.get_data()
    n = max(0, min(callback_data.n, data["pax"] - 1))
    await state.update_data(children=n, child_ages=[])
    if n == 0:
        return await show_seats(callback.message, state, edit=True)
    await state.set_state(Book.kid_ages)
    word = "дитині" if n == 1 else "дітям"
    await callback.message.edit_text(
        f"<b>Скільки років {word}?</b>\n\nНапишіть вік{' кожної дитини через кому' if n > 1 else ''}, "
        f"наприклад: <code>{'7' if n == 1 else '4, 9'}</code>\n\n"
        "Це потрібно, щоб підготувати дитяче автокрісло або бустер — так вимагають правила перевезення дітей.",
        reply_markup=kb.InlineKeyboardMarkup(inline_keyboard=[[kb.IB(text="⬅️ Назад", callback_data=kb.StepCb(action="restart").pack())]]))


@router.message(Book.kid_ages, F.text)
async def msg_kid_ages(message: Message, state: FSMContext):
    data = await state.get_data()
    n = data.get("children", 0)
    ages = parse_ages(message.text)
    if len(ages) != n:
        await message.answer(f"Напишіть, будь ласка, {n} {'число' if n == 1 else 'числа'} через кому, наприклад: "
                             f"<code>{'7' if n == 1 else ', '.join(['4', '9', '11', '2', '6', '8', '10'][:n])}</code>")
        return
    if any(a > cat.CHILD_MAX_AGE for a in ages):
        older = sum(1 for a in ages if a > cat.CHILD_MAX_AGE)
        ages = [a for a in ages if a <= cat.CHILD_MAX_AGE]
        await message.answer(f"ℹ️ Дитячий квиток діє до {cat.CHILD_MAX_AGE + 1} років, тому {older} з дітей їде за звичайною ціною.")
    await state.update_data(children=len(ages), child_ages=ages)
    await show_seats(message, state)


async def show_seats(message: Message, state: FSMContext, edit: bool = False):
    data = await state.get_data()
    async with Session() as s:
        taken = await taken_seats(s, data["dep_id"])
    await state.set_state(Book.seats)
    pax = data["pax"]
    if edit:
        await message.edit_text(seats_prompt(pax, []), reply_markup=kb.seats_kb(taken, [], pax))
    else:
        await message.answer(seats_prompt(pax, []), reply_markup=kb.seats_kb(taken, [], pax))


def seats_prompt(pax: int, selected: list[int]) -> str:
    need = "місце" if pax == 1 else f"{pax} місця" if pax < 5 else f"{pax} місць"
    text = (
        f"<b>Оберіть {need}</b> — або натисніть «🎲 Будь-які вільні», якщо не важливо.\n\n"
        "Схема мінівена: зверху — перший ряд біля водія.\n"
        "Вибір конкретного місця коштує +5 €, місце 7 — безкоштовно. ✖️ — зайнято."
    )
    if selected:
        text += f"\n\nОбрано: {', '.join(map(str, selected))}"
    return text


@router.callback_query(kb.SeatCb.filter(), Book.seats)
async def cb_seat(callback: CallbackQuery, callback_data: kb.SeatCb, state: FSMContext):
    data = await state.get_data()
    pax, selected = data["pax"], list(data.get("seats", []))
    async with Session() as s:
        taken = await taken_seats(s, data["dep_id"])
    no = callback_data.no
    if no == 0:  # будь-які вільні
        if cat.CAPACITY - len(taken) < pax:
            await callback.answer("Стільки вільних місць уже немає 😔", show_alert=True)
            return
        await callback.answer()
        await state.update_data(seats=[], auto=True)
        await ask_city(callback.message, state, edit=True)
        return
    if no == -1:  # далі
        if len(selected) != pax or any(x in taken for x in selected):
            await callback.answer("Хтось щойно зайняв одне з місць — оберіть, будь ласка, ще раз", show_alert=True)
            selected = [x for x in selected if x not in taken]
            await state.update_data(seats=selected)
            await callback.message.edit_text(seats_prompt(pax, selected), reply_markup=kb.seats_kb(taken, selected, pax))
            return
        await callback.answer()
        await state.update_data(auto=False)
        await ask_city(callback.message, state, edit=True)
        return
    if no in taken:
        await callback.answer("Це місце вже зайняте", show_alert=False)
        return
    if no in selected:
        selected.remove(no)
    elif len(selected) >= pax:
        if pax == 1:
            selected = [no]
        else:
            await callback.answer(f"Ви вже обрали {pax}. Зніміть одне, щоб обрати інше.", show_alert=True)
            return
    else:
        selected.append(no)
    await callback.answer()
    await state.update_data(seats=selected)
    await callback.message.edit_text(seats_prompt(pax, selected), reply_markup=kb.seats_kb(taken, selected, pax))


@router.callback_query(F.data == "noop")
async def cb_noop(callback: CallbackQuery):
    await callback.answer("Тут сидить водій 🙂")


async def ask_city(message: Message, state: FSMContext, edit: bool = False):
    await state.set_state(Book.city)
    text = "<b>Звідки вас забрати?</b>"
    if edit:
        await message.edit_text(text, reply_markup=kb.city_kb())
    else:
        await message.answer(text, reply_markup=kb.city_kb())


@router.callback_query(kb.CityCb.filter(), Book.city)
async def cb_city(callback: CallbackQuery, callback_data: kb.CityCb, state: FSMContext):
    await callback.answer()
    city = cat.PICKUP_BY_ID.get(callback_data.city, cat.PICKUP_CITIES[0])
    await state.update_data(city=city["name"])
    async with Session() as s:
        cust = await get_customer(s, callback.from_user.id)
    if cust and cust.address and cust.city == city["name"] and cust.postcode:
        await state.update_data(saved_address=cust.address, saved_postcode=cust.postcode, saved_district=cust.district)
        await state.set_state(Book.saved_address)
        await callback.message.edit_text(
            f"Забрати за тією ж адресою, що минулого разу?\n\n🏠 <b>{escape(full_address(cust))}</b>",
            reply_markup=kb.saved_address_kb())
        return
    await callback.message.edit_text(f"📍 {city['name']}")
    await ask_address(callback.message, state, other=callback_data.city == "other")


async def ask_address(message: Message, state: FSMContext, other: bool = False):
    await state.set_state(Book.address)
    example = "місто, вулиця і номер будинку" if other else "вулиця, номер будинку і місто"
    await message.answer(
        f"<b>Напишіть адресу, звідки вас забрати</b>\n({example}, наприклад: <i>Bahnhofstraße 12, Saarbrücken</i>)\n"
        "Поштовий індекс спитаю наступним кроком.",
        reply_markup=kb.cancel_kb())


@router.callback_query(kb.StepCb.filter(F.action == "use_saved"), Book.saved_address)
async def cb_use_saved(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    data = await state.get_data()
    await state.update_data(address=data["saved_address"], postcode=data.get("saved_postcode"),
                            district=data.get("saved_district"))
    await callback.message.edit_text("🏠 Адресу збережено ✅")
    await ask_phone(callback.message, state, callback.from_user.id)


@router.callback_query(kb.StepCb.filter(F.action == "new_address"), Book.saved_address)
async def cb_new_address(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await callback.message.delete()
    await ask_address(callback.message, state)


@router.message(Book.address, F.text)
async def msg_address(message: Message, state: FSMContext):
    address = message.text.strip()
    if len(address) < 5:
        await message.answer("Напишіть, будь ласка, повну адресу: вулицю, номер будинку і місто.")
        return
    await state.update_data(address=address)
    await state.set_state(Book.postcode)
    await message.answer("<b>Поштовий індекс</b> (наприклад: <i>66111</i> або <i>L-1234</i> для Люксембургу)\n"
                         "Це важливо: у сусідніх містах бувають однакові вулиці.", reply_markup=kb.cancel_kb())


@router.message(Book.postcode, F.text)
async def msg_postcode(message: Message, state: FSMContext):
    pc = clean_postcode(message.text)
    if not pc:
        return await message.answer("Не схоже на індекс 🤔 Напишіть 4–5 цифр, наприклад <i>66111</i> або <i>L-1234</i>.")
    await state.update_data(postcode=pc)
    await state.set_state(Book.district)
    await message.answer("<b>Район</b> (необов'язково) — наприклад, <i>Burbach</i> або <i>Dudweiler</i>.\n"
                         "Напишіть або натисніть «Пропустити».",
                         reply_markup=kb.InlineKeyboardMarkup(inline_keyboard=[[kb.IB(
                             text="Пропустити ➡️", callback_data=kb.StepCb(action="skip_district").pack())]]))


@router.message(Book.district, F.text)
async def msg_district(message: Message, state: FSMContext):
    await state.update_data(district=message.text.strip()[:80])
    await ask_phone(message, state, message.from_user.id)


@router.callback_query(kb.StepCb.filter(F.action == "skip_district"), Book.district)
async def cb_skip_district(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await state.update_data(district=None)
    await ask_phone(callback.message, state, callback.from_user.id)


async def ask_phone(message: Message, state: FSMContext, user_id: int):
    async with Session() as s:
        cust = await get_customer(s, user_id)
    await state.set_state(Book.phone)
    hint = ""
    if cust and cust.phone:
        await state.update_data(saved_phone=cust.phone)
        hint = f"\n\nАбо напишіть «так», щоб залишити номер <b>{escape(cust.phone)}</b>"
    await message.answer(
        "<b>Ваш номер телефону</b> — щоб водій міг зателефонувати.\n"
        "Натисніть кнопку «📱 Надіслати мій номер» внизу 👇" + hint,
        reply_markup=kb.phone_kb())


@router.message(Book.phone, F.contact)
async def msg_contact(message: Message, state: FSMContext):
    phone = message.contact.phone_number
    await state.update_data(phone=phone if phone.startswith("+") else f"+{phone}")
    await ask_comment(message, state)


@router.message(Book.phone, F.text)
async def msg_phone(message: Message, state: FSMContext):
    text = message.text.strip()
    data = await state.get_data()
    if text.lower() in {"так", "да", "yes", "ок", "ok"} and data.get("saved_phone"):
        await state.update_data(phone=data["saved_phone"])
    elif PHONE_RE.match(text) and sum(ch.isdigit() for ch in text) >= 7:
        await state.update_data(phone=text)
    else:
        await message.answer("Не схоже на номер 🤔 Натисніть кнопку «📱 Надіслати мій номер» або напишіть номер цифрами.")
        return
    await ask_comment(message, state)


async def ask_comment(message: Message, state: FSMContext):
    await state.set_state(Book.comment)
    await message.answer("Дякуємо! 👍", reply_markup=ReplyKeyboardRemove())
    await message.answer(
        "Хочете щось уточнити? Наприклад: «з дитиною 5 років», «потрібне дитяче крісло», «велика валіза».\n"
        "Напишіть повідомленням або натисніть кнопку 👇",
        reply_markup=kb.comment_kb())


@router.message(Book.comment, F.text)
async def msg_comment(message: Message, state: FSMContext):
    await state.update_data(comment=message.text.strip())
    await show_summary(message, state)


@router.callback_query(kb.StepCb.filter(F.action == "skip_comment"), Book.comment)
async def cb_skip_comment(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await callback.message.edit_reply_markup(reply_markup=None)
    await state.update_data(comment=None)
    await show_summary(callback.message, state)


async def show_summary(message: Message, state: FSMContext):
    data = await state.get_data()
    trip = cat.TRIPS_BY_ID[data["trip_id"]]
    async with Session() as s:
        dep = await s.get(Departure, data["dep_id"])
    seats = data.get("seats") or []
    auto = data.get("auto", True)
    fee = cat.seat_fee(seats, auto)
    kids = data.get("children", 0) or 0
    total = price_for(trip, data["pax"], seats, auto, kids)
    seats_line = "будь-які вільні (без доплати)" if auto else f"{', '.join(map(str, seats))} (+{fee} €)" if fee else ", ".join(map(str, seats))
    text = (
        "<b>Перевірте, будь ласка:</b>\n\n"
        f"{trip['flag']} <b>{escape(trip['short_title'])}</b>\n"
        f"📅 {cat.fmt_departure(dep.date, trip['days'])}\n"
        f"👥 Пасажирів: {data['pax']}"
        + (f" (з них дітей: {kids}, вік {', '.join(map(str, data.get('child_ages') or []))})" if kids else "") + "\n"
        f"💺 Місця: {seats_line}\n"
        f"📍 {escape(data['city'])}: {escape(data['address'])}, {escape(data.get('postcode') or '')}"
        + (f", район {escape(data['district'])}" if data.get("district") else "") + "\n"
        f"📞 {escape(data['phone'])}\n"
    )
    if data.get("comment"):
        text += f"💬 {escape(data['comment'])}\n"
    if kids:
        text += (f"\n💶 {data['pax'] - kids} × {trip['price']} € + {kids} × {cat.child_price(trip)} € (дитячий)"
                 + (f" + {fee} € за місця" if fee else ""))
    text += f"\n💶 <b>Разом: {total} €</b>\n{payment_note(data['trip_id'])}"
    text += "\n\n<i>Натискаючи «Підтвердити», ви погоджуєтесь з обробкою даних для організації поїздки.</i>"
    await state.set_state(Book.confirm)
    await message.answer(text, reply_markup=kb.confirm_kb())


@router.callback_query(kb.StepCb.filter(F.action == "confirm"), Book.confirm)
async def cb_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot):
    data = await state.get_data()
    user = callback.from_user
    try:
        async with Session() as s:
            booking = await create_booking(
                s, departure_id=data["dep_id"], pax=data["pax"],
                seats=None if data.get("auto", True) else data.get("seats"),
                name=user.full_name, phone=data["phone"], city=data["city"], address=data["address"],
                postcode=data.get("postcode"), district=data.get("district"),
                children=data.get("children", 0), child_ages=data.get("child_ages"),
                user_id=user.id, username=user.username, comment=data.get("comment"), source="bot")
    except BookingError as e:
        await callback.answer()
        await callback.message.edit_reply_markup(reply_markup=None)
        await callback.message.answer(f"😔 {e}", reply_markup=kb.main_kb())
        await state.clear()
        await start_booking(callback.message, state, data["dep_id"])
        return
    await callback.answer("Готово!")
    await state.clear()
    await callback.message.edit_reply_markup(reply_markup=None)
    await callback.message.answer("🎉", reply_markup=kb.main_kb())
    await notify_new_booking(bot, booking)


@router.callback_query(kb.StepCb.filter(F.action == "restart"))
async def cb_restart(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    data = await state.get_data()
    await callback.message.edit_reply_markup(reply_markup=None)
    if data.get("dep_id"):
        await start_booking(callback.message, state, data["dep_id"])
    else:
        await state.clear()
        text, markup = await trips_overview()
        await callback.message.answer(text, reply_markup=markup)


@router.callback_query(kb.PaxCb.filter())
@router.callback_query(kb.KidsCb.filter())
@router.callback_query(kb.SeatCb.filter())
@router.callback_query(kb.CityCb.filter())
@router.callback_query(kb.StepCb.filter())
async def cb_stale(callback: CallbackQuery):
    await callback.answer("Ця кнопка вже не активна. Натисніть «🗺 Поїздки та дати», щоб почати знову.", show_alert=True)


# ---------- Мої бронювання ----------

@router.message(F.text == kb.BTN_MY)
async def my_bookings(message: Message, state: FSMContext):
    await state.clear()
    async with Session() as s:
        items = await user_bookings(s, message.from_user.id)
        if not items:
            await message.answer("У вас поки немає майбутніх поїздок. Оберіть поїздку 👇", reply_markup=kb.main_kb())
            text, markup = await trips_overview()
            await message.answer(text, reply_markup=markup)
            return
        for i, b in enumerate(items):
            status = "✅ підтверджено" if b.status == "confirmed" else "🕐 чекає підтвердження менеджера"
            markup = kb.my_booking_kb(b.id)
            if i == len(items) - 1:
                markup.inline_keyboard.append([kb.home_button()])
            await message.answer(booking_client_text(b) + f"\nСтатус: {status}", reply_markup=markup)


@router.callback_query(kb.MyCb.filter())
async def cb_my(callback: CallbackQuery, callback_data: kb.MyCb, bot: Bot):
    async with Session() as s:
        b = await load_booking(s, callback_data.booking)
        if not b or b.user_id != callback.from_user.id or b.status == "cancelled":
            await callback.answer("Бронь не знайдено або вже скасовано", show_alert=True)
            return
        if callback_data.action == "cancel":
            await callback.answer()
            await callback.message.edit_reply_markup(reply_markup=kb.my_booking_confirm_kb(b.id))
            return
        if callback_data.action == "keep":
            await callback.answer("Залишаємо 👍")
            await callback.message.edit_reply_markup(reply_markup=kb.my_booking_kb(b.id))
            return
        await cancel_booking(s, b)
        await s.refresh(b.departure, ["bookings"])
        await callback.answer("Бронь скасовано")
        await callback.message.edit_text(callback.message.html_text + "\n\n❌ <b>Скасовано</b>")
        await notify_admins(bot, booking_admin_text(b, "❌ Клієнт скасував бронь"))
