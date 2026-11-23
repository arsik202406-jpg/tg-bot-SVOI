"""Група і канал: розіграші, вітання нових учасників, вікторини.

Розіграш:
  /admin → 🎁 Розіграші → «Новий розіграш» → написати приз → обрати, де опублікувати.
  Учасники тиснуть «🎉 Брати участь» — бот перевіряє підписку на канал і рахує учасників.
  «🏆 Обрати переможця» — випадковий вибір серед тих, хто досі підписаний; пост із вітанням.
"""
from __future__ import annotations

import logging
import random
import re
from html import escape

from aiogram import Bot, F, Router
from aiogram.filters.callback_data import CallbackData
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (CallbackQuery, ChatMemberUpdated, InlineKeyboardButton as IB, InlineKeyboardMarkup,
                           KeyboardButton, KeyboardButtonRequestChat, Message, ReplyKeyboardMarkup)
from sqlalchemy import func, select

from .. import keyboards as kb
from ..config import settings
from ..db import Giveaway, GiveawayEntry, GiveawayPost, KnownChat, Session
from ..screens import KeepAll
from .games import GASTRO_QUESTS, GEO_QUESTS, PRICE_QUESTS

log = logging.getLogger(__name__)
router = Router(name="community")


class GwCb(CallbackData, prefix="gw"):
    id: int


class GwAdm(CallbackData, prefix="ga"):
    action: str
    id: int = 0
    chat: int = 0


class GwStates(StatesGroup):
    prize = State()


# ---------- Запам'ятовуємо групи й канали ----------

async def remember_chat(chat, is_admin: bool | None = None) -> None:
    if chat.type not in ("group", "supergroup", "channel"):
        return
    async with Session() as s:
        row = await s.get(KnownChat, chat.id)
        if not row:
            row = KnownChat(chat_id=chat.id, type=chat.type, title=chat.title or "")
            s.add(row)
        row.title = chat.title or row.title
        row.type = chat.type
        if is_admin is not None:
            row.is_admin = int(is_admin)
        await s.commit()


@router.my_chat_member()
async def on_bot_status(event: ChatMemberUpdated, bot: Bot):
    status = event.new_chat_member.status
    is_admin = status in ("administrator", "creator")
    if status in ("left", "kicked"):
        async with Session() as s:
            row = await s.get(KnownChat, event.chat.id)
            if row:
                await s.delete(row)
                await s.commit()
        return
    await remember_chat(event.chat, is_admin)
    where = "канал" if event.chat.type == "channel" else "групу"
    note = ("✅ Тепер можна публікувати туди розіграші, вікторини й анонси (/admin)." if is_admin else
            "⚠️ Зробіть бота адміністратором, щоб він міг публікувати пости й перевіряти підписку.")
    for admin_id in settings.admin_ids:
        try:
            await bot.send_message(admin_id, f"🤖 Бота додано в {where} «{escape(event.chat.title or '')}».\n{note}")
        except Exception:  # noqa: BLE001
            pass


# ---------- Вітання нових учасників групи ----------

def group_welcome_kb(bot_username: str) -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text="🗺 Поїздки та дати", url=f"https://t.me/{bot_username}?start=trips")],
        [IB(text="💬 Запитати менеджера", url=kb.manager_url())],
    ])


@router.message(F.new_chat_members)
async def on_member_join(message: Message, bot: Bot):
    users = [u for u in message.new_chat_members if not u.is_bot]
    if users:
        await _welcome(bot, message.chat, users)
    try:  # прибираємо системне «X вступив у групу», щоб не засмічувати чат
        await message.delete()
    except Exception:  # noqa: BLE001
        pass


async def _welcome(bot: Bot, chat, users) -> None:
    await remember_chat(chat)
    names = ", ".join(escape(u.first_name) for u in users[:3])
    me = await bot.me()
    text = (f"👋 Вітаємо, {names}!\n\n"
            "Це клуб <b>SVOI</b> — поїздки по Європі маленькими групами на мінівені, від дому з Саарланду, "
            "Тріра й Люксембургу. Дати й бронювання — у нашому боті 👇")
    async with Session() as s:
        row = await s.get(KnownChat, chat.id)
        old = row.last_welcome_id if row else None
        try:
            sent = await bot.send_message(chat.id, text, reply_markup=group_welcome_kb(me.username))
        except Exception as e:  # noqa: BLE001
            log.warning("Вітання в групі: %s", e)
            return
        if row:
            row.last_welcome_id = sent.message_id
            await s.commit()
    if old:  # одне вітання в групі — попереднє видаляємо
        try:
            await bot.delete_message(chat.id, old)
        except Exception:  # noqa: BLE001
            pass


