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
    from bot_code.handlers import menu, trips, feedback, booking, faq, games, channel
except ModuleNotFoundError:
    from config import settings
    from handlers import menu, trips, feedback, booking, faq, games, channel

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

    # Запускаємо HTTP сервер здоров'я для сумісності з Render Web Service ОДРАЗУ
    await start_health_server()

    # Ініціалізація диспетчера з пам'яттю станів FSM
    dp = Dispatcher(storage=MemoryStorage())

    # Підключення модульних роутерів
    dp.include_router(menu.router)
    dp.include_router(trips.router)
    dp.include_router(feedback.router)
    dp.include_router(booking.router)
    dp.include_router(faq.router)
    dp.include_router(games.router)
    dp.include_router(channel.router)

    try:
        token = settings.BOT_TOKEN.strip() if settings.BOT_TOKEN else ""
        if not token:
            logger.critical("❌ Помилка: BOT_TOKEN порожній! Перевірте налаштування в Render Environment Variables.")
            return

        bot = Bot(
            token=token,
            default=DefaultBotProperties(parse_mode=ParseMode.HTML)
        )

        # Очищуємо старі вебхуки та чергу оновлень перед запуском
        try:
            await bot.delete_webhook(drop_pending_updates=True)
        except Exception as e:
            logger.warning("Попередження при видаленні вебхука: %s", e)
        
        # Отримуємо інформацію про бота для перевірки авторизації
        bot_info = await bot.get_me()
        logger.info("✅ Успішне підключення до Telegram API: %s (@%s)", bot_info.first_name, bot_info.username)
        logger.info("📡 Бот очікує на вхідні повідомлення та команди у Telegram...")

        # Запуск long polling
        await dp.start_polling(bot)
    except Exception as e:
        logger.critical("❌ Критична помилка під час роботи бота: %s", e, exc_info=True)
        # Якщо сталася помилка конфлікту або авторизації, виводимо зрозумілу підказку
        if "Conflict" in str(e):
            logger.critical("⚠️ УВАГА! Інший екземпляр бота вже запущений з цим токеном (на комп'ютері або на іншому сервері). Зупиніть попередній запуск!")
        elif "Unauthorized" in str(e):
            logger.critical("⚠️ УВАГА! Токен бота недійсний. Перевірте BOT_TOKEN у BotFather!")
    finally:
        logger.info("🛑 Зупинка бота та закриття сесії...")
        if 'bot' in locals():
            await bot.session.close()

if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот зупинено користувачем.")
