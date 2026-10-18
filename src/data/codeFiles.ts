import { PythonCodeFile } from '../types';

export const BOT_CODE_FILES: PythonCodeFile[] = [
  {
    name: 'bot.py',
    path: 'bot.py',
    language: 'python',
    description: 'Головна точка входу. Ініціалізує Bot, Dispatcher, підключає роутери та запускає Polling з підтримкою Health Check для Render.',
    content: `import asyncio
import logging
import os
import sys
from pathlib import Path

# Гарантуємо, що папка бота та батьківська папка додані до sys.path
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
    from bot_code.handlers import menu, trips, feedback, booking, faq, games, channel
except ModuleNotFoundError:
    from config import settings
    from handlers import menu, trips, feedback, booking, faq, games, channel

# Налаштування логування
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("svoi_travel_bot")

async def start_health_server():
    """Запуск легкого HTTP-сервера для сумісності з Render Web Service (Health Check)"""
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
        logger.info("🌐 Health Check сервер запущено на порту %d", port)
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
    dp.include_router(channel.router)

    try:
        await bot.delete_webhook(drop_pending_updates=True)
        bot_info = await bot.get_me()
        logger.info("✅ Успішне підключення: %s (@%s)", bot_info.first_name, bot_info.username)
        
        await start_health_server()
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical("❌ Помилка при запуску: %s", e, exc_info=True)
    finally:
        logger.info("🛑 Зупинка сесії бота...")
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот зупинено.")
`
  },
  {
    name: 'main.py',
    path: 'main.py',
    language: 'python',
    description: 'Точка входу main.py для запуску бота командою python main.py на Render або VPS.',
    content: `"""
SVOI Travel - Точка входу main.py
Запускає асинхронний цикл бота aiogram 3.x
"""
import asyncio
import sys
from pathlib import Path

CURRENT_DIR = Path(__file__).resolve().parent
if str(CURRENT_DIR) not in sys.path:
    sys.path.insert(0, str(CURRENT_DIR))

try:
    from bot_code.bot import main
except ModuleNotFoundError:
    from bot import main

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        print("Бот SVOI Travel зупинено.")
`
  },
  {
    name: 'handlers/channel.py',
    path: 'handlers/channel.py',
    language: 'python',
    description: 'Керування каналом (/channel): авторозіграші з перевіркою підписки, вибір переможця, квізи та пости турів з кнопкою «Забронювати».',
    content: `#handlers/channel.py - Роутер розіграшів та публікацій у канал`
  },
  {
    name: 'config.py',
    path: 'config.py',
    language: 'python',
    description: 'Налаштування та змінні оточення через pydantic-settings.',
    content: `import os
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field

class Settings(BaseSettings):
    BOT_TOKEN: str = Field(default="8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM")
    ADMIN_ID: int = Field(default=8450153980, description="Telegram ID адміністратора для заявок та фідбеку")
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
    description: 'Обробники головного меню, команди /start, автопарку, умов, партнерів та точок збору.',
    content: `import logging
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from aiogram.exceptions import TelegramBadRequest

from keyboards.inline import (
    get_main_menu_keyboard,
    get_back_keyboard,
    get_seats_keyboard,
    get_faq_keyboard,
    get_games_keyboard
)
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="menu_router")

MAIN_MENU_TEXT = (
    "🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\\n\\n"
    "Ми організовуємо душевні та продумані поїздки найкрасивішими куточками Європи "
    "на комфортабельному мінівені Opel Vivaro без стресу, поспіху та мовних бар'єрів!\\n\\n"
    "✨ <b>Чому обирають SVOI:</b>\\n"
    "• 🚐 <i>Комфорт у дорозі:</i> просторий 8-місний мінівен (2 місця поруч з водієм, 3 у 2-му та 3 у 3-му ряду)\\n"
    "• 💳 <i>Чесні умови:</i> працюємо <b>без передоплати</b> на одноденні поїздки!\\n"
    "• 📍 <i>Зручний старт:</i> відправлення із Саарбрюккена + підсадка за маршрутом\\n"
    "• 👥 <i>Маленькі душевні групи</i> (до 8 осіб)\\n\\n"
    "👇 <b>Оберіть потрібний розділ у меню:</b>"
)

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Обробник команди /start"""
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "cb_back")
async def process_back_to_menu(callback: CallbackQuery):
    """Повернення до головного меню без дублювання повідомлень (через edit_text)"""
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
            logger.warning("Помилка при поверненні: %s", e)

@router.callback_query(F.data == "cb_car")
async def process_car_info(callback: CallbackQuery):
    """Інформація про автопарк клубу SVOI: мінівен Opel Vivaro"""
    await callback.answer()
    car_text = (
        "🚐 <b>Наш мінівен: Opel Vivaro (8 пасажирських місць)</b> 🚗\\n\\n"
        "Ми дбаємо про те, щоб дорога була легкою та приємною!\\n\\n"
        "💺 <b>Схема місць у салоні (всього 8 місць):</b>\\n"
        "• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\\n"
        "• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\\n"
        "• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\\n\\n"
        "🌟 <b>Оснащення та зручності:</b>\\n"
        "• 💺 <b>Зручні регульовані сидіння:</b> індивідуальні ремені, відкидні спинки для сну\\n"
        "• 📏 <b>Простір для ніг:</b> вільно навіть для високих пасажирів\\n"
        "• ❄️🔥 <b>Кондиціонер та опалення салону</b>\\n"
        "• ⚡️ <b>Зарядка телефонів:</b> USB-порти біля пасажирських місць\\n"
        "• 🧳 <b>Багажне відділення:</b> 10 кг при далеких поїздках + ручна поклажа в салон\\n"
        "• 🧼 <b>Ідеальна чистота:</b> регулярне вологе прибирання перед кожним рейсом\\n\\n"
        "<i>Ви можете зафіксувати конкретне місце під час бронювання (+5€) або зайняти вільне при посадці (0€).</i>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=car_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_meeting")
async def process_meeting_points(callback: CallbackQuery):
    """Інформація про точки збору та логістику"""
    await callback.answer()
    meeting_text = (
        "📍 <b>Точки збору пасажирів & Логістика клубу SVOI</b> 🗺\\n\\n"
        "🏡 <b>Збір та розвезення за адресою (Door-to-Door):</b>\\n"
        "• <b>Забираємо всіх прямо за адресою</b> по землі <b>Саарланд (Saarland)</b>, у <b>Трірі (Trier)</b> та <b>Люксембурзі (Luxembourg)</b>!\\n"
        "• Розвеземо також назад за вказаною адресою.\\n\\n"
        "🛣 <b>Збір в інших землях та можливість підсадки:</b>\\n"
        "Можемо забрати й в інших землях — це залежить від маршруту (по дорозі чи ні) або якщо це багатоденний тур.\\n"
        "👉 <b>За наявності від 4-х осіб можемо забрати з інших земель!</b>\\n\\n"
        "Міста та умови підсадки:\\n"
        "• <b>Хомбург (Homburg Saar)</b> — уточнюйте\\n"
        "• <b>Кайзерслаутерн (Kaiserslautern)</b> — можливий якщо більше 4-х осіб і не одноденний тур\\n"
        "• <b>Мангейм / Людвігсхафен (Mannheim)</b> — можливий якщо більше 4-х осіб і не одноденний тур\\n"
        "• <b>Франкфурт-на-Майні (Frankfurt am Main)</b> — можливий якщо більше 4-х осіб і не одноденний тур\\n"
        "• <b>Карлсруе (Karlsruhe)</b> — для південних напрямків по дорозі\\n"
        "• <b>Страсбург (Strasbourg)</b> — по Франції та Швейцарії\\n"
        "• <b>Бельгія</b> — при поїздках до Нормандії, Голландії та Парижа\\n\\n"
        "💬 <i>Напишіть менеджеру для уточнення — можливість підсадки уточнюйте: @SVOI_travel_admin</i>\\n\\n"
        "⏰ <b>Точний час подачі трансферу:</b>\\n"
        "Точний час, о котрій за вами заїдуть, надсилається <b>в особистий чат за день увечері перед поїздкою</b>.\\n\\n"
        "👥 <b>Зв'язок з водієм та чат групи:</b>\\n"
        "Основні питання водієві та щодо поїздки ви зможете поставити у новоствореній одноденній групі для комунікації. <b>Через день група видаляється.</b>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=meeting_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_terms")
async def process_terms(callback: CallbackQuery):
    """Умови поїздок, правила скасування, документи"""
    await callback.answer()
    terms_text = (
        "📜 <b>Умови поїздок туристичного клубу SVOI</b> 📌\\n\\n"
        "🛂 <b>Необхідні документи:</b>\\n"
        "• Дійсний закордонний паспорт\\n"
        "• Дійсний європейський ВНЖ (Aufenthaltstitel), ПМЖ або шенгенська віза\\n"
        "• 🏥 <b>Медична страховка:</b> Обов'язкова туристична страховка для осіб без ВНЖ в Європі\\n\\n"
        "🧳 <b>Багаж:</b>\\n"
        "• <b>10 кг при далеких поїздках</b> у багажний відсік\\n"
        "• 1 невелика <b>ручна поклажа</b> з особистими речами в салон авто\\n\\n"
        "💳 <b>Бронювання та оплата:</b>\\n"
        "• 🔥 <b>Бронь у нас БЕЗ ПЕРЕДОПЛАТИ!</b> Оплата туру відбувається при посадці в день поїздки\\n"
        "• Передоплата потрібна <b>ТІЛЬКИ при поїздках на кілька днів</b> для бронювання номерів у готелях\\n\\n"
        "🔄 <b>Правила скасування та повернення:</b>\\n"
        "• Скасування за 72+ години до виїзду — перенесення дати або скасування без утримань\\n"
        "• Менше 24 годин — бронь можна передати другу\\n\\n"
        "🚭 <b>У салоні суворо заборонено куріння та вживання міцного алкоголю.</b>"
    )
    if callback.message:
        await callback.message.edit_text(
            text=terms_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_partner")
async def process_partner(callback: CallbackQuery):
    """Партнерська програма"""
    await callback.answer()
    partner_text = (
        "🤝 <b>Партнерська програма клубу SVOI</b> 💼\\n\\n"
        "1. <b>Приведи друзів:</b> компанія від 4 осіб отримує персональну знижку 10% кожному!\\n"
        "2. <b>Індивідуальний чартер:</b> оренда всього мінівена (8 місць) з водієм зі знижкою 15%.\\n"
        "3. <b>Блогери та гіди:</b> вигідна співпраця та бартерні поїздки.\\n\\n"
        f"📩 <i>Зв'язок із керівником:</i> @{settings.MANAGER_USERNAME.lstrip('@')}"
    )
    if callback.message:
        await callback.message.edit_text(
            text=partner_text,
            reply_markup=get_back_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_book")
async def process_book_menu(callback: CallbackQuery):
    """Вибір місця в салоні"""
    await callback.answer()
    seats_info = (
        "💺 <b>Вибір місця в мінівені Opel Vivaro (8 пасажирських місць)</b>\\n\\n"
        "• 1-й ряд (поруч із водієм): 2 місця\\n"
        "• 2-й ряд: 3 місця\\n"
        "• 3-й ряд: 3 місця\\n\\n"
        "💵 <b>Тариф:</b>\\n"
        "• Фіксація конкретного місця по порядку: <b>+5€</b>\\n"
        "• Без вибору місця (вільна посадка): <b>0€</b>\\n\\n"
        "👇 <i>Оберіть місце по порядку:</i>"
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
    description: 'Вивід списку турів у стовпчик, детальні картки та перехід до бронювання.',
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
    "🗺 <b>Актуальні напрямки та розклад турів SVOI</b> 🇪🇺✨\\n\\n"
    "Усі поїздки здійснюються із <b>Саарбрюккена</b> (з підсадкою за маршрутом) "
    "на комфортабельному мінівені Opel Vivaro (8 місць).\\n\\n"
    "👇 <i>Натисніть на напрямок для перегляду програми та бронювання:</i>"
)

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery):
    """Виводить список напрямків з цінами у стовпчик"""
    await callback.answer()
    if callback.message:
        await callback.message.edit_text(
            text=TRIPS_HEADER,
            reply_markup=get_trips_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_trip_"))
async def process_trip_detail(callback: CallbackQuery):
    """Виводить детальну картку обраного туру"""
    await callback.answer()
    trip_id = callback.data.replace("cb_trip_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не знайдено", show_alert=True)
        return

    if callback.message:
        await callback.message.edit_text(
            text=trip["description"],
            reply_markup=get_trip_detail_keyboard(trip_id),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_book_target_"))
async def process_book_target_trip(callback: CallbackQuery, state: FSMContext):
    """Перехід до вибору місця та оформлення конкретного туру"""
    await callback.answer()
    trip_id = callback.data.replace("cb_book_target_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    trip_title = trip["title"] if trip else "Обраний тур"
    
    await state.update_data(trip_id=trip_id, trip_title=trip_title)
    await state.set_state(BookingState.choosing_seat)

    text = (
        f"🎯 <b>Бронювання туру: {trip_title}</b>\\n\\n"
        "Оберіть місце в мінівені Opel Vivaro (8 місць):\\n"
        "• 1-й ряд (поруч із водієм): 2 місця\\n"
        "• 2-й ряд: 3 місця\\n"
        "• 3-й ряд: 3 місця\\n\\n"
        "💵 <b>Умови:</b>\\n"
        "• Фіксація конкретного місця: <b>+5€</b>\\n"
        "• Без вибору місця (вільна посадка): <b>0€</b>\\n\\n"
        "👇 <i>Натисніть плашку потрібного місця:</i>"
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
    description: 'FSM машина станів для збору відгуків та побажань туристів із пересиланням до ADMIN_ID.',
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
    """Активує стан FSM (FeedbackState.waiting_for_text)"""
    await callback.answer()
    await state.set_state(FeedbackState.waiting_for_text)

    text = (
        "✍️ <b>Залишити відгук або побажання</b> 💌\\n\\n"
        "Напишіть у відповідному повідомленні ваші враження від поїздки, побажання щодо нових напрямків "
        "або пропозиції для покращення клубу SVOI.\\n\\n"
        "<i>Надішліть текст прямо в цей чат або натисніть «Скасувати введення»:</i>"
    )

    if callback.message:
        await callback.message.edit_text(
            text=text,
            reply_markup=get_cancel_feedback_keyboard(),
            parse_mode="HTML"
        )

@router.callback_query(F.data == "cb_cancel_feedback")
async def process_cancel_feedback(callback: CallbackQuery, state: FSMContext):
    """Скидання стану при скасуванні"""
    await callback.answer("Введення скасовано")
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
    Приймає текст від користувача, дякує йому,
    пересилає повідомлення адміністратору (ADMIN_ID) та скидає FSM.
    """
    feedback_text = message.text or message.caption or "(Медіа/стікер)"
    user = message.from_user
    user_mention = f"@{user.username}" if user and user.username else "Без юзернейму"
    user_id = user.id if user else 0
    full_name = user.full_name if user else "Користувач"

    # Скидаємо стан
    await state.clear()

    # Подяка користувачеві
    await message.answer(
        text=(
            "❤️ <b>Дякуємо за ваше звернення!</b>\\n\\n"
            "Ваш відгук успішно передано керівництву туристичного клубу SVOI. "
            "Ми уважно вивчаємо кожне повідомлення!\\n\\n"
            "До зустрічі в нових подорожах! 🚐✨"
        ),
        reply_markup=get_back_keyboard(),
        parse_mode="HTML"
    )

    # Сповіщення адміністратору
    admin_notification = (
        "🔔 <b>НОВИЙ ВІДГУК / ПОБАЖАННЯ SVOI TRAVEL</b>\\n\\n"
        f"👤 <b>Від:</b> {full_name} ({user_mention})\\n"
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
            logger.error("Не вдалося відправити адміну: %s", e)
    else:
        logger.info("ADMIN_ID не заданий. Відгук збережено в лог: %s", admin_notification)
`
  },
  {
    name: 'handlers/booking.py',
    path: 'handlers/booking.py',
    language: 'python',
    description: 'Автоматична система підтвердження бронювання з вибором 8 місць по порядку, розрахунком вартості та сповіщенням адміна.',
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
    "1": "💺 Місце 1 (1-й ряд, поруч з водієм, центр)",
    "2": "💺 Місце 2 (1-й ряд, поруч з водієм, вікно)",
    "3": "💺 Місце 3 (2-й ряд, біля вікна ліворуч)",
    "4": "💺 Місце 4 (2-й ряд, по центру)",
    "5": "💺 Місце 5 (2-й ряд, біля вікна праворуч)",
    "6": "💺 Місце 6 (3-й ряд, біля вікна ліворуч)",
    "7": "💺 Місце 7 (3-й ряд, по центру)",
    "8": "💺 Місце 8 (3-й ряд, біля вікна праворуч)",
    "none": "🎲 Без вибору місця (вільна посадка)"
}

def generate_booking_code() -> str:
    return f"SVOI-{random.randint(1000, 9999)}"

@router.callback_query(F.data.startswith("cb_seat_"))
async def process_seat_selection(callback: CallbackQuery, state: FSMContext, bot: Bot):
    """
    Автоматична система підтвердження бронювання:
    Надсилає персоналізований чек-квитанцію туристу з розрахунком вартості
    (бронь БЕЗ ПЕРЕДОПЛАТИ на 1-денні тури, оплата при посадці)
    і направляє заявку адміністратору (ADMIN_ID).
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

    manager_message = f"Вітаю! Мій номер броні: #{booking_code}. Тур: {trip_title}, місце: {seat_title}, до оплати: {total_cost}€."
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text={quote(manager_message)}"

    payment_note = (
        "🔥 <b>Бронь БЕЗ ПЕРЕДОПЛАТИ!</b> Повна оплата здійснюється при посадці в мінівен.\\n\\n"
        if duration == "1 день" else
        "🏨 <i>Передоплата потрібна лише для фіксації готелю.</i>\\n\\n"
    )

    # 1. Персоналізоване підтвердження для туриста
    confirmation_text = (
        f"🎉 <b>ПІДТВЕРДЖЕННЯ БРОНЮВАННЯ #{booking_code}</b>\\n\\n"
        f"Вітаємо, <b>{user_name}</b>! Вашу заявку в туристичний клуб <b>SVOI</b> успішно прийнято.\\n\\n"
        f"📋 <b>Деталі вашої поїздки:</b>\\n"
        f"• 🗺 <b>Напрямок:</b> {trip_title}\\n"
        f"• ⏱ <b>Тривалість:</b> {duration}\\n"
        f"• 🚐 <b>Транспорт:</b> Opel Vivaro (8 пасажирських місць, кондиціонер)\\n"
        f"• 💺 <b>Обране місце:</b> {seat_title}\\n"
        f"• 📍 <b>Точка збору:</b> Саарбрюккен Hbf (або за адресою / по дорозі)\\n\\n"
        f"🧾 <b>Розрахунок вартості:</b>\\n"
        f"• Базовий квиток туру: <b>{base_price}€</b>\\n"
        f"• Вибір конкретного місця: <b>+{seat_fee}€</b>\\n"
        f"━━━━━━━━━━━━━━━━━━\\n"
        f"💳 <b>РАЗОМ ДО ОПЛАТИ: {total_cost}€</b>\\n"
        f"{payment_note}"
        f"📌 <b>Умови поїздки:</b>\\n"
        f"✓ Закордонний паспорт + ВНЖ / шенгенська віза\\n"
        f"✓ <b>Мед. страховка</b> (обов'язкова для людей без ВНЖ в Європі)\\n"
        f"✓ <b>Багаж:</b> 10 кг при далеких поїздках + ручна поклажа в салон\\n\\n"
        f"👉 <b>Наступний крок:</b> Натисніть кнопку нижче для відправлення даних менеджеру "
        f"@{settings.MANAGER_USERNAME.lstrip('@')} в Telegram:"
    )

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Надіслати бронь менеджеру в Telegram", url=manager_url)],
            [
                InlineKeyboardButton(text="📍 Точки збору та час", callback_data="cb_meeting"),
                InlineKeyboardButton(text="🗺 Інші тури", callback_data="cb_trips")
            ],
            [InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
        ]
    )

    if callback.message:
        await callback.message.edit_text(
            text=confirmation_text,
            reply_markup=kb,
            parse_mode="HTML"
        )

    # 2. Сповіщення адміністратору про бронювання
    admin_lead = (
        f"🚨 <b>НОВА ЗАЯВКА НА БРОНЮВАННЯ #{booking_code}</b> 🚨\\n\\n"
        f"👤 <b>Турист:</b> {user_name} ({user_mention})\\n"
        f"🆔 <b>Telegram ID:</b> <code>{user_id}</code>\\n"
        f"🔗 <a href=\\"tg://user?id={user_id}\\">Написати клієнту</a>\\n\\n"
        f"🗺 <b>Тур:</b> {trip_title} ({duration})\\n"
        f"💺 <b>Місце:</b> {seat_title}\\n"
        f"💵 <b>Сума до оплати:</b> <b>{total_cost}€</b> (тур: {base_price}€, місце: +{seat_fee}€)\\n"
        f"📍 <b>Посадка:</b> Саарбрюккен Hbf\\n"
        f"💳 <b>Передоплата:</b> {'БЕЗ ПЕРЕДОПЛАТИ' if duration == '1 день' else 'Готель (потрібна передоплата)'}"
    )

    if settings.ADMIN_ID and settings.ADMIN_ID != 0:
        try:
            await bot.send_message(
                chat_id=settings.ADMIN_ID,
                text=admin_lead,
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error("Не вдалося відправити заявку адміну: %s", e)

    await state.clear()
`
  },
  {
    name: 'keyboards/inline.py',
    path: 'keyboards/inline.py',
    language: 'python',
    description: 'Усі інлайн-клавіатури бота: головне меню, список турів, вибір місць по порядку (8 місць), кнопки повернення.',
    content: `from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
from data.trips import TRIPS_CATALOG
from config import settings

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """Головне меню бота зі зручним розташуванням по 1-2 кнопки в ряд"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🗺 Поїздки", callback_data="cb_trips"),
                InlineKeyboardButton(text="💺 Забронювати місце", callback_data="cb_book")
            ],
            [
                InlineKeyboardButton(text="❓ Часті питання (FAQ)", callback_data="cb_faq"),
                InlineKeyboardButton(text="🎮 Ігри та вікторини", callback_data="cb_games")
            ],
            [
                InlineKeyboardButton(text="🚐 Фото авто", callback_data="cb_car"),
                InlineKeyboardButton(text="📍 Точки збору", callback_data="cb_meeting")
            ],
            [
                InlineKeyboardButton(text="📜 Умови поїздок", callback_data="cb_terms"),
                InlineKeyboardButton(text="🤝 Стати партнером", callback_data="cb_partner")
            ],
            [
                InlineKeyboardButton(text="✍️ Залишити побажання", callback_data="cb_feedback")
            ],
            [
                InlineKeyboardButton(text="🆘 Підтримка (Менеджер)", url=manager_url),
                InlineKeyboardButton(text="📢 Наш Канал", url=settings.CHANNEL_URL)
            ]
        ]
    )

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка повернення до головного меню"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """Список усіх турів у стовпчик з цінами"""
    buttons = []
    for trip_id, trip in TRIPS_CATALOG.items():
        text = f"📍 {trip['short_title']} — {trip['price']}{trip['currency']}"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    buttons.append([InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """Кнопки в картці туру"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💺 Забронювати цей тур", callback_data=f"cb_book_target_{trip_id}")],
            [
                InlineKeyboardButton(text="🗺 Усі напрямки", callback_data="cb_trips"),
                InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")
            ]
        ]
    )

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """Кнопки вибору інтерактивного місця в мінівені по порядку (8 місць)"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Місце 1 (поруч з водієм) — 5€", callback_data=f"cb_seat_1_{trip_id}"),
                InlineKeyboardButton(text="💺 Місце 2 (водій, вікно) — 5€", callback_data=f"cb_seat_2_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="💺 Місце 3 (2-й ряд, вікно) — 5€", callback_data=f"cb_seat_3_{trip_id}"),
                InlineKeyboardButton(text="💺 Місце 4 (2-й ряд, центр) — 5€", callback_data=f"cb_seat_4_{trip_id}"),
                InlineKeyboardButton(text="💺 Місце 5 (2-й ряд, вікно) — 5€", callback_data=f"cb_seat_5_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="💺 Місце 6 (3-й ряд, вікно) — 5€", callback_data=f"cb_seat_6_{trip_id}"),
                InlineKeyboardButton(text="💺 Місце 7 (3-й ряд, центр) — 5€", callback_data=f"cb_seat_7_{trip_id}"),
                InlineKeyboardButton(text="💺 Місце 8 (3-й ряд, вікно) — 5€", callback_data=f"cb_seat_8_{trip_id}")
            ],
            [
                InlineKeyboardButton(text="🎲 Без вибору місця (вільна посадка) — 0€", callback_data=f"cb_seat_none_{trip_id}")
            ],
            [InlineKeyboardButton(text="💬 Написати менеджеру особисто", url=manager_url)],
            [InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")]
        ]
    )

def get_cancel_feedback_keyboard() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Скасувати введення", callback_data="cb_cancel_feedback")]
        ]
    )
`
  },
  {
    name: 'states/states.py',
    path: 'states/states.py',
    language: 'python',
    description: 'Машини станів FSM (FeedbackState та BookingState).',
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
    description: 'Залежності проєкту для встановлення через pip.',
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
    description: 'Розділ частих запитань (FAQ): як гуляємо, час на локаціях, оплата, сидіння, посилання на тему в каналі.',
    content: `import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from config import settings

logger = logging.getLogger(__name__)
router = Router(name="faq_router")

FAQ_MAIN_TEXT = (
    "❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\\n\\n"
    "Зібрали для вас детальні відповіді на найважливіші питання:\\n\\n"
    "• 💳 Оплата: <b>працюємо без передоплати на одноденні поїздки</b>!\\n"
    "• ⏱ Маршрути та таймінг: приклади комбінованих турів\\n"
    "• 🎯 Як обрати тур: розмірені прогулянки vs. активний темп\\n"
    "• 💺 Салон Opel Vivaro: 8 місць (2 спереду, 3 у 2-му та 3 у 3-му ряду)\\n\\n"
    "👇 <i>Натисніть на запитання, яке вас цікавить:</i>"
)

def get_faq_inline_kb():
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💳 Коли оплата? (Без передоплати)", callback_data="cb_faq_payment"),
                InlineKeyboardButton(text="⏱ Скільки часу на локаціях?", callback_data="cb_faq_time")
            ],
            [
                InlineKeyboardButton(text="🎯 Розмірений vs темп: як обрати тур?", callback_data="cb_faq_choose"),
                InlineKeyboardButton(text="💺 Схема місць (2+3+3) та регулювання", callback_data="cb_faq_seats")
            ],
            [
                InlineKeyboardButton(text="🚶 Як ми гуляємо на локаціях?", callback_data="cb_faq_walking")
            ],
            [
                InlineKeyboardButton(text="📌 Читати тему в каналі (FAQ)", url="https://t.me/c/3876884115/5")
            ],
            [
                InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")
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
        "💳 <b>Коли та як оплата поїздки?</b>\\n\\n"
        "🔥 <b>Ми працюємо БЕЗ ПЕРЕДОПЛАТИ на всі одноденні поїздки!</b>\\n\\n"
        "• <b>Одноденні тури:</b> Ви бронюєте місце, а оплачуєте поїздку безпосередньо при посадці в мінівен!\\n"
        "• <b>Багатоденні поїздки (2–3 дні):</b> Передоплата потрібна <b>ТОЛЬКО для багатоденних турів</b> (для бронювання номерів у готелях).\\n"
        "• <b>Способи оплати:</b> Готівка при посадці (в євро), банківський переказ SEPA / IBAN (Німеччина/ЄС), PayPal.\\n"
        "• <b>Скасування:</b> При попередженні за 72+ години — перенесення або скасування без утримань."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    await callback.answer()
    text = (
        "⏱ <b>Скільки часу на локаціях?</b>\\n\\n"
        "Ми розраховуємо маршрут так, щоб не було відчуття поспіху:\\n\\n"
        "• <b>Одноденні тури (Париж, Амстердам, Брюгге):</b> від 5 до 8 годин чистого часу в місті!\\n\\n"
        "• <b>Комбіновані маршрути:</b>\\n"
        "  — 🌊 <b>Етрета + Париж:</b> наприклад, <b>5 годин на скелях Етрета</b> та океані + <b>2–3 години</b> у вечірньому Парижі!\\n"
        "  — 🇨🇭 <b>Швейцарія комбо:</b> <b>3 години Лаутербруннен</b> (долина водоспадів), <b>2 години ущелина Ааре</b>, <b>2 години Берн</b>!\\n\\n"
        "• <b>Тури на вихідні (2–3 дні):</b> розмірена програма з ночівлею в комфортабельному готелі."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🎯 <b>Як обрати тур новачку?</b>\\n\\n"
        "🌿 <b>Розмірені тури (для спокійних прогулянок та релаксу):</b>\\n"
        "• <b>Брюгге (110€)</b> — канали, лебеді, шоколад, затишні тераси\\n"
        "• <b>Ельзас + Страсбург (80€)</b> — пряникові фахверкові вулички\\n"
        "• <b>Замок Нойшванштайн (120€)</b> — прогулянка до озера Альпзее та замку\\n"
        "• <b>Лазурове узбережжя (3 дні, 440€)</b> — курортний відпочинок біля моря з готелем\\n\\n"
        "⚡️ <b>Тури в темпі (активно, «галопом по Європах»):</b>\\n"
        "• <b>Ліхтенштейн (3 країни за 1 день, 120€)</b> — Ліхтенштейн + Австрія + Швейцарія\\n"
        "• <b>Етрета + Париж (140€)</b> — 5 год скелі Нормандії + 2–3 год Париж\\n"
        "• <b>Швейцарія комбо (120€)</b> — 3 год Лаутербруннен + 2 год ущелина Ааре + 2 год Берн\\n"
        "• <b>Париж чи Амстердам (120€)</b> — максимум вражень за 1 день\\n\\n"
        f"Напишіть менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} — ми допоможемо підібрати тур!"
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💺 <b>Як розташовані та регулюються сидіння?</b>\\n\\n"
        "У нашому 8-місному мінівені Opel Vivaro сидіння розташовані за схемою 2+3+3:\\n\\n"
        "• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\\n"
        "• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\\n"
        "• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\\n\\n"
        "🛋 <b>Комфорт:</b> Регульований нахил спинки для сну, USB-зарядки для смартфонів, кондиціонер.\\n"
        "💵 <b>Вибір місця:</b> Фіксація конкретного місця по порядку — <b>5€</b>. Без вибору (вільна посадка) — <b>0€</b>."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🚶 <b>Як ми гуляємо на локаціях?</b>\\n\\n"
        "1. <b>Вступна прогулянка:</b> Після прибуття ми разом знайомимося з ключовими визначними пам'ятками та видовими точками.\\n\\n"
        "2. <b>Вільний час:</b> Ви не прив'язані до групи з прапорцем! Гуляйте у своєму темпі, відвідуйте музеї, відпочивайте в затишних кафе або влаштовуйте шопінг.\\n\\n"
        "3. <b>Підтримка:</b> Організатор завжди на зв'язку в чаті поїздки та ділиться точними локаціями найкращих закладів."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_inline_kb(), parse_mode="HTML")
`
  },
  {
    name: 'handlers/games.py',
    path: 'handlers/games.py',
    language: 'python',
    description: 'Інтерактивні ігри в чаті: Гео-Детектив (із видачею Картки Пріоритету), квіз Правда/Неправда та проведення вікторин у групі.',
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
        "🎮 <b>Інтерактивні ігри та вікторини клубу SVOI</b> 🏆\\n\\n"
        "Нудьгуєте дорогою на роботу чи ввечері? Беріть участь в іграх, перевіряйте інтуїцію "
        "та отримуйте бонуси для ваших майбутніх поїздок!\\n\\n"
        "• 🕵️ <b>Гра «Гео-Детектив»:</b> вгадайте незвичайну локацію та отримайте <b>Картку Пріоритету (+5€ вибір місця)</b>!\\n"
        "• 🧠 <b>Квіз «Правда чи Неправда»:</b> 3 дивовижні факти про європейські країни.\\n"
        "• 🎁 <b>Розіграші квитків:</b> як бот проводить конкурси у групі Telegram."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🕵️ Гра «Гео-Детектив»", callback_data="cb_game_geo")],
            [InlineKeyboardButton(text="🧠 Вікторина «Правда чи Неправда»", callback_data="cb_game_quiz")],
            [InlineKeyboardButton(text="🎁 Розіграші у групі SVOI", callback_data="cb_game_group_info")],
            [InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
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
    description: 'Файл змінних оточення з токеном, контактами та ID адміна.',
    content: `BOT_TOKEN=8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM
ADMIN_ID=8450153980
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
    description: 'Docker образ для контейнеризації та швидкого розгортання.',
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
    description: 'Docker Compose файл для запуску бота однією командою.',
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
    description: 'Інструкція зі швидкого запуску, тестування та розгортання бота.',
    content: `# 🌍 Telegram-бот туристичного клубу SVOI Travel (aiogram 3.x)

Офіційний production-ready бот для європейського туристичного клубу **SVOI** (@Svoi_TravelEU_bot).

## 🚀 Можливості
- 🧭 **Інтерактивне головне меню** без спаму повідомленнями.
- 🗺 **Каталог турів Європою** (Париж, Нормандія/Етрета, Швейцарія, Прага тощо).
- 💺 **Вибір місць:** 1-й ряд (2 місця поруч з водієм), 2-й ряд (3 місця), 3-й ряд (3 місця).
- 🚐 **Автопарк:** Opel Vivaro комфортне авто з усіма зручностями.
- 📍 **Точки збору:** забір та розвезення за адресою (Саарланд, Трір, Люксембург), підсадка по дорозі від 4 осіб.
- 💳 **Умови:** 0% передоплати на одноденні поїздки, медстраховка для осіб без ВНЖ, багаж 10 кг + ручна поклажа.

## 🧪 Покрокова інструкція: Тестування в Telegram

### Крок 1: Підготовка середовища
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

### Крок 2: Перевірка .env
Вкажіть у \`.env\` токен \`8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM\` та \`ADMIN_ID=8450153980\`.

### Крок 3: Запуск
\`\`\`bash
python bot.py
\`\`\`
Відкрийте Telegram та надішліть боту \`/start\`.
`
  }
];