@router.message(F.chat.type.in_({"group", "supergroup"}))
async def on_group_message(message: Message):
    """Будь-яке повідомлення в групі — запам'ятати групу (сам бот у групі мовчить)."""
    await remember_chat(message.chat)


@router.channel_post()
async def on_channel_post(message: Message):
    await remember_chat(message.chat)


# ---------- Розіграш: участь ----------

def gw_post_text(prize: str) -> str:
    return (
        "🎉 <b>РОЗІГРАШ ВІД КЛУБУ SVOI!</b>\n\n"
        f"🎁 Приз: <b>{escape(prize)}</b>\n\n"
        "<b>Як взяти участь:</b>\n"
        f"1️⃣ Підпишіться на наш канал: {settings.CHANNEL_URL}\n"
        "2️⃣ Натисніть кнопку «🎉 Брати участь» нижче\n\n"
        "Переможця обере бот випадковим чином серед підписників. Удачі! 🍀"
    )


async def gw_post_kb(bot: Bot, gw_id: int, count: int) -> InlineKeyboardMarkup:
    me = await bot.me()
    return InlineKeyboardMarkup(inline_keyboard=[
        [IB(text=f"🎉 Брати участь ({count})", callback_data=GwCb(id=gw_id).pack())],
        [IB(text="🗺 Поїздки та дати", url=f"https://t.me/{me.username}?start=trips")],
    ])


async def channel_ids() -> list[int | str]:
    """Канали для перевірки підписки: збережені ботом (закриті канали — за числовим ID) + з налаштувань."""
    async with Session() as s:
        known = [c.chat_id for c in await s.scalars(select(KnownChat).where(KnownChat.type == "channel"))]
    extra = [settings.CHANNEL_CHAT_ID] if settings.CHANNEL_CHAT_ID else []
    return known + extra


async def is_subscribed(bot: Bot, user_id: int) -> bool | None:
    """True/False — підписаний на канал; None — перевірити неможливо (бот не знає каналу або не адмін)."""
    for channel in await channel_ids():
        try:
            m = await bot.get_chat_member(channel, user_id)
            return m.status in ("member", "administrator", "creator", "restricted")
        except Exception as e:  # noqa: BLE001
            log.info("Перевірка підписки в %s недоступна: %s", channel, e)
    return None


@router.callback_query(GwCb.filter())
async def cb_join(callback: CallbackQuery, callback_data: GwCb, bot: Bot):
    user = callback.from_user
    async with Session() as s:
        gw = await s.get(Giveaway, callback_data.id)
        if not gw or gw.status != "active":
            return await callback.answer("⏳ Цей розіграш уже завершено. Слідкуйте за новими! 🙌", show_alert=True)
        exists = await s.scalar(select(GiveawayEntry.id).where(
            GiveawayEntry.giveaway_id == gw.id, GiveawayEntry.user_id == user.id))
        if exists:
            return await callback.answer("✅ Ви вже берете участь! Удачі 🍀", show_alert=True)
        sub = await is_subscribed(bot, user.id)
        if sub is False:
            return await callback.answer("Спершу підпишіться на наш канал SVOI (посилання в пості), "
                                         "а потім натисніть кнопку ще раз 🙌", show_alert=True)
        s.add(GiveawayEntry(giveaway_id=gw.id, user_id=user.id, name=user.full_name, username=user.username))
        await s.commit()
        count = await s.scalar(select(func.count(GiveawayEntry.id)).where(GiveawayEntry.giveaway_id == gw.id))
    await callback.answer(f"🎉 Ви в розіграші! Ваш номер: #{count}. Удачі 🍀", show_alert=True)
    try:
        await callback.message.edit_reply_markup(reply_markup=await gw_post_kb(bot, callback_data.id, count))
    except Exception:  # noqa: BLE001
        pass


@router.callback_query(F.data.startswith("gw_join_"))
async def cb_legacy_join(callback: CallbackQuery):
    """Кнопки зі старих постів розіграшу (до оновлення бота)."""
    await callback.answer("Цей розіграш оновлено 🙌 Шукайте новий пост розіграшу в групі.", show_alert=True)


