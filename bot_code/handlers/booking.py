import logging
import random
from urllib.parse import quote
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest

from bot_code.states.states import BookingState
from bot_code.data.trips import TRIPS_CATALOG
from bot_code.config import settings

logger = logging.getLogger(__name__)
router = Router(name="booking_router")

SEAT_DESCRIPTIONS = {
    "1": "💺 Место 1 (1-й ряд, рядом с водителем, центр)",
    "2": "💺 Место 2 (1-й ряд, рядом с водителем, окно)",
    "3": "💺 Место 3 (2-й ряд, у окна слева)",
    "4": "💺 Место 4 (2-й ряд, центр)",
    "5": "💺 Место 5 (2-й ряд, у окна справа)",
    "6": "💺 Место 6 (3-й ряд, у окна слева)",
    "7": "💺 Место 7 (3-й ряд, центр)",
    "8": "💺 Место 8 (3-й ряд, у окна справа)",
    "none": "🎲 Без выбора места (свободная посадка)"
}

def generate_booking_code() -> str:
    """Генерирует номер брони в формате SVOI-XXXX"""
    return f"SVOI-{random.randint(1000, 9999)}"

@router.callback_query(F.data.startswith("cb_seat_"))
async def process_seat_chosen(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Система бронирования с выбором интерактивного места по порядку (всего 8 мест):
    1-й ряд: 2 места рядом с водителем
    2-й ряд: 3 места
    3-й ряд: 3 места
    Фиксация конкретного места — 5€, свободная посадка — 0€.
    Бронь БЕЗ ПРЕДОПЛАТЫ на однодневные туры (оплата при посадке).
    Предоплата только при поездках на несколько дней для отелей.
    """
    await callback.answer()
    parts = callback.data.split("_")
    # cb_seat_{seat_id}_{trip_id}
    seat_id = parts[2] if len(parts) > 2 else "none"
    trip_id = parts[3] if len(parts) > 3 else "general"

    seat_title = SEAT_DESCRIPTIONS.get(seat_id, "🎲 Свободная посадка")
    seat_fee = 0 if seat_id == "none" else 5

    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Индивидуальный европейский маршрут"
    duration = trip["duration"] if trip else "1 день"
    base_price = trip["price"] if trip else 120
    total_cost = base_price + seat_fee
    booking_code = generate_booking_code()

    user = callback.from_user
    user_name = user.full_name if user else "Уважаемый путешественник"
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейма"
    user_id = user.id if user else 0

    # Ссылка на менеджера с предзаполненным текстом
    manager_message = f"Здравствуйте! Мой номер брони: #{booking_code}. Тур: {trip_title}, место: {seat_title}, к оплате: {total_cost}€."
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text={quote(manager_message)}"

    payment_note = (
        "🔥 <b>Бронь БЕЗ ПРЕДОПЛАТЫ!</b> Полная оплата производится при посадке в минивэн.\n\n"
        if duration == "1 день" else
        "🏨 <i>Предоплата требуется только для фиксации номеров в отеле.</i>\n\n"
    )

    # 1. Персонализированное подтверждение для туриста
    confirmation_text = (
        f"🎉 <b>ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ #{booking_code}</b>\n\n"
        f"Здравствуйте, <b>{user_name}</b>! Ваша заявка в туристический клуб <b>SVOI</b> успешно зафиксирована.\n\n"
        f"📋 <b>Детали поездки:</b>\n"
        f"• 🗺 <b>Направление:</b> {trip_title}\n"
        f"• ⏱ <b>Длительность:</b> {duration}\n"
        f"• 🚐 <b>Транспорт:</b> Минивэн Opel Vivaro (8 пассажирских мест, кондиционер)\n"
        f"• 💺 <b>Выбранное место:</b> {seat_title}\n"
        f"• 📍 <b>Точка сбора:</b> Саарбрюккен Hbf (или подсадка по пути)\n\n"
        f"🧾 <b>Расчет стоимости:</b>\n"
        f"• Базовый билет тура: <b>{base_price}€</b>\n"
        f"• Выбор конкретного места: <b>+{seat_fee}€</b>\n"
        f"━━━━━━━━━━━━━━━━━━\n"
        f"💳 <b>ИТОГО К ОПЛАТЕ: {total_cost}€</b>\n"
        f"{payment_note}"
        f"📌 <b>Условия поездки:</b>\n"
        f"✓ Загранпаспорт + действующий ВНЖ / шенгенская виза\n"
        f"✓ <b>Мед. страховка</b> (обязательна для людей без ВНЖ в Европе)\n"
        f"✓ <b>Багаж:</b> 10 кг при дальних поездках + ручная кладь в салон\n\n"
        f"👉 <b>Следующий шаг:</b> Нажмите кнопку ниже для отправки данных менеджеру "
        f"@{settings.MANAGER_USERNAME.lstrip('@')} в Telegram:"
    )

    user_markup = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💬 Отправить бронь менеджеру в Telegram", url=manager_url)
            ],
            [
                InlineKeyboardButton(text="📍 Точки сбора", callback_data="cb_meeting"),
                InlineKeyboardButton(text="❓ Частые вопросы (FAQ)", callback_data="cb_faq")
            ],
            [
                InlineKeyboardButton(text="🗺 Другие туры", callback_data="cb_trips"),
                InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")
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
        logger.warning("Ошибка обновления брони: %s", e)

    # 2. Уведомление администратору
    admin_notification = (
        f"🚨 <b>НОВАЯ ЗАЯВКА НА БРОНИРОВАНИЕ #{booking_code}</b> 🚨\n\n"
        f"👤 <b>Турист:</b> {user_name} ({user_mention})\n"
        f"🆔 <b>Telegram ID:</b> <code>{user_id}</code>\n"
        f"🔗 <b>Контакт:</b> <a href=\"tg://user?id={user_id}\">Написать туристу</a>\n\n"
        f"🗺 <b>Тур:</b> {trip_title} ({duration})\n"
        f"💺 <b>Место:</b> {seat_title}\n"
        f"💵 <b>Сумма к оплате:</b> <b>{total_cost}€</b> (тур: {base_price}€, выбор места: +{seat_fee}€)\n"
        f"📍 <b>Посадка:</b> Саарбрюккен Hbf\n"
        f"💳 <b>Предоплата:</b> {'БЕЗ ПРЕДОПЛАТЫ (оплата при посадке)' if duration == '1 день' else 'Отель (требуется предоплата)'}"
    )

    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_notification,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось уведомить админа: %s", e)

    await state.clear()
