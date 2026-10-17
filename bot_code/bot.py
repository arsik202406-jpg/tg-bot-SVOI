import asyncio
import logging
import sys

from aiogram import Bot, Dispatcher
from aiogram.enums import ParseMode
from aiogram.client.default import DefaultBotProperties
from aiogram.fsm.storage.memory import MemoryStorage

from bot_code.config import settings
from bot_code.handlers import menu, trips, feedback, booking, faq, games

# Настройка логирования
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("svoi_travel_bot")

async def main():
    logger.info("🚀 Запуск Telegram-бота SVOI Travel (@%s)...", settings.BOT_USERNAME)
    
    if not settings.BOT_TOKEN or "AAGjza" not in settings.BOT_TOKEN:
        logger.warning("⚠️ Внимание: проверьте правильность токена в .env файле!")

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