# ---------- Розіграш: адмін ----------

admin = Router(name="community_admin")
admin.message.middleware(KeepAll())
admin.callback_query.middleware(KeepAll())


def _is_admin(user_id: int) -> bool:
    return user_id in settings.admin_ids


@admin.message(F.forward_origin.chat, F.chat.type == "private")
async def on_forward_from_channel(message: Message, bot: Bot):
    """Адмін переслав боту пост із каналу — запам'ятовуємо канал (потрібно для закритих каналів)."""
    if not _is_admin(message.from_user.id):
        return
    chat = message.forward_origin.chat
    try:
        me = await bot.me()
        member = await bot.get_chat_member(chat.id, me.id)
        is_admin = member.status in ("administrator", "creator")
    except Exception:  # noqa: BLE001
        is_admin = False
    await remember_chat(chat, is_admin)
    note = ("Бот там адміністратор — розіграші перевірятимуть підписку на цей канал ✅" if is_admin else
            "⚠️ Бот не адміністратор цього каналу — додайте його адміном, інакше підписку не перевірити.")
    await message.answer(f"📢 Канал «{escape(chat.title or '')}» збережено.\n{note}")


def post_link(chat_id: int, message_id: int) -> str:
    """Посилання на пост (працює для учасників групи/каналу, і відкритих, і закритих)."""
    cid = str(chat_id)
    return f"https://t.me/c/{cid[4:] if cid.startswith('-100') else cid.lstrip('-')}/{message_id}"


async def gw_admin_view(gw_id: int | None = None) -> tuple[str, InlineKeyboardMarkup]:
    async with Session() as s:
        gw = (await s.get(Giveaway, gw_id) if gw_id else
              await s.scalar(select(Giveaway).order_by(Giveaway.id.desc()).limit(1)))
        if not gw:
            rows = [[IB(text="➕ Новий розіграш", callback_data=GwAdm(action="new").pack())],
                    [IB(text="⬅️ Адмін-меню", callback_data=kb.AdmCb(action="menu").pack())]]
            return "🎁 <b>Розіграші</b>\n\nЩе не було жодного розіграшу.", InlineKeyboardMarkup(inline_keyboard=rows)
        count = await s.scalar(select(func.count(GiveawayEntry.id)).where(GiveawayEntry.giveaway_id == gw.id))
        posts = list(await s.scalars(select(GiveawayPost).where(GiveawayPost.giveaway_id == gw.id)))
        titles = {c.chat_id: c for c in await s.scalars(select(KnownChat))}
    status = "🟢 триває" if gw.status == "active" else "🏁 завершено"
    lines = [f"🎁 <b>Розіграш #{gw.id}</b> · {status}", f"Приз: <b>{escape(gw.prize)}</b>",
             f"👥 Учасників: <b>{count}</b>", "", "<b>Де опубліковано:</b>"]
    if posts:
        for p in posts:
            c = titles.get(p.chat_id)
            icon = "📢" if c and c.type == "channel" else "👥"
            name = escape(c.title) if c else str(p.chat_id)
            lines.append(f'{icon} <a href="{post_link(p.chat_id, p.message_id)}">{name}</a> ✅')
    else:
        lines.append("ще ніде — натисніть «Поділитися» 👇")
    if gw.status == "finished":
        lines += ["", f"🏆 Переможець: <b>{escape(gw.winner_name or '')}</b>"]
    rows = []
    if gw.status == "active":
        rows += [
            [IB(text="👥 Поділитися в групі", callback_data=GwAdm(action="share", id=gw.id, chat=2).pack()),
             IB(text="📢 Поділитися в каналі", callback_data=GwAdm(action="share", id=gw.id, chat=1).pack())],
            [IB(text=f"🏆 Обрати переможця ({count})", callback_data=GwAdm(action="pick", id=gw.id).pack())],
        ]
    rows += [[IB(text="🔄 Оновити", callback_data=GwAdm(action="view", id=gw.id).pack()),
              IB(text="➕ Новий розіграш", callback_data=GwAdm(action="new").pack())],
             [IB(text="⬅️ Адмін-меню", callback_data=kb.AdmCb(action="menu").pack())]]
    return "\n".join(lines), InlineKeyboardMarkup(inline_keyboard=rows)


