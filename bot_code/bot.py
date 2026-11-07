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

import aiohttp
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


async def start_health_server() -> int:
    """Запуск легкого HTTP-сервера для прохождения проверок (Health Check) на Render/Koyeb"""
    port = int(os.environ.get("PORT", 10000))
    try:
        app = web.Application()

        async def health_check(_request):
            return web.Response(text="SVOI Travel Bot 24/7 is active and running! 🌍", status=200)

        app.router.add_get("/", health_check)
        app.router.add_get("/health", health_check)

        runner = web.AppRunner(app)
        await runner.setup()
        site = web.TCPSite(runner, "0.0.0.0", port)
        await site.start()
        logger.info("🌐 Health Check сервер запущен на порту %d", port)
    except Exception as e:
        logger.warning("Не удалось запустить Health Check сервер (не критично): %s", e)
    return port


async def keep_alive_self_ping(port: int):
    """Фоновий анти-сон пінг кожні 4 хвилини, щоб сервер Render ніколи не засинав"""
    external_url = os.environ.get("RENDER_EXTERNAL_URL", "").rstrip("/")
    target_url = f"{external_url}/health" if external_url else f"http://127.0.0.1:{port}/health"
    while True:
        await asyncio.sleep(240)
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(target_url, timeout=10) as resp:
                    logger.debug("Keep-alive ping %s -> %d", target_url, resp.status)
        except Exception:
            pass


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher(storage=MemoryStorage())
    dp.include_router(booking.router)
    dp.include_router(feedback.router)
    dp.include_router(channel.router)
    dp.include_router(trips.router)
    dp.include_router(faq.router)
    dp.include_router(games.router)
    dp.include_router(menu.router)
    return dp


async def main():
    logger.info("🚀 Запуск Telegram-бота SVOI Travel (@%s)...", settings.BOT_USERNAME)

    # 1. Запускаємо HTTP сервер здоров'я ОДРАЗУ, щоб Render бачив відкритий порт
    port = await start_health_server()
    asyncio.create_task(keep_alive_self_ping(port))

    # 2. Нескінченний цикл самовідновлення (Auto-Healing 24/7 Loop):
    # Навіть якщо тимчасово виникне 409 Conflict (коли відкрито AI Studio) або обрив мережі,
    # бот на Render НІКОЛИ не вимкнеться і автоматично відновить роботу за кілька секунд!
    while True:
        token = (
            os.environ.get("BOT_TOKEN")
            or os.environ.get("TELEGRAM_BOT_TOKEN")
            or settings.BOT_TOKEN
            or ""
        ).strip()

        if not token:
            logger.error(
                "❌ BOT_TOKEN не задано в Render Environment Variables! "
                "Додайте новий BOT_TOKEN у вкладці Environment на Render. Повторна перевірка через 15 сек..."
            )
            await asyncio.sleep(15)
            continue

        bot = None
        try:
            bot = Bot(
                token=token,
                default=DefaultBotProperties(parse_mode=ParseMode.HTML)
            )

            try:
                await bot.delete_webhook(drop_pending_updates=False)
            except Exception as e:
                logger.warning("Попередження при видаленні вебхука: %s", e)

            bot_info = await bot.get_me()
            logger.info("✅ Успішне підключення 24/7 до Telegram API: %s (@%s)", bot_info.first_name, bot_info.username)

            try:
                from aiogram.types import MenuButtonWebApp, WebAppInfo
                await bot.set_chat_menu_button(
                    menu_button=MenuButtonWebApp(
                        text="🚀 SVOI Mini App",
                        web_app=WebAppInfo(url=settings.MINI_APP_URL)
                    )
                )
            except Exception as e:
                logger.warning("Попередження при налаштуванні MenuButtonWebApp: %s", e)

            dp = build_dispatcher()
            logger.info("📡 Бот 24/7 очікує на повідомлення у Telegram...")

            await dp.start_polling(
                bot,
                allowed_updates=["message", "callback_query", "my_chat_member", "chat_member", "poll"],
                close_bot_session=True,
            )
        except asyncio.CancelledError:
            break
        except Exception as e:
            err_str = str(e)
            if "Conflict" in err_str:
                logger.warning(
                    "⚠️ Виявлено тимчасовий 409 Conflict (паралельний запуск у прев'ю). "
                    "Чекаємо 10 секунд і автоматично перехоплюємо керування назад на Render..."
                )
                await asyncio.sleep(10)
            elif "Unauthorized" in err_str:
                logger.critical(
                    "❌ Токен бота недійсний (401 Unauthorized)! Оновіть BOT_TOKEN у Render -> Environment Variables. "
                    "Повторна спроба через 20 секунд..."
                )
                await asyncio.sleep(20)
            else:
                logger.error("⚠️ Помилка з'єднання (%s). Автоматичний перезапуск через 5 секунд...", e)
                await asyncio.sleep(5)
        finally:
            if bot is not None:
                try:
                    await bot.session.close()
                except Exception:
                    pass

        await asyncio.sleep(3)


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except (KeyboardInterrupt, SystemExit):
        logger.info("Бот зупинено користувачем.")
