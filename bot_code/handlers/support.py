"""Питання клієнтів: будь-яке повідомлення пересилається менеджеру, відповідь менеджера — назад клієнту."""
from __future__ import annotations

import logging
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters import Filter
from aiogram.fsm.context import FSMContext
from aiogram.types import Message
from sqlalchemy import select

from .. import ai
from .. import keyboards as kb
from ..config import settings
from ..db import Session, SupportThread
from ..screens import keep, keep_incoming

log = logging.getLogger(__name__)
router = Router(name="support")


class IsAdmin(Filter):
    async def __call__(self, message: Message) -> bool:
        return bool(message.from_user and message.from_user.id in settings.admin_ids)


@router.message(F.text == kb.BTN_ASK)
async def ask_question(message: Message, state: FSMContext):
    await state.clear()
    if await ai.is_enabled():
        text = ("Напишіть своє питання — відповість помічник SVOI, а якщо потрібно, підключиться менеджер 🙌\n"
                "Можна одразу написати, наприклад: «Хочу в Париж удвох, забрати з Тріра».")
    else:
        text = "Напишіть своє питання одним повідомленням (можна голосовим) — менеджер відповість тут, у цьому чаті 🙌"
    await message.answer(text, reply_markup=kb.main_kb())


@router.message(IsAdmin(), F.reply_to_message)
async def admin_reply(message: Message, bot: Bot):
    """Адмін відповідає (Reply) на переслане питання → відповідь іде клієнту від імені бота."""
    async with Session() as s:
        thread = await s.scalar(select(SupportThread).where(
            SupportThread.admin_chat_id == message.chat.id,
            SupportThread.admin_message_id == message.reply_to_message.message_id))
    if not thread:
        await message.answer("Щоб відповісти клієнту, натисніть «Відповісти» (Reply) саме на його питання.")
        return
    try:
        await bot.copy_message(thread.user_id, message.chat.id, message.message_id)
        await ai.pause_for(thread.user_id)  # менеджер узяв розмову — помічник поки мовчить
        await message.reply("✅ Відповідь надіслано клієнту. Помічник не втручатиметься в цю розмову 6 годин.")
    except Exception as e:  # noqa: BLE001
        await message.reply(f"Не вдалося надіслати: {escape(str(e))}")


@router.message(~IsAdmin(), F.chat.type == "private")
async def forward_question(message: Message, bot: Bot):
    """Усе, що клієнт написав поза кнопками: спершу відповідає ШІ-помічник, інакше — менеджеру."""
    keep_incoming()  # питання клієнта не видаляємо з чату
    if await ai.handle(bot, message):
        return
    user = message.from_user
    who = escape(user.full_name) + (f" @{user.username}" if user.username else "")
    header = f"❓ <b>Питання від {who}</b>\n<i>Натисніть «Відповісти» на повідомлення нижче — відповідь піде клієнту.</i>"
    delivered = False
    async with Session() as s:
        for admin_id in settings.admin_ids:
            try:
                head = await bot.send_message(admin_id, header)
                copied = await bot.copy_message(admin_id, message.chat.id, message.message_id)
                for mid in (head.message_id, copied.message_id):  # відповісти можна на будь-яке з двох
                    s.add(SupportThread(admin_chat_id=admin_id, admin_message_id=mid, user_id=user.id))
                delivered = True
            except Exception as e:  # noqa: BLE001
                log.error("Не вдалося переслати питання адміну %s: %s", admin_id, e)
        await s.commit()
    if delivered and await ai.is_paused(user.id):
        return  # менеджер уже веде розмову — не дублюємо «передали менеджеру»
    text = ("Дякуємо! Передали ваше повідомлення менеджеру — відповімо тут найближчим часом 🙌\n"
            "А поки можете подивитись «🗺 Поїздки та дати»." if delivered else
            f"Напишіть, будь ласка, менеджеру напряму: @{settings.MANAGER_USERNAME.lstrip('@')}")
    with keep():
        await message.answer(text, reply_markup=kb.main_kb())


@router.message(IsAdmin(), F.chat.type == "private")
async def admin_fallback(message: Message):
    await message.answer("Ви адміністратор 👑 Меню: /admin\n"
                         "Щоб відповісти клієнту — натисніть «Відповісти» на його питання.")
