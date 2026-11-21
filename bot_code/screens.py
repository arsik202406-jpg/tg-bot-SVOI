"""Чистий чат: старі «екрани» бота і натискання кнопок клієнта видаляються, коли з'являється новий екран.

Залишаються назавжди: підтвердження броні, відповіді менеджера та ШІ-помічника, розсилки.
Логіка:
  • Кожне повідомлення бота клієнту в межах обробки його дії запам'ятовується як «тимчасове»
    (якщо не обгорнуте в `keep()`).
  • Коли обробка дії клієнта надіслала новий тимчасовий екран — попередні тимчасові повідомлення
    та саме повідомлення клієнта (натиснута кнопка, введена адреса) видаляються.
Telegram дозволяє видаляти повідомлення лише протягом 48 годин — старіші просто залишаються.
"""
from __future__ import annotations

import asyncio
import logging
from contextlib import contextmanager
from contextvars import ContextVar
from typing import Any, Awaitable, Callable

from aiogram import BaseMiddleware, Bot
from aiogram.client.session.middlewares.base import BaseRequestMiddleware, NextRequestMiddlewareType
from aiogram.methods import SendMessage, SendPhoto, TelegramMethod
from aiogram.methods.base import Response, TelegramType
from aiogram.types import Message, TelegramObject, Update

from .config import settings

log = logging.getLogger(__name__)

# chat_id → id тимчасових повідомлень бота (у пам'яті; після перезапуску просто почнеться з нуля)
_ephemeral: dict[int, list[int]] = {}
# Стан поточної дії клієнта: {"chat": id, "sent": bool, "keep_incoming": bool}
_current: ContextVar[dict | None] = ContextVar("svoi_screen", default=None)
_keep: ContextVar[bool] = ContextVar("svoi_keep", default=False)

MAX_TRACKED = 60


@contextmanager
def keep():
    """Повідомлення, надіслані всередині, не видаляються."""
    token = _keep.set(True)
    try:
        yield
    finally:
        _keep.reset(token)


def keep_incoming() -> None:
    """Не видаляти повідомлення клієнта з поточної дії (наприклад, його питання)."""
    cur = _current.get()
    if cur is not None:
        cur["keep_incoming"] = True


class TrackRequests(BaseRequestMiddleware):
    """Запам'ятовує тимчасові повідомлення бота поточному клієнту."""

    async def __call__(self, make_request: NextRequestMiddlewareType[TelegramType], bot: Bot,
                       method: TelegramMethod[TelegramType]) -> Response[TelegramType]:
        response = await make_request(bot, method)
        cur = _current.get()
        if cur is None or _keep.get() or not isinstance(method, (SendMessage, SendPhoto)):
            return response
        # make_request повертає вже готовий об'єкт (Message), а не обгортку Response
        result = response if isinstance(response, Message) else getattr(response, "result", None)
        if isinstance(result, Message) and result.chat.id == cur["chat"]:
            lst = _ephemeral.setdefault(cur["chat"], [])
            lst.append(result.message_id)
            del lst[:-MAX_TRACKED]
            cur["sent"] = True
        return response


class CleanChat(BaseMiddleware):
    """Після кожної дії клієнта прибирає попередні екрани, якщо з'явився новий."""

    async def __call__(self, handler: Callable[[TelegramObject, dict[str, Any]], Awaitable[Any]],
                       event: TelegramObject, data: dict[str, Any]) -> Any:
        if not isinstance(event, Update):
            return await handler(event, data)
        msg = event.message
        cq = event.callback_query
        chat = (msg.chat if msg else cq.message.chat if cq and cq.message else None)
        user = (msg.from_user if msg else cq.from_user if cq else None)
        if not chat or chat.type != "private" or not user or user.id in settings.admin_ids:
            return await handler(event, data)

        previous = _ephemeral.pop(chat.id, [])
        state = {"chat": chat.id, "sent": False, "keep_incoming": False}
        token = _current.set(state)
        try:
            return await handler(event, data)
        finally:
            _current.reset(token)
            if state["sent"]:
                to_delete = list(previous)
                if msg and not state["keep_incoming"]:
                    to_delete.append(msg.message_id)
                bot: Bot = data["bot"]
                asyncio.create_task(_delete(bot, chat.id, to_delete))
            else:
                # новий екран не з'явився (наприклад, кнопку змінено на місці) — нічого не видаляємо
                _ephemeral[chat.id] = previous + _ephemeral.get(chat.id, [])


async def _delete(bot: Bot, chat_id: int, ids: list[int]) -> None:
    if not ids:
        return
    try:
        await bot.delete_messages(chat_id, ids[:100])
    except Exception:  # noqa: BLE001 — старші за 48 год або вже видалені
        for mid in ids:
            try:
                await bot.delete_message(chat_id, mid)
            except Exception:  # noqa: BLE001
                pass
