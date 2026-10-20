import json
import logging
import random
from urllib.parse import quote
from aiogram import Router, F, Bot
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardRemove
)
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.states.states import BookingState
    from bot_code.data.trips import TRIPS_CATALOG, get_trip_date
    from bot_code.keyboards.inline import (
        get_contact_share_reply_keyboard,
        get_contact_step_inline_keyboard
    )
    from bot_code.config import settings
except ModuleNotFoundError:
    from states.states import BookingState
    from data.trips import TRIPS_CATALOG, get_trip_date
    from keyboards.inline import (
        get_contact_share_reply_keyboard,
        get_contact_step_inline_keyboard
    )
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="booking_router")

SEAT_DESCRIPTIONS = {
    "1": "💺 Місце 1 (1-й ряд біля водія, Панорамне +5€)",
    "2": "💺 Місце 2 (1-й ряд біля водія, Вікно +5€)",
    "3": "💺 Місце 3 (2-й ряд, ліве вікно +5€)",
    "4": "💺 Місце 4 (2-й ряд, центр +5€)",
    "5": "💺 Місце 5 (2-й ряд, праве вікно +5€)",
    "6": "💺 Місце 6 (3-й ряд, ліве вікно +5€)",
    "7": "💺 Місце 7 (3-й ряд, центр 0€)",
    "8": "💺 Місце 8 (3-й ряд, праве вікно +5€)",
    "none": "🎲 Без вибору місця (вільна посадка 0€)"
}

def generate_booking_code() -> str:
    """Генерує номер броні у форматі SVOI-XXXX"""
    return f"SVOI-{random.randint(1000, 9999)}"

@router.callback_query(F.data.startswith("cb_pax_"))
async def process_pax_chosen(callback: CallbackQuery, state: FSMContext):
    """
    Крок 2 ➔ Крок 3 воронки бронювання в 1-2 кліки:
    Після натискання [ 1 ], [ 2 ] або [ 3+ ] бот автоматично зчитує @username із профілю
    та пропонує кнопку 📱 Поділитися номером (request_contact=True) без ручного вводу цифр!
    """
    await callback.answer()
    raw = callback.data.replace("cb_pax_", "")
    parts = raw.split("_", 1)
    pax_code = parts[0] if len(parts) > 0 else "1"
    trip_id = parts[1] if len(parts) > 1 else "general"

    pax_count = 3 if pax_code == "3" else int(pax_code) if pax_code.isdigit() else 1
    pax_label = "3+ осіб" if pax_code == "3" else f"{pax_count} ос."

    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Європейський тур SVOI"
    trip_date = get_trip_date(trip_id) if trip else "Найближчий виїзд"
    base_price = trip["price"] if trip else 120
    total_cost = base_price * pax_count

    user = callback.from_user
    username = user.username if user else None
    user_tag = f"@{username}" if username else "профіль Telegram"

    await state.update_data(
        trip_id=trip_id,
        trip_title=trip_title,
        trip_date=trip_date,
        pax_count=pax_count,
        pax_label=pax_label,
        seat_title=f"Група: {pax_label} (вільна посадка)",
        total_cost=total_cost
    )
    await state.set_state(BookingState.waiting_for_contact)

    step3_text = (
        f"📱 <b>Крок 3 із 3: Контакт для зв'язку в 1 клік</b>\n\n"
        f"• 🗺 <b>Напрямок:</b> {trip_title}\n"
        f"• 📅 <b>Дата:</b> {trip_date}\n"
        f"• 👥 <b>Кількість:</b> {pax_label}\n"
        f"• 💶 <b>Сума:</b> <b>{total_cost}€</b> (<code>0% передоплати</code>)\n"
        f"• 👤 <b>Ваш профіль:</b> <code>{user_tag}</code> (визначено автоматично!)\n\n"
        "<blockquote>👇 <b>Натисніть кнопку «✅ Підтвердити заявку» нижче</b> АБО поділіться номером через кнопку <b>«📱 Поділитися номером»</b> унизу екрана — жодних цифр вводити вручну не потрібно!</blockquote>"
    )

    inline_kb = get_contact_step_inline_keyboard(trip_id, pax_code, username=username)

    if callback.message:
        try:
            await callback.message.edit_text(text=step3_text, reply_markup=inline_kb, parse_mode="HTML")
        except TelegramBadRequest:
            await callback.message.answer(text=step3_text, reply_markup=inline_kb, parse_mode="HTML")

        # Одночасно показуємо нативну кнопку Telegram request_contact=True
        try:
            await callback.message.answer(
                text="👇 <i>Або натисніть кнопку нижче, щоб передати номер телефону в 1 дотик:</i>",
                reply_markup=get_contact_share_reply_keyboard(),
                parse_mode="HTML"
            )
        except Exception as e:
            logger.debug("Не вдалося показати reply_markup request_contact: %s", e)

