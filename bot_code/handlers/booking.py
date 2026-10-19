import json
import logging
import random
from urllib.parse import quote
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.states.states import BookingState
    from bot_code.data.trips import TRIPS_CATALOG
    from bot_code.config import settings
except ModuleNotFoundError:
    from states.states import BookingState
    from data.trips import TRIPS_CATALOG
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="booking_router")

SEAT_DESCRIPTIONS = {
    "1": "💺 Місце 1 (1-й ряд, поруч з водієм, центр)",
    "2": "💺 Місце 2 (1-й ряд, поруч з водієм, вікно)",
    "3": "💺 Місце 3 (2-й ряд, біля вікна ліворуч)",
    "4": "💺 Місце 4 (2-й ряд, центр)",
    "5": "💺 Місце 5 (2-й ряд, біля вікна праворуч)",
    "6": "💺 Місце 6 (3-й ряд, біля вікна ліворуч)",
    "7": "💺 Місце 7 (3-й ряд, центр)",
    "8": "💺 Місце 8 (3-й ряд, біля вікна праворуч)",
    "none": "🎲 Без вибору місця (вільна посадка)"
}

def generate_booking_code() -> str:
    """Генерує номер броні у форматі SVOI-XXXX"""
    return f"SVOI-{random.randint(1000, 9999)}"

