import asyncio
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
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("svoi_travel_bot")

async def start_health_server():
    """Запуск легкого HTTP-сервера для прохождения проверок (Health Check) на Render/Koyeb"""
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
        logger.warning("Не удалось запустить Health Check сервер (не критично): %s", e)

async def main():
    logger.info("🚀 Запуск Telegram-бота SVOI Travel (@%s)...", settings.BOT_USERNAME)
    
    if not settings.BOT_TOKEN:
        logger.critical("❌ Ошибка: BOT_TOKEN не задан! Укажите его в переменных окружения.")
        return

    # Инициализация бота с поддержкой HTML форматирования по умолчанию
    bot = Bot(
        token=settings.BOT_TOKEN,
        default=DefaultBotProperties(parse_mode=ParseMode.HTML)
    )

    # Инициализация диспетчера с хранилищем FSM состояний в оперативной памяти
    dp = Dispatcher(storage=MemoryStorage())

    # Подключение модульных роутеров
    dp.include_router(menu.router)
    dp.include_router(trips.router)
    dp.include_router(feedback.router)
    dp.include_router(booking.router)
    dp.include_router(faq.router)
    dp.include_router(games.router)

    try:
        # Удаляем старые вебхуки и накопившиеся апдейты
        await bot.delete_webhook(drop_pending_updates=True)
        
        # Получаем информацию о боте для проверки авторизации
        bot_info = await bot.get_me()
        logger.info("✅ Успешное подключение к Telegram API: %s (@%s)", bot_info.first_name, bot_info.username)
        logger.info("📡 Бот ожидает входящие сообщения и нажатия кнопок...")
        
        # Запускаем HTTP сервер здоровья для совместимости с Render Web Service
        await start_health_server()

        # Запуск long polling
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical("❌ Критическая ошибка при работе бота: %s", e, exc_info=True)
    finally:
        logger.info("🛑 Остановка бота и закрытие сессии...")
        await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот остановлен пользователем.")