@router.callback_query(F.data.startswith("cb_fast_confirm_"))
async def process_fast_confirm(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Миттєве оформлення заявки в 1 клік за автоматично зчитаним @username профілю користувача
    """
    await callback.answer("🎉 Заявку успішно оформлено!")
    raw = callback.data.replace("cb_fast_confirm_", "")
    parts = raw.split("_", 1)
    pax_code = parts[0] if len(parts) > 0 else "1"
    trip_id = parts[1] if len(parts) > 1 else "general"

    data = await state.get_data()
    pax_count = 3 if pax_code == "3" else int(pax_code) if pax_code.isdigit() else 1
    pax_label = data.get("pax_label") or ("3+ осіб" if pax_code == "3" else f"{pax_count} ос.")

    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = data.get("trip_title") or (trip["title"] if trip else "Індивідуальний європейський маршрут")
    trip_date = data.get("trip_date") or (get_trip_date(trip_id) if trip else "Найближчий виїзд")
    duration = trip["duration"] if trip else "1 день"
    base_price = trip["price"] if trip else 120
    total_cost = data.get("total_cost") or (base_price * pax_count)
    seat_title = data.get("seat_title") or f"Кількість: {pax_label}"
    booking_code = generate_booking_code()

    user = callback.from_user
    user_name = user.full_name if user else "Шановний мандрівник"
    user_mention = f"@{user.username}" if user and user.username else f"ID:{user.id if user else 0}"
    user_id = user.id if user else 0

    await state.clear()
    await send_booking_confirmation(
        callback_or_msg=callback,
        bot=bot,
        booking_code=booking_code,
        user_name=user_name,
        user_mention=user_mention,
        user_id=user_id,
        phone_str="Через @username профілю",
        trip_title=f"{trip_title} ({trip_date})",
        duration=duration,
        seat_title=seat_title,
        total_cost=total_cost
    )

@router.message(F.contact)
async def process_shared_contact(message: Message, state: FSMContext, bot: Bot):
    """
    Обробка натискання кнопки 📱 Поділитися номером (request_contact=True).
    Жодного ручного набору цифр!
    """
    contact = message.contact
    phone_number = contact.phone_number if contact else "Не вказано"
    if not phone_number.startswith("+"):
        phone_number = f"+{phone_number}"

    data = await state.get_data()
    trip_id = data.get("trip_id", "paris")
    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = data.get("trip_title") or (trip["title"] if trip else "Тур SVOI Travel")
    trip_date = data.get("trip_date") or get_trip_date(trip_id)
    pax_label = data.get("pax_label", "1 ос.")
    seat_title = data.get("seat_title", f"Кількість: {pax_label}")
    duration = trip["duration"] if trip else "1 день"
    total_cost = data.get("total_cost") or (trip["price"] if trip else 120)
    booking_code = generate_booking_code()

    user = message.from_user
    user_name = user.full_name if user else "Шановний мандрівник"
    user_mention = f"@{user.username}" if user and user.username else "без юзернейму"
    user_id = user.id if user else 0

    await state.clear()
    # Прибираємо нижню клавіатуру з кнопкою контакту, щоб чат залишався чистим
    await message.answer(
        "✅ <b>Номер телефону отримано! Оформлюємо вашу бронь...</b>",
        reply_markup=ReplyKeyboardRemove(),
        parse_mode="HTML"
    )

    await send_booking_confirmation(
        callback_or_msg=message,
        bot=bot,
        booking_code=booking_code,
        user_name=user_name,
        user_mention=user_mention,
        user_id=user_id,
        phone_str=phone_number,
        trip_title=f"{trip_title} ({trip_date})",
        duration=duration,
        seat_title=seat_title,
        total_cost=total_cost
    )

@router.callback_query(F.data.startswith("cb_seat_"))
async def process_seat_chosen(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Система бронювання з вибором конкретного крісла (1–8) в салоні Opel Vivaro.
    Автоматично переводить на Крок 3 (підтвердження контакту в 1 клік).
    """
    await callback.answer()
    parts = callback.data.split("_")
    seat_id = parts[2] if len(parts) > 2 else "none"
    trip_id = "_".join(parts[3:]) if len(parts) > 3 else "general"

    seat_title = SEAT_DESCRIPTIONS.get(seat_id, "🎲 Вільна посадка (0€)")
    seat_fee = 0 if seat_id in ("none", "7") else 5

    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Індивідуальний європейський маршрут"
    trip_date = get_trip_date(trip_id) if trip else "Найближчий виїзд"
    base_price = trip["price"] if trip else 120
    total_cost = base_price + seat_fee

    user = callback.from_user
    username = user.username if user else None
    user_tag = f"@{username}" if username else "профіль Telegram"

    await state.update_data(
        trip_id=trip_id,
        trip_title=trip_title,
        trip_date=trip_date,
        pax_count=1,
        pax_label="1 ос.",
        seat_title=seat_title,
        total_cost=total_cost
    )
    await state.set_state(BookingState.waiting_for_contact)

    step3_text = (
        f"📱 <b>Крок 3 із 3: Підтвердження броні в 1 клік</b>\n\n"
        f"• 🗺 <b>Напрямок:</b> {trip_title} ({trip_date})\n"
        f"• 💺 <b>Місце:</b> {seat_title}\n"
        f"• 💶 <b>Разом до оплати:</b> <b>{total_cost}€</b> (<code>0% передоплати</code>)\n"
        f"• 👤 <b>Ваш профіль:</b> <code>{user_tag}</code>\n\n"
        "<blockquote>👇 Натисніть <b>«✅ Підтвердити заявку»</b> або поділіться номером через кнопку <b>«📱 Поділитися номером»</b>!</blockquote>"
    )
    inline_kb = get_contact_step_inline_keyboard(trip_id, "1", username=username)

    if callback.message:
        try:
            await callback.message.edit_text(text=step3_text, reply_markup=inline_kb, parse_mode="HTML")
        except TelegramBadRequest:
            await callback.message.answer(text=step3_text, reply_markup=inline_kb, parse_mode="HTML")

        try:
            await callback.message.answer(
                text="👇 <i>Або натисніть кнопку нижче, щоб передати номер телефону в 1 дотик:</i>",
                reply_markup=get_contact_share_reply_keyboard(),
                parse_mode="HTML"
            )
        except Exception:
            pass

async def send_booking_confirmation(
    callback_or_msg: CallbackQuery | Message,
    bot: Bot,
    booking_code: str,
    user_name: str,
    user_mention: str,
    user_id: int,
    phone_str: str,
    trip_title: str,
    duration: str,
    seat_title: str,
    total_cost: int
):
    """Формує фінальне підтвердження туристу (в тому ж вікні) та надсилає сповіщення адміну"""
    manager_message = (
        f"Вітаю! Моя бронь #{booking_code}. Тур: {trip_title}, {seat_title}, сума: {total_cost}€."
    )
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text={quote(manager_message)}"

    confirmation_text = (
        f"🎉 <b>ЗАЯВКУ #{booking_code} УСПІШНО ЗАФІКСОВАНО!</b>\n\n"
        f"Дякуємо, <b>{user_name}</b>! Ваше бронювання в клубі <b>SVOI Travel</b> прийнято.\n\n"
        f"📋 <b>Деталі поїздки:</b>\n"
        f"• 🗺 <b>Напрямок та дата:</b> {trip_title}\n"
        f"• 💺 <b>Формат / Місця:</b> {seat_title}\n"
        f"• 👤 <b>Контакт:</b> {user_mention} ({phone_str})\n"
        f"• 💳 <b>До сплати при посадці:</b> <b>{total_cost}€</b>\n\n"
        "<blockquote>💡 <b>0% передоплати</b> на одноденні поїздки! Точний час подачі Opel Vivaro до вашого будинку надійде за день увечері перед виїздом.</blockquote>"
    )

    user_markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💬 Написати менеджеру в Telegram", url=manager_url)
            ],
            [
                InlineKeyboardButton(text="🗺 Інші напрямки", callback_data="cb_trips"),
                InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
            ]
        ]
    )

    if isinstance(callback_or_msg, CallbackQuery) and callback_or_msg.message:
        try:
            await callback_or_msg.message.edit_text(
                text=confirmation_text,
                reply_markup=user_markup,
                parse_mode="HTML"
            )
        except TelegramBadRequest:
            await callback_or_msg.message.answer(
                text=confirmation_text,
                reply_markup=user_markup,
                parse_mode="HTML"
            )
    elif isinstance(callback_or_msg, Message):
        await callback_or_msg.answer(
            text=confirmation_text,
            reply_markup=user_markup,
            parse_mode="HTML"
        )

    admin_notification = (
        f"🚨 <b>НОВА ЗАЯВКА В 1 КЛІК #{booking_code}</b> 🚨\n\n"
        f"👤 <b>Турист:</b> {user_name} ({user_mention})\n"
        f"📱 <b>Телефон:</b> <code>{phone_str}</code>\n"
        f"🆔 <b>Telegram ID:</b> <code>{user_id}</code>\n"
        f"🔗 <a href=\"tg://user?id={user_id}\">Відкрити профіль туриста</a>\n\n"
        f"🗺 <b>Тур:</b> {trip_title} ({duration})\n"
        f"💺 <b>Деталі місць:</b> {seat_title}\n"
        f"💵 <b>Сума:</b> <b>{total_cost}€</b>"
    )

    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_notification,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не вдалося відправити заявку адміну: %s", e)