@router.callback_query(F.data.startswith("cb_seat_"))
async def process_seat_chosen(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Система бронювання з вибором місця по порядку (всього 8 місць):
    1-й ряд: 2 місця поруч з водієм
    2-й ряд: 3 місця
    3-й ряд: 3 місця
    Фіксація конкретного місця — 5€, вільна посадка — 0€.
    Бронь БЕЗ ПЕРЕДОПЛАТИ на одноденні тури (оплата при посадці).
    Передоплата лише для кількаденних турів для готелів.
    """
    await callback.answer()
    parts = callback.data.split("_")
    seat_id = parts[2] if len(parts) > 2 else "none"
    trip_id = parts[3] if len(parts) > 3 else "general"

    seat_title = SEAT_DESCRIPTIONS.get(seat_id, "🎲 Вільна посадка")
    seat_fee = 0 if seat_id == "none" else 5

    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Індивідуальний європейський маршрут"
    duration = trip["duration"] if trip else "1 день"
    base_price = trip["price"] if trip else 120
    total_cost = base_price + seat_fee
    booking_code = generate_booking_code()

    user = callback.from_user
    user_name = user.full_name if user else "Шановний мандрівник"
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейму"
    user_id = user.id if user else 0

    # Посилання на менеджера із заповненим текстом
    manager_message = f"Вітаю! Мій номер броні: #{booking_code}. Тур: {trip_title}, місце: {seat_title}, до оплати: {total_cost}€."
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text={quote(manager_message)}"

    payment_note = (
        "🔥 <b>Бронь БЕЗ ПЕРЕДОПЛАТИ!</b> Повна оплата здійснюється при посадці в мінівен.\n\n"
        if duration == "1 день" else
        "🏨 <i>Передоплата потрібна лише для фіксації номерів у готелі.</i>\n\n"
    )

    # 1. Персоналізоване підтвердження для туриста
    confirmation_text = (
        f"🎉 <b>ПІДТВЕРДЖЕННЯ БРОНЮВАННЯ #{booking_code}</b>\n\n"
        f"Вітаємо, <b>{user_name}</b>! Вашу заявку в туристичний клуб <b>SVOI</b> успішно зафіксовано.\n\n"
        f"📋 <b>Деталі поїздки:</b>\n"
        f"• 🗺 <b>Напрямок:</b> {trip_title}\n"
        f"• ⏱ <b>Тривалість:</b> {duration}\n"
        f"• 🚐 <b>Транспорт:</b> Мінівен Opel Vivaro (8 пасажирських місць, клімат-контроль)\n"
        f"• 💺 <b>Обране місце:</b> {seat_title}\n"
        f"• 📍 <b>Точка збору:</b> Саарланд, Люксембург або Трір (збір за адресою пасажира)\n\n"
        f"🧾 <b>Розрахунок вартості:</b>\n"
        f"• Базовий квиток туру: <b>{base_price}€</b>\n"
        f"• Вибір конкретного місця: <b>+{seat_fee}€</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💳 <b>РАЗОМ ДО ОПЛАТИ: {total_cost}€</b>\n"
        f"{payment_note}"
        f"📌 <b>Умови поїздки:</b>\n"
        f"✓ Закордонний паспорт + дійсний ВНЖ / шенгенська віза\n"
        f"✓ <b>Мед. страховка</b> (обов'язкова для людей без ВНЖ в Європі)\n"
        f"✓ <b>Багаж:</b> 10 кг при далеких поїздках + ручна поклажа в салон\n\n"
        f"👉 <b>Наступний крок:</b> Натисніть кнопку нижче для відправлення даних менеджеру "
        f"@{settings.MANAGER_USERNAME.lstrip('@')} в Telegram:"
    )

    user_markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💬 Надіслати бронь менеджеру в Telegram", url=manager_url)
            ],
            [
                InlineKeyboardButton(text="📍 Точки збору", callback_data="cb_meeting"),
                InlineKeyboardButton(text="❓ Часті питання (FAQ)", callback_data="cb_faq")
            ],
            [
                InlineKeyboardButton(text="🗺 Інші тури", callback_data="cb_trips"),
                InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")
            ]
        ]
    )

    try:
        if callback.message:
            await callback.message.edit_text(
                text=confirmation_text,
                reply_markup=user_markup,
                parse_mode="HTML"
            )
    except TelegramBadRequest as e:
        logger.warning("Помилка оновлення броні: %s", e)

    # 2. Сповіщення адміністратору
    admin_notification = (
        f"🚨 <b>НОВА ЗАЯВКА НА БРОНЮВАННЯ #{booking_code}</b> 🚨\n\n"
        f"👤 <b>Турист:</b> {user_name} ({user_mention})\n"
        f"🆔 <b>Telegram ID:</b> <code>{user_id}</code>\n"
        f"🔗 <b>Контакт:</b> <a href=\"tg://user?id={user_id}\">Написати туристу</a>\n\n"
        f"🗺 <b>Тур:</b> {trip_title} ({duration})\n"
        f"💺 <b>Місце:</b> {seat_title}\n"
        f"💵 <b>Сума до оплати:</b> <b>{total_cost}€</b> (тур: {base_price}€, вибір місця: +{seat_fee}€)\n"
        f"📍 <b>Посадка:</b> Саарбрюккен Hbf\n"
        f"💳 <b>Передоплата:</b> {'БЕЗ ПЕРЕДОПЛАТИ (оплата при посадці)' if duration == '1 день' else 'Готель (потрібна передоплата)'}"
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

        # 1. Відповідь клієнту в чат бота
        confirm_text = (
            "🎉 <b>ЗАЯВКУ З MINI APP УСПІШНО ПРИЙНЯТО!</b> 🌌✨\n\n"
            f"🏷 Номер замовлення: <code>{code}</code>\n"
            f"🗺 Обраний тур: <b>{trip_title}</b>\n"
            f"💺 Місце в салоні: <b>{seat_name}</b>\n"
            f"💵 До сплати при посадці: <b>{total_price}€</b> (0% передоплати!)\n\n"
            "Менеджер клубу SVOI вже зафіксував бронь та напише вам за день увечері перед виїздом з точним часом посадки!"
        )
        user_markup = InlineKeyboardMarkup(
            inline_keyboard=[
                [InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}")],
                [InlineKeyboardButton(text="🗺 Інші тури", callback_data="cb_trips"), InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
            ]
        )
        await message.answer(confirm_text, reply_markup=user_markup, parse_mode="HTML")

        # 2. Сповіщення адміністратору
        admin_text = (
            "🚨 <b>НОВЕ БРОНЮВАННЯ ЧЕРЕЗ TELEGRAM MINI APP!</b> 📱\n\n"
            f"🏷 Код замовлення: <code>{code}</code>\n"
            f"👤 Клієнт: <b>{user_name}</b> ({user_mention})\n"
            f"🆔 Telegram ID: <code>{user.id if user else 0}</code>\n"
            f"🗺 Напрямок: <b>{trip_title}</b>\n"
            f"💺 Місце: <b>{seat_name}</b>\n"
            f"💰 Сума: <b>{total_price}€</b>\n"
            "💳 <b>0% передоплати</b> (оплата водієві при посадці)"
        )
        if settings.ADMIN_ID and settings.ADMIN_ID != 0:
            await bot.send_message(chat_id=settings.ADMIN_ID, text=admin_text, parse_mode="HTML")
    except Exception as e:
        logger.error("Помилка обробки web_app_data: %s", e)

