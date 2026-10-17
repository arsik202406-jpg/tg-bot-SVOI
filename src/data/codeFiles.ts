import { PythonCodeFile } from '../types';

export const BOT_CODE_FILES: PythonCodeFile[] = [
  {
    name: 'bot.py',
    path: 'bot.py',
    language: 'python',
    description: 'Главная точка входа. Инициализирует Bot, Dispatcher, подключает роутеры и запускает Polling.',
    content: `import asyncio
import logging
import os
import sys
from pathlib import Path

# Гарантируем, что папка бота и родительская папка добавлены в sys.path
CURRENT_DIR = Path(__file__).resolve().parent
PARENT_DIR = CURRENT_DIR.parent
for p in [str(CURRENT_DIR), str(PARENT_DIR)]:
    if p not in sys.path:
        sys.path.insert(0, p)

from aiohttp import web
from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage

try:
    from bot_code.config import settings
    from bot_code.handlers import menu, trips, feedback, booking, faq, games
except ModuleNotFoundError:
    from config import settings
    from handlers import menu, trips, feedback, booking, faq, games

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("svoi_travel_bot")

async def start_health_server():
    """Запуск легкого HTTP-сервера для совместимости с Render Web Service (Health Check)"""
    try:
        port = int(os.environ.get("PORT", 10000))
        app = web.Application()

        async def health_check(_request):
            return web.Response(text="SVOI Travel Bot is active and running! 🌍", status=200)

        app.router.add_get("/", health_check)
        app.router.add_get("/health", health_check)

        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", port)
        await site.start()
        logger.info("🌐 Health Check сервер запущен на порту %d", port)
    except Exception as e:
        logger.warning("Health Check сервер: %s", e)

async def main():
    logger.info("🚀 Запуск Telegram-бота SVOI Travel (@%s)...", settings.BOT_USERNAME)

    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )
    dp = Dispatcher(storage=MemoryStorage())

    dp.include_router(menu.router)
    dp.include_router(trips.router)
    dp.include_router(feedback.router)
    dp.include_router(booking.router)
    dp.include_router(faq.router)
    dp.include_router(games.router)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        bot_info = await bot.get_me()
        logger.info("✅ Успешное подключение: %s (@%s)", bot_info.first_name, bot_info.username)
        
        await start_health_server()
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical("❌ Ошибка при запуске: %s", e, exc_info=True)
    finally:
        logger.info("🛑 Остановка сессии бота...")
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен.")
`
  },
  {
    name: 'config.py',
    path: 'config.py',
    language: 'python',
    description: 'Настройки и переменные окружения через pydantic-settings.',
    content: `import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    BOT_TOKEN: str = Field(default="8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM")
    ADMIN_ID: int = Field(default=8450153980, description="Telegram ID админа для заявок и фидбека")
    MANAGER_USERNAME: str = Field(default="SVOI_travel_admin")
    BOT_USERNAME: str = Field(default="Svoi_TravelEU_bot")
    CHANNEL_URL: str = Field(default="https://t.me/+Flt_2r6vi3U4ZDg6")
    GROUP_URL: str = Field(default="https://t.me/+J50liyDUHPgzYTQy")

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )

settings = Settings()
`
  },
  {
    name: 'handlers/menu.py',
    path: 'handlers/menu.py',
    language: 'python',
    description: 'Обработчики главного меню, команды /start, автопарка, условий, партнеров и точек сбора.',
    content: `import logging
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from aiogram.exceptions import TelegramBadRequest

from keyboards.inline import (
    get_main_menu_keyboard,
    get_back_keyboard,
    get_seats_keyboard
)
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="menu_router")

MAIN_MENU_TEXT = (
    "🌟 <b>Добро пожаловать в туристический клуб SVOI!</b> 🌍✨\\n\\n"
    "Мы организуем душевные и продуманные поездки по самым красивым уголкам Европы "
    "на комфортабельном минивэне Opel Vivaro без стресса, спешки и языковых барьеров!\\n\\n"
    "✨ <b>Почему выбирают SVOI:</b>\\n"
    "• 🚐 <i>Комфорт в дороге:</i> 8-местный минивэн с кондиционером, регулируемыми сиденьями и USB\\n"
    "• 📍 <i>Удобный старт:</i> отправление из Саарбрюккена + подсадка по пути\\n"
    "• 👨‍✈️ <i>Опытные водители и дружелюбная атмосфера</i>\\n"
    "• 👥 <i>Маленькие душевные группы</i> (до 7-8 человек)\\n\\n"
    "👇 <b>Выберите интересующий раздел в меню:</b>"
)

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Обработчик команды /start"""
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "cb_back")
async def process_back_to_menu(callback: CallbackQuery):
    """Возврат в главное меню без дублирования сообщений (через edit_text)"""
    await callback.answer()
    try:
        if callback.message:
            await callback.message.edit_text(
                text=MAIN_MENU_TEXT,
                reply_markup=get_main_menu_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            logger.warning("Ошибка при возврате: %s", e)

@router.callback_query(F.data == "cb_car")
async def process_car_info(callback: CallbackQuery):
    """Информация об автопарке клуба SVOI: минивэн Opel Vivaro"""
    await callback.answer()
    car_text = (
        "🚐 <b>Наш минивэн: Opel Vivaro (8 пассажирских мест)</b> 🚗\\n\\n"
        "Мы заботимся о том, чтобы дорога была легкой и приятной!\\n\\n"
        "💺 <b>Схема мест в салоне (всего 8 мест):</b>\\n"
        "• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\\n"
        "• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\\n"
        "• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\\n\\n"
        "🌟 <b>Оснащение и удобства:</b>\\n"
        "• 💺 <b>Удобные сиденья:</b> индивидуальные ремни, откидные спинки для сна в пути\\n"
        "• 📏 <b>Пространство для ног:</b> свободно даже для высокого роста\\n"
        "• ❄️🔥 <b>Кондиционер и отопление салона</b>\\n"
        "• ⚡️ <b>Зарядка телефонов:</b> USB-порты у пассажирских мест\\n"
        "• 🧳 <b>Багажное отделение:</b> 10 кг при дальних поездках + ручная кладь в салон\\n"
        "• 🧼 <b>Чистота:</b> регулярная влажная уборка перед каждым рейсом\\n\\n"
        "<i>Вы можете зафиксировать конкретное место при бронировании (+5€) или занять свободное при посадке (0€).</i>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=car_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_meeting")
async def process_meeting_points(callback: CallbackQuery):
    """Информация о точках сбора и логистике"""
    await callback.answer()
    meeting_text = (
        "📍 <b>Точки сбора пассажиров & Логистика клуба SVOI</b> 🗺\\n\\n"
        "🏡 <b>Сбор и развоз по адресу (Door-to-Door):</b>\\n"
        "• <b>Забираем всех прямо по адресу</b> по земле <b>Саарланд (Saarland)</b>, в <b>Трире (Trier)</b> и <b>Люксембурге (Luxembourg)</b>!\\n"
        "• Развозим также обратно прямо по адресу.\\n\\n"
        "🛣 <b>Сбор в других землях и возможность подсадки:</b>\\n"
        "Можем забрать и в других землях — это зависит от маршрута (по пути или нет) или же если не однодневный тур.\\n"
        "👉 <b>При наличии от 4-х человек можем забрать с других земель!</b>\\n\\n"
        "Города и условия подсадки:\\n"
        "• <b>Хомбург (Homburg Saar)</b> — уточняйте\\n"
        "• <b>Кайзерслаутерн (Kaiserslautern)</b> — возможен если более 4х человек и не однодневный тур\\n"
        "• <b>Мангейм / Людвигсхафен (Mannheim)</b> — возможен если более 4х человек и не однодневный тур\\n"
        "• <b>Франкфурт-на-Майне (Frankfurt am Main)</b> — возможен если более 4х человек и не однодневный тур\\n"
        "• <b>Карлсруэ (Karlsruhe)</b> — для южных направлений по пути\\n"
        "• <b>Страсбург (Strasbourg)</b> — по Франции и Швейцарии\\n"
        "• <b>Бельгия</b> — при поездках в Нормандию, Голландию и Париж\\n\\n"
        "💬 <i>Писать менеджеру для уточнения — возможность подсадки уточняйте: @SVOI_travel_admin</i>\\n\\n"
        "⏰ <b>Точное время подачи трансфера:</b>\\n"
        "Точное время, за которым за вами заедут, высылается <b>в личный чат за день вечером перед поездкой</b>.\\n\\n"
        "👥 <b>Связь с водителем и чат группы:</b>\\n"
        "Основные вопросы водителю и по поездке вы сможете задать в новосозданной однодневной группе для коммуникации группы. <b>Через день группа удаляется.</b>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=meeting_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )


@router.callback_query(F.data == "cb_terms")
async def process_terms(callback: CallbackQuery):
    """Условия поездок, правила отмены, документы"""
    await callback.answer()
    terms_text = (
        "📜 <b>Условия поездок туристического клуба SVOI</b> 📌\\n\\n"
        "🛂 <b>Необходимые документы:</b>\\n"
        "• Действующий заграничный паспорт\\n"
        "• Действующий ВНЖ (Aufenthaltstitel) или шенгенская виза\\n"
        "• 🏥 <b>Медицинская страховка:</b> Обязательна мед. туристическая страховка для людей без ВНЖ в Европе\\n\\n"
        "🧳 <b>Багаж:</b>\\n"
        "• <b>10 кг при дальних поездках</b> в багажный отсек + ручная кладь в салон авто\\n\\n"
        "💳 <b>Бронирование и оплата:</b>\\n"
        "• 🔥 <b>Бронь у нас БЕЗ ПРЕДОПЛАТЫ!</b> Оплата тура происходит при посадке в день выезда\\n"
        "• Предоплата требуется <b>ТОЛЬКО при поездках на несколько дней</b> для бронирования отелей\\n\\n"
        "🔄 <b>Правила отмены:</b>\\n"
        "• За 72+ часа до старта — перенос даты или отмена без удержаний\\n"
        "• Менее 24 часов — бронь можно передать другу\\n\\n"
        "🚭 <b>Курение в салоне строго запрещено.</b>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=terms_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_partner")
async def process_partner(callback: CallbackQuery):
    """Партнерская программа"""
    await callback.answer()
    partner_text = (
        "🤝 <b>Партнерская программа клуба SVOI</b> 💼\\n\\n"
        "1. <b>Приведи друзей:</b> компания от 4 человек получает скидку 10% каждому!\\n"
        "2. <b>Индивидуальный чартер:</b> аренда всего минивэна (8 мест) с водителем со скидкой 15%.\\n"
        "3. <b>Блогеры и гиды:</b> выгодное сотрудничество и бартер.\\n\\n"
        f"📩 <i>Связь с руководителем:</i> @{settings.MANAGER_USERNAME.lstrip('@')}"
    )
    if callback.message:
        await callback.message.edit_text(
            text=partner_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_book")
async def process_book_menu(callback: CallbackQuery):
    """Выбор места в салоне"""
    await callback.answer()
    seats_info = (
        "💺 <b>Выбор места в минивэне Opel Vivaro (8 пассажирских мест)</b>\\n\\n"
        "• 1-й ряд (рядом с водителем): 2 места\\n"
        "• 2-й ряд: 3 места\\n"
        "• 3-й ряд: 3 места\\n\\n"
        "💵 <b>Тариф:</b>\\n"
        "• Фиксация конкретного места по порядку: <b>+5€</b>\\n"
        "• Без выбора места (свободная посадка): <b>0€</b>\\n\\n"
        "👇 <i>Выберите место по порядку:</i>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=seats_info,
            reply_markup=get_seats_keyboard("general"),
            parse_mode="HTML"
        )
`
  },
  {
    name: 'handlers/trips.py',
    path: 'handlers/trips.py',
    language: 'python',
    description: 'Вывод списка всех туров в столбик, карточки туров и переход к бронированию.',
    content: `import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext

from data.trips import TRIPS_CATALOG
from keyboards.inline import (
    get_trips_keyboard,
    get_trip_detail_keyboard,
    get_seats_keyboard
)
from states.states import BookingState

logger = logging.getLogger(__name__)
router = Router(name="trips_router")

TRIPS_HEADER = (
    "🗺 <b>Актуальные направления и расписание туров SVOI</b> 🇪🇺✨\\n\\n"
    "Все поездки осуществляются из <b>Саарбрюккена</b> (с подсадкой по маршруту) "
    "на комфортабельном минивэне Opel Vivaro (8 мест).\\n\\n"
    "👇 <i>Нажмите на направление для просмотра программы и бронирования:</i>"
)

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery):
    """Выводит список направлений с ценами в столбик"""
    await callback.answer()
    if callback.message:
        await callback.message.edit_text(
            text=TRIPS_HEADER,
            reply_markup=get_trips_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_trip_"))
async def process_trip_detail(callback: CallbackQuery):
    """Выводит подробную карточку выбранного тура"""
    await callback.answer()
    trip_id = callback.data.replace("cb_trip_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не найден", show_alert=True)
        return

    if callback.message:
        await callback.message.edit_text(
            text=trip["description"],
            reply_markup=get_trip_detail_keyboard(trip_id),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_book_target_"))
async def process_book_target_trip(callback: CallbackQuery, state: FSMContext):
    """Переход к выбору места и бронированию конкретного тура"""
    await callback.answer()
    trip_id = callback.data.replace("cb_book_target_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Выбранный тур"
    
    await state.update_data(trip_id=trip_id, trip_title=trip_title)
    await state.set_state(BookingState.choosing_seat)

    text = (
        f"🎯 <b>Бронирование тура: {trip_title}</b>\\n\\n"
        "Выберите место в минивэне Opel Vivaro (8 мест):\\n"
        "• 1-й ряд (рядом с водителем): 2 места\\n"
        "• 2-й ряд: 3 места\\n"
        "• 3-й ряд: 3 места\\n\\n"
        "💵 <b>Условия:</b>\\n"
        "• Фиксация конкретного места: <b>+5€</b>\\n"
        "• Без выбора места (свободная посадка): <b>0€</b>\\n\\n"
        "👇 <i>Нажмите плашку нужного места:</i>"
    )

    if callback.message:
        await callback.message.edit_text(
            text=text,
            reply_markup=get_seats_keyboard(trip_id),
            parse_mode="HTML"
        )
`
  },
  {
    name: 'handlers/feedback.py',
    path: 'handlers/feedback.py',
    language: 'python',
    description: 'FSM машина состояний для сбора отзывов и предложений туристов с пересылкой в ADMIN_ID.',
    content: `import logging
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, Message
from aiogram.fsm.context import FSMContext

from states.states import FeedbackState
from keyboards.inline import get_cancel_feedback_keyboard, get_back_keyboard
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="feedback_router")

@router.callback_query(F.data == "cb_feedback")
async def process_feedback_start(callback: CallbackQuery, state: FSMContext):
    """Активирует состояние FSM (FeedbackState.waiting_for_text)"""
    await callback.answer()
    await state.set_state(FeedbackState.waiting_for_text)

    text = (
        "✍️ <b>Оставить отзыв или пожелание</b> 💌\\n\\n"
        "Напишите в ответном сообщении ваши мысли, пожелания по новым направлениям "
        "или впечатления от прошедших поездок.\\n\\n"
        "<i>Отправьте сообщение прямо в этот чат или нажмите «Отмена»:</i>"
    )

    if callback.message:
        await callback.message.edit_text(
            text=text,
            reply_markup=get_cancel_feedback_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_cancel_feedback")
async def process_cancel_feedback(callback: CallbackQuery, state: FSMContext):
    """Сброс состояния при отмене"""
    await callback.answer("Ввод отменен")
    await state.clear()
    from handlers.menu import MAIN_MENU_TEXT
    from keyboards.inline import get_main_menu_keyboard
    if callback.message:
        await callback.message.edit_text(
            text=MAIN_MENU_TEXT,
            reply_markup=get_main_menu_keyboard(),
            parse_mode="HTML"
        )

@router.message(FeedbackState.waiting_for_text)
async def process_feedback_received(message: Message, state: FSMContext, bot: Bot):
    """
    Принимает текст от пользователя, благодарит его,
    пересылает сообщение администратору (ADMIN_ID) и сбрасывает FSM.
    """
    feedback_text = message.text or message.caption or "(Медиа/стикер)"
    user = message.from_user
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейма"
    user_id = user.id if user else 0
    full_name = user.full_name if user else "Пользователь"

    # Сбрасываем состояние
    await state.clear()

    # Благодарность пользователю
    await message.answer(
        text=(
            "❤️ <b>Спасибо за ваше обращение!</b>\\n\\n"
            "Ваш отзыв успешно передан основателям туристического клуба SVOI. "
            "Мы читаем каждое сообщение!\\n\\n"
            "До встречи в новых путешествиях! 🚐✨"
        ),
        reply_markup=get_back_keyboard(),
        parse_mode="HTML"
    )

    # Уведомление администратору
    admin_notification = (
        "🔔 <b>НОВЫЙ ОТЗЫВ / ПОЖЕЛАНИЕ SVOI TRAVEL</b>\\n\\n"
        f"👤 <b>От:</b> {full_name} ({user_mention})\\n"
        f"🆔 <b>ID:</b> <code>{user_id}</code>\\n"
        f"💬 <b>Текст:</b>\\n{feedback_text}"
    )

    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_notification,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось отправить админу: %s", e)
    else:
        logger.info("ADMIN_ID не задан. Отзыв сохранен в лог: %s", admin_notification)
`
  },
  {
    name: 'handlers/booking.py',
    path: 'handlers/booking.py',
    language: 'python',
    description: 'Автоматическая система подтверждения бронирования с выбором 8 мест по порядку, расчетом цены и уведомлением админа.',
    content: `import logging
import random
from urllib.parse import quote
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.fsm.context import FSMContext

from data.trips import TRIPS_CATALOG
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="booking_router")

SEAT_DESCRIPTIONS = {
    "1": "💺 Место 1 (1-й ряд, рядом с водителем, центр)",
    "2": "💺 Место 2 (1-й ряд, рядом с водителем, окно)",
    "3": "💺 Место 3 (2-й ряд, у окна слева)",
    "4": "💺 Место 4 (2-й ряд, по центру)",
    "5": "💺 Место 5 (2-й ряд, у окна справа)",
    "6": "💺 Место 6 (3-й ряд, у окна слева)",
    "7": "💺 Место 7 (3-й ряд, по центру)",
    "8": "💺 Место 8 (3-й ряд, у окна справа)",
    "none": "🎲 Без выбора места (свободная посадка)"
}

def generate_booking_code() -> str:
    return f"SVOI-{random.randint(1000, 9999)}"

@router.callback_query(F.data.startswith("cb_seat_"))
async def process_seat_selection(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Автоматическая система подтверждения бронирования:
    Отправляет персонализированный чек-квитанцию туристу с расчетом стоимости
    (бронь БЕЗ ПРЕДОПЛАТЫ на 1-дневные туры, оплата при посадке)
    и направляет заявку администратору (ADMIN_ID).
    """
    await callback.answer()
    parts = callback.data.split("_")
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
    user_name = user.full_name if user else "Уважаемый гость"
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейма"
    user_id = user.id if user else 0

    manager_message = f"Здравствуйте! Мой номер брони: #{booking_code}. Тур: {trip_title}, место: {seat_title}, к оплате: {total_cost}€."
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text={quote(manager_message)}"

    payment_note = (
        "🔥 <b>Бронь БЕЗ ПРЕДОПЛАТЫ!</b> Оплата тура производится при посадке в минивэн.\\n\\n"
        if duration == "1 день" else
        "🏨 <i>Предоплата требуется только для бронирования отеля.</i>\\n\\n"
    )

    # 1. Персонализированное подтверждение для туриста
    confirmation_text = (
        f"🎉 <b>ПОДТВЕРЖДЕНИЕ БРОНИРОВАНИЯ #{booking_code}</b>\\n\\n"
        f"Здравствуйте, <b>{user_name}</b>! Ваша заявка в туристический клуб <b>SVOI</b> принята.\\n\\n"
        f"📋 <b>Детали вашей поездки:</b>\\n"
        f"• 🗺 <b>Направление:</b> {trip_title}\\n"
        f"• ⏱ <b>Длительность:</b> {duration}\\n"
        f"• 🚐 <b>Транспорт:</b> Opel Vivaro (8 пассажирских мест, кондиционер)\\n"
        f"• 💺 <b>Выбранное место:</b> {seat_title}\\n"
        f"• 📍 <b>Точка сбора:</b> Саарбрюккен Hbf (или подсадка по пути)\\n\\n"
        f"🧾 <b>Расчет стоимости:</b>\\n"
        f"• Базовый билет тура: <b>{base_price}€</b>\\n"
        f"• Выбор конкретного места: <b>+{seat_fee}€</b>\\n"
        f"━━━━━━━━━━━━━━━━━━\\n"
        f"💳 <b>ИТОГО К ОПЛАТЕ: {total_cost}€</b>\\n"
        f"{payment_note}"
        f"📌 <b>Условия поездки:</b>\\n"
        f"✓ Заграничный паспорт + ВНЖ / шенгенская виза\\n"
        f"✓ <b>Мед. страховка</b> (обязательна для людей без ВНЖ в Европе)\\n"
        f"✓ <b>Багаж:</b> 10 кг при дальних поездках + ручная кладь в салон\\n\\n"
        f"👉 <b>Следующий шаг:</b> Нажмите кнопку ниже для отправки данных менеджеру "
        f"@{settings.MANAGER_USERNAME.lstrip('@')} в Telegram:"
    )

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Отправить бронь менеджеру в Telegram", url=manager_url)],
            [
                InlineKeyboardButton(text="📍 Точки сбора и время", callback_data="cb_meeting"),
                InlineKeyboardButton(text="🗺 Другие туры", callback_data="cb_trips")
            ],
            [InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")]
        ]
    )

    if callback.message:
        await callback.message.edit_text(
            text=confirmation_text,
            reply_markup=kb,
            parse_mode="HTML"
        )

    # 2. Уведомление администратору о бронировании
    admin_lead = (
        f"🚨 <b>НОВАЯ ЗАЯВКА НА БРОНИРОВАНИЕ #{booking_code}</b> 🚨\\n\\n"
        f"👤 <b>Турист:</b> {user_name} ({user_mention})\\n"
        f"🆔 <b>Telegram ID:</b> <code>{user_id}</code>\\n"
        f"🔗 <a href=\\"tg://user?id={user_id}\\">Написать клиенту</a>\\n\\n"
        f"🗺 <b>Тур:</b> {trip_title} ({duration})\\n"
        f"💺 <b>Место:</b> {seat_title}\\n"
        f"💵 <b>Сумма к оплате:</b> <b>{total_cost}€</b> (тур: {base_price}€, место: +{seat_fee}€)\\n"
        f"📍 <b>Посадка:</b> Саарбрюккен Hbf\\n"
        f"💳 <b>Предоплата:</b> {'БЕЗ ПРЕДОПЛАТЫ' if duration == '1 день' else 'Отель (требуется предоплата)'}"
    )

    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_lead,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не удалось отправить заявку админу: %s", e)

    await state.clear()
`
  },
  {
    name: 'keyboards/inline.py',
    path: 'keyboards/inline.py',
    language: 'python',
    description: 'Все инлайн-клавиатуры бота: главное меню, список туров, выбор мест по порядку (8 мест), кнопка возврата.',
    content: `from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from data.trips import TRIPS_CATALOG
from config import settings

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Главное меню бота с удобным расположением по 1-2 кнопки в ряд"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🗺 Поездки", callback_data="cb_trips"),
                InlineKeyboardButton(text="💺 Забронировать место", callback_data="cb_book")
            ],
            [
                InlineKeyboardButton(text="❓ Частые вопросы (FAQ)", callback_data="cb_faq"),
                InlineKeyboardButton(text="🎮 Игры и викторины", callback_data="cb_games")
            ],
            [
                InlineKeyboardButton(text="🚐 Фото авто", callback_data="cb_car"),
                InlineKeyboardButton(text="📍 Точки сбора", callback_data="cb_meeting")
            ],
            [
                InlineKeyboardButton(text="📜 Условия поездок", callback_data="cb_terms"),
                InlineKeyboardButton(text="🤝 Стать партнером", callback_data="cb_partner")
            ],
            [
                InlineKeyboardButton(text="✍️ Оставить пожелания", callback_data="cb_feedback")
            ],
            [
                InlineKeyboardButton(text="🆘 Поддержка (Менеджер)", url=manager_url),
                InlineKeyboardButton(text="📢 Наш Канал", url=settings.CHANNEL_URL)
            ]
        ]
    )

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка возврата в главное меню"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """Список всех туров в столбик с ценами"""
    buttons = []
    for trip_id, trip in TRIPS_CATALOG.items():
        text = f"📍 {trip['short_title']} — {trip['price']}{trip['currency']}"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    buttons.append([InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """Кнопки в карточке тура"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💺 Забронировать этот тур", callback_data=f"cb_book_target_{trip_id}")],
            [
                InlineKeyboardButton(text="🗺 Все направления", callback_data="cb_trips"),
                InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")
            ]
        ]
    )

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """Кнопки выбора интерактивного места в минивэне по порядку (8 мест)"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Место 1 (рядом с водителем) — 5€", callback_data=f"cb_seat_1_{trip_id}"),
                InlineKeyboardButton(text="💺 Место 2 (водитель, окно) — 5€", callback_data=f"cb_seat_2_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="💺 Место 3 (2-й ряд, окно) — 5€", callback_data=f"cb_seat_3_{trip_id}"),
                InlineKeyboardButton(text="💺 Место 4 (2-й ряд, центр) — 5€", callback_data=f"cb_seat_4_{trip_id}"),
                InlineKeyboardButton(text="💺 Место 5 (2-й ряд, окно) — 5€", callback_data=f"cb_seat_5_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="💺 Место 6 (3-й ряд, окно) — 5€", callback_data=f"cb_seat_6_{trip_id}"),
                InlineKeyboardButton(text="💺 Место 7 (3-й ряд, центр) — 5€", callback_data=f"cb_seat_7_{trip_id}"),
                InlineKeyboardButton(text="💺 Место 8 (3-й ряд, окно) — 5€", callback_data=f"cb_seat_8_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="🎲 Без выбора места (свободная посадка) — 0€", callback_data=f"cb_seat_none_{trip_id}")
            ],
            [InlineKeyboardButton(text="💬 Написать менеджеру лично", url=manager_url)],
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )

def get_cancel_feedback_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="cb_cancel_feedback")]
        ]
    )
`
  },
  {
    name: 'states/states.py',
    path: 'states/states.py',
    language: 'python',
    description: 'Машины состояний FSM (FeedbackState и BookingState).',
    content: `from aiogram.fsm.state import State, StatesGroup

class FeedbackState(StatesGroup):
    waiting_for_text = State()

class BookingState(StatesGroup):
    choosing_trip = State()
    choosing_seat = State()
    waiting_for_contact = State()
`
  },
  {
    name: 'requirements.txt',
    path: 'requirements.txt',
    language: 'text',
    description: 'Зависимости проекта для установки через pip.',
    content: `aiogram>=3.17.0,<4.0.0
pydantic-settings>=2.7.0
aiohttp>=3.11.0
python-dotenv>=1.0.1
`
  },
  {
    name: 'handlers/faq.py',
    path: 'handlers/faq.py',
    language: 'python',
    description: 'Раздел частых вопросов (FAQ): как гуляем, время на локациях, оплата, сиденья, ссылка на тему в канале.',
    content: `import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="faq_router")

FAQ_MAIN_TEXT = (
    "❓ <b>Частые вопросы о поездках клуба SVOI (FAQ)</b> 💡\\n\\n"
    "Собрали для вас подробные ответы на самые важные вопросы:\\n\\n"
    "• 💳 Оплата: <b>работаем без предоплаты на однодневные поездки</b>!\\n"
    "• ⏱ Маршруты и тайминг: примеры комбинированных туров\\n"
    "• 🎯 Как выбрать тур: размеренные прогулки vs. активный темп\\n"
    "• 💺 Салон Opel Vivaro: 8 мест (2 спереди, 3 во 2-м и 3 во 3-м ряду)\\n\\n"
    "👇 <i>Нажмите интересующий вопрос:</i>"
)

def get_faq_inline_kb():
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💳 Когда оплата? (Без предоплаты)", callback_data="cb_faq_payment"),
                InlineKeyboardButton(text="⏱ Сколько времени на локациях?", callback_data="cb_faq_time")
            ],
            [
                InlineKeyboardButton(text="🎯 Размеренный vs темп: как выбрать тур?", callback_data="cb_faq_choose"),
                InlineKeyboardButton(text="💺 Схема мест (2+3+3) и регулировки", callback_data="cb_faq_seats")
            ],
            [
                InlineKeyboardButton(text="🚶 Как мы гуляем по локациям?", callback_data="cb_faq_walking")
            ],
            [
                InlineKeyboardButton(text="📌 Читать тему в канале (FAQ)", url="https://t.me/c/3876884115/5")
            ],
            [
                InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")
            ]
        ]
    )

@router.callback_query(F.data == "cb_faq")
async def process_faq_main(callback: CallbackQuery):
    if callback.message:
        await callback.message.edit_text(text=FAQ_MAIN_TEXT, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_payment")
async def process_faq_payment(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💳 <b>Когда и как оплата поездки?</b>\\n\\n"
        "🔥 <b>Мы работаем БЕЗ ПРЕДОПЛАТЫ на все однодневные поездки!</b>\\n\\n"
        "• <b>Однодневные туры:</b> Вы бронируете место, а оплачиваете поездку непосредственно при посадке в минивэн!\\n"
        "• <b>Многодневные поездки (2–3 дня):</b> Предоплата требуется <b>ТОЛЬКО для многодневных туров</b> (для бронирования номеров в отелях).\\n"
        "• <b>Способы оплаты:</b> Наличные при посадке (в евро), банковский перевод SEPA / IBAN (Германия/ЕС), PayPal.\\n"
        "• <b>Отмена:</b> При предупреждении за 72+ часа — перенос или отмена без удержаний."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    await callback.answer()
    text = (
        "⏱ <b>Сколько времени на локациях?</b>\\n\\n"
        "Мы рассчитываем маршрут так, чтобы не было ощущения суеты:\\n\\n"
        "• <b>Однодневные туры (Париж, Амстердам, Брюгге):</b> от 5 до 8 часов чистого времени в городе!\\n\\n"
        "• <b>Комбинированные маршруты:</b>\\n"
        "  — 🌊 <b>Этрета + Париж:</b> к примеру, <b>5 часов на скалах Этрета</b> и океане + <b>2–3 часа</b> в вечернем Париже!\\n"
        "  — 🇨🇭 <b>Швейцария комбо:</b> <b>3 часа Лаутербруннен</b> (долина водопадов), <b>2 часа ущелье Ааре</b>, <b>2 часа Берн</b>!\\n\\n"
        "• <b>Туры на выходные (2–3 дня):</b> размеренная программа с ночевкой в комфортабельном отеле."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🎯 <b>Как выбрать тур новичку?</b>\\n\\n"
        "🌿 <b>Размеренные туры (для спокойных прогулок и релакса):</b>\\n"
        "• <b>Брюгге (110€)</b> — каналы, лебеди, шоколад, уютные террасы\\n"
        "• <b>Эльзас + Страсбург (80€)</b> — пряничные фахверковые улочки\\n"
        "• <b>Замок Нойшванштайн (120€)</b> — прогулка к озеру Альпзее и замку\\n"
        "• <b>Лазурный берег (3 дня, 440€)</b> — курортный отдых у моря с отелем\\n\\n"
        "⚡️ <b>Туры в темпе (активно, «галопом по Европам»):</b>\\n"
        "• <b>Лихтенштейн (3 страны за 1 день, 120€)</b> — Лихтенштейн + Австрия + Швейцария\\n"
        "• <b>Этрета + Париж (140€)</b> — 5 ч скалы Нормандии + 2–3 ч Париж\\n"
        "• <b>Швейцария комбо (120€)</b> — 3 ч Лаутербруннен + 2 ч ущелье Ааре + 2 ч Берн\\n"
        "• <b>Париж или Амстердам (120€)</b> — максимум впечатлений за 1 день\\n\\n"
        f"Напишите менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} — мы поможем подобрать тур!"
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💺 <b>Как расположены и регулируются сидения?</b>\\n\\n"
        "В нашем 8-местном минивэне Opel Vivaro сиденья расположены по схеме 2+3+3:\\n\\n"
        "• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\\n"
        "• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\\n"
        "• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\\n\\n"
        "🛋 <b>Комфорт:</b> Регулируемый наклон спинки для сна, USB-зарядки для смартфонов, кондиционер.\\n"
        "💵 <b>Выбор места:</b> Фиксация конкретного места по порядку — <b>5€</b>. Без выбора (свободная посадка) — <b>0€</b>."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🚶 <b>Как мы гуляем по локациям?</b>\\n\\n"
        "1. <b>Вводная прогулка:</b> По прибытии мы вместе знакомимся с ключевыми достопримечательностями и видовыми точками.\\n\\n"
        "2. <b>Свободное время:</b> Вы не привязаны к группе с флажком! Гуляйте в своем темпе, посещайте музеи, сидите в уютных кафе или устраивайте шопинг.\\n\\n"
        "3. <b>Поддержка:</b> Организатор всегда на связи в чате поездки и делится точными локациями лучших заведений."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")
`
  },
  {
    name: 'handlers/games.py',
    path: 'handlers/games.py',
    language: 'python',
    description: 'Интерактивные игры в чате: Гео-Детектив (с выдачей Карты Приоритета), квиз Правда/Ложь и проведение викторин в группе.',
    content: `import logging
import random
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="games_router")

@router.callback_query(F.data == "cb_games")
async def process_games_main(callback: CallbackQuery):
    text = (
        "🎮 <b>Интерактивные игры и викторины клуба SVOI</b> 🏆\\n\\n"
        "Скучаете по дороге на работу или вечером? Участвуйте в играх, проверяйте интуицию "
        "и получайте бонусы для ваших будущих поездок!\\n\\n"
        "• 🕵️ <b>Игра «Гео-Детектив»:</b> угадайте неочевидную локацию и получите <b>Карту Приоритета (+5€ выбор места)</b>!\\n"
        "• 🧠 <b>Квиз «Правда или Ложь»:</b> 3 шокирующих факта о европейских странах.\\n"
        "• 🎁 <b>Розыгрыши билетов:</b> как бот проводит конкурсы в группе Telegram."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🕵️ Игра «Гео-Детектив»", callback_data="cb_game_geo")],
            [InlineKeyboardButton(text="🧠 Викторина «Правда или Ложь»", callback_data="cb_game_quiz")],
            [InlineKeyboardButton(text="🎁 Розыгрыши в группе SVOI", callback_data="cb_game_group_info")],
            [InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
`
  },
  {
    name: '.env',
    path: '.env',
    language: 'ini',
    description: 'Файл переменных окружения с токеном, контактами и ID админа.',
    content: `BOT_TOKEN=8969834514:AAGjza7gfBInTsGhnR4jVWvHQR0Hcx2Mnd4
ADMIN_ID=0
MANAGER_USERNAME=SVOI_travel_admin
BOT_USERNAME=Svoi_TravelEU_bot
CHANNEL_URL=https://t.me/+Flt_2r6vi3U4ZDg6
GROUP_URL=https://t.me/+J50liyDUHPgzYTQy
`
  },
  {
    name: 'Dockerfile',
    path: 'Dockerfile',
    language: 'dockerfile',
    description: 'Docker образ для контейнеризации и быстрого развертывания.',
    content: `FROM python:3.11-slim
WORKDIR /app
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "bot.py"]
`
  },
  {
    name: 'docker-compose.yml',
    path: 'docker-compose.yml',
    language: 'yaml',
    description: 'Docker Compose файл для запуска бота одной командой.',
    content: `version: '3.8'

services:
  svoi_bot:
    build: .
    container_name: svoi_travel_bot
    restart: unless-stopped
    env_file:
      - .env
`
  },
  {
    name: 'README.md',
    path: 'README.md',
    language: 'markdown',
    description: 'Инструкция по быстрому запуску, тестированию и развертыванию бота.',
    content: `# 🌍 Telegram-бот туристического клуба SVOI Travel (aiogram 3.x)

Официальный production-ready бот для европейского туристического клуба **SVOI** (@Svoi_TravelEU_bot).

## 🚀 Возможности
- 🧭 **Интерактивное главное меню** без спама сообщениями.
- 🗺 **Каталог туров по Европе** (Париж, Нормандия/Этрета, Швейцария, Прага и др.) с разбивкой на размеренные и активные туры.
- 💺 **Выбор мест:** 1-й ряд (2 места рядом с водителем), 2-й ряд (3 места), 3-й ряд (3 места).
- 🚐 **Автопарк:** Opel Vivaro комфортное авто со всеми удобствами.
- 📍 **Точки сбора:** сбор и развоз по адресу (Саарланд, Трир, Люксембург), подсадка по пути при наличии от 4-х человек, уведомление накануне вечером и 1-дневная группа для связи.
- 💳 **Условия:** 0% предоплаты на однодневные поездки, медстраховка для лиц без ВНЖ, багаж 10 кг + ручная кладь.

## 🧪 Пошаговая инструкция: Тестирование в Telegram

### Шаг 1: Подготовка окружения
\`\`\`bash
# macOS / Linux
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Windows PowerShell
python -m venv venv
.\\venv\\Scripts\\activate
pip install -r requirements.txt
\`\`\`

### Шаг 2: Проверка .env
Укажите в \`.env\` ваш токен и \`ADMIN_ID\` (узнать в @userinfobot).

### Шаг 3: Запуск
\`\`\`bash
python bot.py
\`\`\`
Откройте Telegram и отправьте боту \`/start\`.
`
  }
];