@admin.callback_query(GwAdm.filter(F.action == "view"))
async def cb_gw_view(callback: CallbackQuery, callback_data: GwAdm):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    text, markup = await gw_admin_view(callback_data.id)
    try:
        await callback.message.edit_text(text, reply_markup=markup, disable_web_page_preview=True)
    except Exception:  # noqa: BLE001 — нічого не змінилось
        pass


# ---------- Поділитися: вибір групи/каналу ----------
# chat=1 — канал, chat=2 — група

def chat_picker_kb(gw_id: int, kind: int) -> ReplyKeyboardMarkup:
    """Кнопка Telegram «обрати чат»: показує ваші групи/канали, де є бот."""
    is_channel = kind == 1
    btn = KeyboardButton(
        text="📢 Обрати канал" if is_channel else "👥 Обрати групу",
        request_chat=KeyboardButtonRequestChat(request_id=gw_id * 10 + kind, chat_is_channel=is_channel,
                                               bot_is_member=True, request_title=True))
    return ReplyKeyboardMarkup(keyboard=[[btn], [KeyboardButton(text=kb.BTN_CANCEL)]], resize_keyboard=True,
                               one_time_keyboard=True)


@admin.callback_query(GwAdm.filter(F.action == "share"))
async def cb_gw_share(callback: CallbackQuery, callback_data: GwAdm):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    is_channel = callback_data.chat == 1
    async with Session() as s:
        q = select(KnownChat).where(KnownChat.type == "channel") if is_channel else \
            select(KnownChat).where(KnownChat.type.in_(("group", "supergroup")))
        chats = list(await s.scalars(q))
    what = "канал" if is_channel else "групу"
    if chats:
        rows = [[IB(text=("📢 " if is_channel else "👥 ") + f"Опублікувати в «{c.title[:30]}»",
                    callback_data=GwAdm(action="post", id=callback_data.id, chat=c.chat_id).pack())] for c in chats]
        rows.append([IB(text="➕ Обрати інший канал" if is_channel else "➕ Обрати іншу групу",
                        callback_data=GwAdm(action="picker", id=callback_data.id, chat=callback_data.chat).pack())])
        rows.append([IB(text="⬅️ Назад", callback_data=GwAdm(action="view", id=callback_data.id).pack())])
        return await callback.message.answer("Куди опублікувати розіграш?", reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))
    await callback.message.answer(
        f"Натисніть кнопку внизу екрана і оберіть {what} — Telegram покаже лише ті, де є бот 👇",
        reply_markup=chat_picker_kb(callback_data.id, callback_data.chat))


@admin.callback_query(GwAdm.filter(F.action == "picker"))
async def cb_gw_picker(callback: CallbackQuery, callback_data: GwAdm):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    await callback.message.answer("Натисніть кнопку внизу екрана 👇", reply_markup=chat_picker_kb(callback_data.id, callback_data.chat))


@admin.message(F.chat_shared)
async def on_chat_shared(message: Message, bot: Bot):
    """Адмін обрав групу/канал через кнопку Telegram — публікуємо розіграш туди."""
    if not _is_admin(message.from_user.id):
        return
    shared = message.chat_shared
    gw_id = shared.request_id // 10
    try:
        chat = await bot.get_chat(shared.chat_id)
        await remember_chat(chat, True)
    except Exception as e:  # noqa: BLE001
        return await message.answer(f"Не вдалося відкрити цей чат: {escape(str(e))}\n"
                                    "Перевірте, що бот доданий туди адміністратором.", reply_markup=kb.main_kb())
    ok, info = await publish_giveaway(bot, gw_id, chat.id)
    await message.answer(info, reply_markup=kb.main_kb(), disable_web_page_preview=True)
    text, markup = await gw_admin_view(gw_id)
    await message.answer(text, reply_markup=markup, disable_web_page_preview=True)