@router.message(F.web_app_data)
async def process_web_app_data(message: Message, bot: Bot):
    """
    Обробник даних, переданих із Telegram Mini App через Telegram.WebApp.sendData()
    """
    try:
        raw_data = message.web_app_data.data if message.web_app_data else "{}"
        data = json.loads(raw_data)
        user = message.from_user
        trip_title = data.get("trip", "Тур SVOI Travel")
        seat_name = data.get("seat", "Вільна посадка")
        total_price = data.get("total", 0)
        code = data.get("code", f"SVOI-MINI-{random.randint(1000, 9999)}")
        user_name = user.full_name if user else "Клієнт"
        user_mention = f"@{user.username}" if user and user.username else "без юзернейму"

        confirm_text = (
            "🎉 <b>ЗАЯВКУ З MINI APP УСПІШНО ПРИЙНЯТО!</b> 🌌✨\n\n"
            f"🏷 Номер замовлення: <code>{code}</code>\n"
            f"🗺 Обраний тур: <b>{trip_title}</b>\n"
            f"💺 Місце в салоні: <b>{seat_name}</b>\n"
            f"💵 До сплати при посадці: <b>{total_price}€</b> (<code>0% передоплати</code>!)\n\n"
            "<blockquote>Менеджер клубу SVOI вже зафіксував бронь та напише вам за день увечері перед виїздом з точним часом посадки!</blockquote>"
        )
        user_markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}")],
                [InlineKeyboardButton(text="🗺 Інші тури", callback_data="cb_trips"), InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
            ]
        )
        await message.answer(confirm_text, reply_markup=user_markup, parse_mode="HTML")

        admin_text = (
            "🚨 <b>НОВЕ БРОНЮВАННЯ ЧЕРЕЗ TELEGRAM MINI APP!</b> 📱\n\n"
            f"🏷 Код замовлення: <code>{code}</code>\n"
            f"👤 Клієнт: <b>{user_name}</b> ({user_mention})\n"
            f"🆔 Telegram ID: <code>{user.id if user else 0}</code>\n"
            f"🗺 Напрямок: <b>{trip_title}</b>\n"
            f"💺 Місце: <b>{seat_name}</b>\n"
            f"💰 Сума: <b>{total_price}€</b>"
        )
        if settings.ADMIN_ID and settings.ADMIN_ID != 0:
            await bot.send_message(chat_id=settings.ADMIN_ID, text=admin_text, parse_mode="HTML")
    except Exception as e:
        logger.error("Помилка обробки web_app_data: %s", e)
