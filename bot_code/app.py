"""Точка входу: бот (polling) + HTTP API для Mini App в одному процесі."""
from __future__ import annotations

import asyncio
import logging
import sys

import aiohttp
from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.types import BotCommand, MenuButtonWebApp, WebAppInfo
from aiohttp import web

from .api import build_app
from .config import settings
from .db import init_db
from .handlers import address_edit, admin, client, community, extras, games, ops, support, tripday
from .jobs import scheduler
from .screens import CleanChat, TrackRequests

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                    stream=sys.stdout)
log = logging.getLogger("svoi")


def build_dispatcher() -> Dispatcher:
    dp = Dispatcher()
    dp.update.outer_middleware(CleanChat())  # прибирання старих повідомлень у чаті клієнта
    dp.include_router(tripday.router)  # групи поїздок — раніше за загальну групу (там свої правила)
    dp.include_router(community.router)  # групи й канали: першим, щоб бот мовчав у групі
    dp.include_router(community.admin)
    dp.include_router(ops.router)
    dp.include_router(admin.router)
    dp.include_router(address_edit.router)
    dp.include_router(extras.router)
    dp.include_router(client.router)
    dp.include_router(games.router)
    dp.include_router(support.router)  # останнім: ловить усі інші повідомлення
    return dp


async def keep_alive() -> None:
    """Render free «засинає» без запитів. Пінгуємо себе кожні 10 хвилин."""
    if not settings.public_url:
        return
    url = f"{settings.public_url}/health"
    while True:
        await asyncio.sleep(600)
        try:
            async with aiohttp.ClientSession() as session:
                await session.get(url, timeout=aiohttp.ClientTimeout(total=15))
        except Exception:  # noqa: BLE001
            pass


async def setup_bot_ui(bot: Bot) -> None:
    await bot.set_my_commands([
        BotCommand(command="start", description="🏠 Головне меню"),
        BotCommand(command="privacy", description="🔒 Політика конфіденційності"),
    ])
    # Текст «Що вміє цей бот?» на першому екрані
    description = (
        "🚐 SVOI — поїздки по Європі маленькими групами (до 8 людей) на мінівені Opel Vivaro.\n\n"
        "• Забираємо від дому: Саарланд, Трір, Люксембург\n"
        "• Одноденні поїздки — без передоплати\n"
        "• Париж, Брюгге, Амстердам, Комо, Швейцарія та інші\n\n"
        "👇 Натисніть «Старт», щоб побачити дати й забронювати місце."
    )
    try:
        current = await bot.get_my_description()
        if current.description != description:
            await bot.set_my_description(description)
            await bot.set_my_short_description("Поїздки по Європі на мінівені з Саарланду, Тріра й Люксембургу 🚐")
    except Exception as e:  # noqa: BLE001
        log.warning("Опис бота: %s", e)
    if settings.webapp_url.startswith("https://"):
        await bot.set_chat_menu_button(menu_button=MenuButtonWebApp(
            text="Забронювати", web_app=WebAppInfo(url=settings.webapp_url)))
        log.info("Mini App: %s", settings.webapp_url)


async def main() -> None:
    if not settings.token:
        log.critical("BOT_TOKEN не задано. Додайте його в Render → Environment.")
        await asyncio.sleep(60)
        sys.exit(1)

    await init_db()
    bot = Bot(settings.token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    bot.session.middleware(TrackRequests())
    dp = build_dispatcher()

    runner = web.AppRunner(build_app(bot, settings.token))
    await runner.setup()
    await web.TCPSite(runner, "0.0.0.0", settings.PORT).start()
    log.info("HTTP API на порту %s", settings.PORT)

    try:
        await setup_bot_ui(bot)
    except Exception as e:  # noqa: BLE001
        log.warning("Не вдалося налаштувати меню бота: %s", e)

    asyncio.create_task(keep_alive())
    asyncio.create_task(scheduler(bot))
    while True:  # чекаємо, поки Telegram стане доступним (збої мережі при старті)
        try:
            await bot.delete_webhook(drop_pending_updates=False)
            me = await bot.get_me()
            break
        except Exception as e:  # noqa: BLE001
            log.error("Немає зв'язку з Telegram (%s). Повтор через 15 с…", e)
            await asyncio.sleep(15)
    log.info("✅ Бот @%s запущено", me.username)
    try:
        await dp.start_polling(bot, allowed_updates=dp.resolve_used_update_types())
    finally:
        await runner.cleanup()
        await bot.session.close()