async def publish_giveaway(bot: Bot, gw_id: int, chat_id: int) -> tuple[bool, str]:
    async with Session() as s:
        gw = await s.get(Giveaway, gw_id)
        if not gw or gw.status != "active":
            return False, "Цей розіграш уже завершено."
        count = await s.scalar(select(func.count(GiveawayEntry.id)).where(GiveawayEntry.giveaway_id == gw.id))
        try:
            sent = await bot.send_message(chat_id, gw_post_text(gw.prize),
                                          reply_markup=await gw_post_kb(bot, gw.id, count),
                                          disable_web_page_preview=True)
        except Exception as e:  # noqa: BLE001
            log.warning("Публікація розіграшу в %s: %s", chat_id, e)
            return False, (f"❌ Не вдалося опублікувати: {escape(str(e))}\n\n"
                           "Перевірте, що бот — адміністратор із правом «Публікація/надсилання повідомлень».")
        s.add(GiveawayPost(giveaway_id=gw.id, chat_id=chat_id, message_id=sent.message_id))
        await s.commit()
    return True, f'✅ Опубліковано: <a href="{post_link(chat_id, sent.message_id)}">відкрити пост</a>'


@admin.callback_query(kb.AdmCb.filter(F.action == "giveaways"))
async def cb_gw_menu(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    text, markup = await gw_admin_view()
    await callback.message.edit_text(text, reply_markup=markup, disable_web_page_preview=True)


@admin.callback_query(GwAdm.filter(F.action == "new"))
async def cb_gw_new(callback: CallbackQuery, state: FSMContext):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    await state.set_state(GwStates.prize)
    await callback.message.answer("Напишіть приз, наприклад: <i>Безкоштовне місце в поїздці до Брюгге</i>\n/cancel — скасувати")


@admin.message(GwStates.prize, F.text, ~F.text.startswith("/"))
async def msg_gw_prize(message: Message, state: FSMContext):
    if not _is_admin(message.from_user.id):
        return
    await state.clear()
    async with Session() as s:
        for old in await s.scalars(select(Giveaway).where(Giveaway.status == "active")):
            old.status = "finished"
        gw = Giveaway(prize=message.text.strip()[:300])
        s.add(gw)
        await s.commit()
    text, markup = await gw_admin_view(gw.id)
    await message.answer("✅ Розіграш створено. Тепер опублікуйте його 👇\n\n" + text, reply_markup=markup)


@admin.callback_query(GwAdm.filter(F.action == "post"))
async def cb_gw_post(callback: CallbackQuery, callback_data: GwAdm, bot: Bot):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    ok, info = await publish_giveaway(bot, callback_data.id, callback_data.chat)
    await callback.answer("Опубліковано ✅" if ok else "Не вдалося", show_alert=not ok)
    text, markup = await gw_admin_view(callback_data.id)
    await callback.message.edit_text(info + "\n\n" + text, reply_markup=markup, disable_web_page_preview=True)


@admin.callback_query(GwAdm.filter(F.action == "pick"))
async def cb_gw_pick(callback: CallbackQuery, callback_data: GwAdm, bot: Bot):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    async with Session() as s:
        gw = await s.get(Giveaway, callback_data.id)
        entries = list(await s.scalars(select(GiveawayEntry).where(GiveawayEntry.giveaway_id == gw.id)))
    if not entries:
        return await callback.answer("Ще немає жодного учасника 🙂", show_alert=True)
    await callback.answer("Обираю…")
    random.shuffle(entries)
    winner = None
    for e in entries:  # переможець має бути досі підписаний на канал
        if await is_subscribed(bot, e.user_id) is not False:
            winner = e
            break
    if not winner:
        return await callback.message.answer("Жоден учасник уже не підписаний на канал 🤷")
    who = escape(winner.name) + (f" (@{escape(winner.username)})" if winner.username else "")
    await callback.message.answer(
        f"🏆 Випадковий вибір серед {len(entries)} учасників:\n<b>{who}</b>\n\nОпублікувати результат?",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [IB(text="✅ Так, оголосити переможця", callback_data=GwAdm(action="announce", id=gw.id, chat=winner.user_id).pack())],
            [IB(text="🔄 Обрати іншого", callback_data=GwAdm(action="pick", id=gw.id).pack())],
        ]))


@admin.callback_query(GwAdm.filter(F.action == "announce"))
async def cb_gw_announce(callback: CallbackQuery, callback_data: GwAdm, bot: Bot):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    async with Session() as s:
        gw = await s.get(Giveaway, callback_data.id)
        if gw.status == "finished":
            return await callback.answer("Переможця вже оголошено", show_alert=True)
        winner = await s.scalar(select(GiveawayEntry).where(
            GiveawayEntry.giveaway_id == gw.id, GiveawayEntry.user_id == callback_data.chat))
        count = await s.scalar(select(func.count(GiveawayEntry.id)).where(GiveawayEntry.giveaway_id == gw.id))
        posts = list(await s.scalars(select(GiveawayPost).where(GiveawayPost.giveaway_id == gw.id)))
        gw.status = "finished"
        gw.winner_user_id = winner.user_id
        gw.winner_name = winner.name + (f" @{winner.username}" if winner.username else "")
        await s.commit()
    tag = (f"@{escape(winner.username)}" if winner.username
           else f'<a href="tg://user?id={winner.user_id}">{escape(winner.name)}</a>')
    post = (f"🏆 <b>Підсумки розіграшу SVOI!</b>\n\n🎁 Приз: <b>{escape(gw.prize)}</b>\n"
            f"👥 Учасників: {count}\n\n🥳 Переможець: <b>{tag}</b>!\n\n"
            "Вітаємо! Менеджер напише вам найближчим часом 🚐\nДякуємо всім за участь — новий розіграш уже скоро!")
    done = 0
    for p in posts:
        try:
            await bot.send_message(p.chat_id, post, reply_to_message_id=p.message_id)
            await bot.edit_message_reply_markup(chat_id=p.chat_id, message_id=p.message_id, reply_markup=None)
            done += 1
        except Exception as e:  # noqa: BLE001
            log.warning("Оголошення переможця: %s", e)
    try:
        await bot.send_message(winner.user_id, f"🎉 Вітаємо! Ви виграли в розіграші SVOI: <b>{escape(gw.prize)}</b>!\n"
                                               "Менеджер зв'яжеться з вами найближчим часом.")
    except Exception:  # noqa: BLE001
        pass  # переможець ще не запускав бота — менеджер напише сам
    await callback.answer("Оголошено ✅")
    await callback.message.edit_text(f"✅ Переможця оголошено в {done} чатах.\n\n{post}")


# ---------- Вікторина в групу/канал ----------

def _plain(html_text: str) -> str:
    return re.sub(r"<[^>]+>", "", html_text).strip()


def random_quiz() -> dict:
    q = random.choice(GEO_QUESTS + GASTRO_QUESTS + PRICE_QUESTS)
    opts = list(q["options"])
    random.shuffle(opts)
    question = _plain(q["question"]).split("\n")
    title = question[0].split(":", 1)[-1].strip() if len(question) == 1 else " ".join(x for x in question[1:] if x).strip()
    return {
        "question": ("🧠 " + (title or question[0]))[:300],
        "options": [_plain(o[0])[:100] for o in opts],
        "correct": next(i for i, o in enumerate(opts) if o[1]),
        "explanation": _plain(q.get("fact", ""))[:200],
    }


@admin.callback_query(kb.AdmCb.filter(F.action == "quiz"))
async def cb_quiz_menu(callback: CallbackQuery):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    await callback.answer()
    async with Session() as s:
        chats = list(await s.scalars(select(KnownChat)))
    if not chats:
        return await callback.message.answer("Бот ще не знає жодної групи чи каналу. Додайте його туди адміністратором.")
    rows = [[IB(text=("📢 " if c.type == "channel" else "👥 ") + c.title[:40],
                callback_data=kb.AdmCb(action="quiz_send", id=0, extra=str(c.chat_id)).pack())] for c in chats]
    rows.append([IB(text="⬅️ Адмін-меню", callback_data=kb.AdmCb(action="menu").pack())])
    await callback.message.edit_text("🧠 Куди надіслати випадкову вікторину про Європу?",
                                     reply_markup=InlineKeyboardMarkup(inline_keyboard=rows))


@admin.callback_query(kb.AdmCb.filter(F.action == "quiz_send"))
async def cb_quiz_send(callback: CallbackQuery, callback_data: kb.AdmCb, bot: Bot):
    if not _is_admin(callback.from_user.id):
        return await callback.answer()
    q = random_quiz()
    chat_id = int(callback_data.extra)
    for anonymous in (False, True):  # у каналах опитування можуть бути лише анонімні
        try:
            await bot.send_poll(chat_id, q["question"], q["options"], type="quiz", correct_option_id=q["correct"],
                                explanation=q["explanation"] or None, is_anonymous=anonymous)
            return await callback.answer("Вікторину надіслано ✅", show_alert=True)
        except Exception as e:  # noqa: BLE001
            error = e
    await callback.answer(f"Не вдалося: {error}", show_alert=True)
