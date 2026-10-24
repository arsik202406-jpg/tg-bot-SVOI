"""
Роутер для керування Telegram-каналом та групою SVOI Travel (/channel)
ДОСТУП ВИКЛЮЧНО ДЛЯ АДМІНІСТРАТОРА

Функціонал:
1. Пряма публікація постів турів із кнопкою «💺 Забронювати» у канал
2. Запуск РОЗІГРАШІВ (Giveaways) з реальною публікацією в канал, кнопкою «🎉 Брати участь! (N)» та перевіркою підписки
3. Випадковий вибір переможця розіграшу (random) та публікація привітання у канал
4. Надсилання офіційної вікторини (Quiz) у канал
5. Публікація кнопки Telegram Mini App у канал
6. Перегляд та керування Листом очікування (Waitlist)
"""

import random
import logging
from typing import Dict, List, Any
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo, ChatMemberUpdated
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

try:
    from bot_code.config import settings
    from bot_code.data.trips import TRIPS_CATALOG, TRIPS_DATA, WAITLIST_DATA
except (ModuleNotFoundError, ImportError):
    try:
        from config import settings
        from data.trips import TRIPS_CATALOG, TRIPS_DATA, WAITLIST_DATA
    except Exception:
        from data.trips import TRIPS_CATALOG, WAITLIST_DATA
        TRIPS_DATA = list(TRIPS_CATALOG.values())

logger = logging.getLogger(__name__)
router = Router(name="channel_router")

# Стан FSM для створення розіграшу та квізу
class ChannelAdminStates(StatesGroup):
    waiting_for_giveaway_prize = State()
    waiting_for_giveaway_prize_group = State()
    waiting_for_channel_id = State()
    waiting_for_group_id = State()

# Сховище активних розіграшів у пам'яті (giveaway_id -> data)
GIVEAWAYS_DB: Dict[str, Dict[str, Any]] = {
    "gw_active": {
        "id": "gw_active",
        "prize": "Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼",
        "participants": [],  # list of {user_id, username, first_name}
        "is_active": True,
        "winner": None,
        "message_id": None
    }
}

CURRENT_CHANNEL_TARGET = settings.CHANNEL_CHAT_ID or "@svoi_traveleu"
CURRENT_GROUP_TARGET = getattr(settings, "GROUP_CHAT_ID", "") or ""
CURRENT_GROUP_TITLE = "Група SVOI Travel"

def get_channel_menu_keyboard() -> InlineKeyboardMarkup:
    """Головне меню керування каналом та групою для адміна"""
    gw = GIVEAWAYS_DB.get("gw_active", {})
    count = len(gw.get("participants", []))
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🎁 Створити новий розіграш (в Адмінці)", callback_data="cb_adm_gw_new")
            ],
            [
                InlineKeyboardButton(text=f"📋 Картка розіграшу в Адмінці ({count} уч.)", callback_data="cb_adm_gw_card")
            ],
            [
                InlineKeyboardButton(text="👥 Поділитися розіграшем у ГРУПІ", callback_data="cb_adm_gw_share_group")
            ],
            [
                InlineKeyboardButton(text=f"🏆 Вибрати переможця розіграшу ({count} уч.)", callback_data="cb_adm_gw_pick")
            ],
            [
                InlineKeyboardButton(text="📢 Опублікувати тур у канал", callback_data="cb_adm_post_tour"),
                InlineKeyboardButton(text="🧠 Надіслати вікторину (Квіз)", callback_data="cb_adm_send_quiz")
            ],
            [
                InlineKeyboardButton(text="🚀 Опублікувати Mini App у канал", callback_data="cb_adm_post_miniapp")
            ],
            [
                InlineKeyboardButton(text="⚙️ Прив’язати ГРУПУ", callback_data="cb_adm_set_group"),
                InlineKeyboardButton(text="⚙️ Прив’язати КАНАЛ", callback_data="cb_adm_set_channel")
            ],
            [
                InlineKeyboardButton(text="📋 Переглянути Лист очікування", callback_data="cb_adm_waitlist"),
                InlineKeyboardButton(text="🔙 Повернутися в головне меню", callback_data="cb_back")
            ]
        ]
    )

def get_giveaway_button(gw_id: str, count: int) -> InlineKeyboardMarkup:
    """Чиста кнопка для публічного поста розіграшу в ГРУПІ та КАНАЛІ (без адмінських кнопок)"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=f"🎉 Брати участь! ({count})", callback_data=f"gw_join_{gw_id}")
            ],
            [
                InlineKeyboardButton(text="💺 Забронювати місце в турі", url=f"https://t.me/{settings.BOT_USERNAME}?start=trips")
            ]
        ]
    )

def get_admin_giveaway_card_text() -> str:
    """Текст картки розіграшу, який публікується спочатку В АДМІНЦІ"""
    gw = GIVEAWAYS_DB.get("gw_active", {})
    prize_text = gw.get("prize", "Безкоштовне місце в турі SVOI")
    count = len(gw.get("participants", []))
    grp_status = f"<code>{CURRENT_GROUP_TARGET}</code> ({CURRENT_GROUP_TITLE}) ✅" if CURRENT_GROUP_TARGET else "<i>ще не прив'язана (напишіть у групі будь-яке слово)</i>"
    return (
        "👑 <b>КАРТКА РОЗІГРАШУ В АДМІН-ПАНЕЛІ</b>\n"
        "<i>(Цей пост та кнопки керування бачите ТІЛЬКИ ВИ як адміністратор)</i>\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        "🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b> 🌍✨\n\n"
        "Ми розігруємо неймовірний приз серед учасників нашої спільноти:\n"
        f"🎁 <b>{prize_text}</b>\n\n"
        "<b>Умови участі максимально прості:</b>\n"
        "1️⃣ Бути учасником нашої групи та підписаним на канал SVOI\n"
        f"2️⃣ Натиснути кнопку <b>«🎉 Брати участь! ({count})»</b> під постом у групі!\n"
        "━━━━━━━━━━━━━━━━━━━━\n"
        f"📊 <b>Зареєстровано учасників:</b> <b>{count}</b>\n"
        f"👥 <b>Цільова група:</b> {grp_status}\n\n"
        "👇 <b>Керування розіграшем (тільки для Адміна):</b>\n"
        "• Натисніть <b>«👥 Поділитися в ГРУПІ»</b>, щоб бот опублікував цей розіграш у вашій групі.\n"
        "• Коли всі учасники натиснуть «Брати участь!», натисніть <b>«🏆 Вибрати переможця розіграшу»</b>."
    )

def get_admin_giveaway_card_kb() -> InlineKeyboardMarkup:
    gw = GIVEAWAYS_DB.get("gw_active", {})
    count = len(gw.get("participants", []))
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👥 Поділитися в ГРУПІ (Опублікувати розіграш у групі)", callback_data="cb_adm_gw_share_group")
            ],
            [
                InlineKeyboardButton(text="📢 Поділитися в КАНАЛІ", callback_data="cb_adm_gw_share_channel")
            ],
            [
                InlineKeyboardButton(text=f"🏆 Вибрати переможця розіграшу (Учасників: {count})", callback_data="cb_adm_gw_pick")
            ],
            [
                InlineKeyboardButton(text="✏️ Змінити приз / Новий розіграш", callback_data="cb_adm_gw_new")
            ],
            [
                InlineKeyboardButton(text="🔙 Назад до Адмін-панелі", callback_data="cb_adm_channel_menu")
            ]
        ]
    )

async def check_is_admin(user_id: int) -> bool:
    """Перевіряє, чи є користувач адміністратором"""
    return (user_id == settings.ADMIN_ID) or (settings.ADMIN_ID == 0)

@router.message(Command("channel"))
async def cmd_channel_admin(message: Message):
    """Команда /channel — центр керування каналом та групою для адміністратора"""
    user_id = message.from_user.id if message.from_user else 0
    if not (await check_is_admin(user_id)):
        await message.answer("⛔ <b>Доступ заборонено!</b>\nЦей розділ доступний лише головному адміністратору клубу SVOI Travel.", parse_mode="HTML")
        return

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants_count = len(gw.get("participants", []))
    prize_title = gw.get("prize", "Не призначено")
    grp_status = f"<code>{CURRENT_GROUP_TARGET}</code> ({CURRENT_GROUP_TITLE}) ✅" if CURRENT_GROUP_TARGET else "<i>ще не прив'язана (напишіть у групі будь-яке слово)</i>"

    text = (
        "📢 <b>Центр керування Каналом та Групою SVOI Travel [Адмін-панель]</b>\n\n"
        f"👑 Адміністратор ID: <code>{user_id}</code>\n"
        f"👥 Цільова ГРУПА: {grp_status}\n"
        f"📢 Цільовий КАНАЛ: <code>{CURRENT_CHANNEL_TARGET}</code>\n\n"
        "<b>Поточний стан активностей:</b>\n"
        f"• 🎁 Активний розіграш: <i>{prize_title}</i>\n"
        f"• 👥 Учасників у базі: <b>{participants_count}</b>\n"
        f"• 📋 Заявок у листі очікування: <b>{len(WAITLIST_DATA)}</b>\n\n"
        "<b>Як працює розіграш:</b>\n"
        "1️⃣ Створюєте розіграш — бот публікує картку розіграшу <b>тут в Адмінці</b>.\n"
        "2️⃣ Натискаєте кнопку <b>«👥 Поділитися в ГРУПІ»</b> — бот публікує розіграш у групі.\n"
        "3️⃣ Після участі всіх натискаєте <b>«🏆 Вибрати переможця розіграшу»</b> та ділитесь переможцем у групі!"
    )
    await message.answer(text, reply_markup=get_channel_menu_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_adm_channel_menu")
async def cb_channel_menu(callback: CallbackQuery):
    """Повернення до головного меню панелі каналу та групи"""
    await callback.answer()
    user_id = callback.from_user.id if callback.from_user else 0
    if not (await check_is_admin(user_id)):
        await callback.answer("⛔ Доступ лише для адміністратора!", show_alert=True)
        return

    gw = GIVEAWAYS_DB.get("gw_active", {})
    count = len(gw.get("participants", []))
    prize = gw.get("prize", "Поїздка до Парижа")
    grp_status = f"<code>{CURRENT_GROUP_TARGET}</code> ({CURRENT_GROUP_TITLE}) ✅" if CURRENT_GROUP_TARGET else "<i>ще не прив'язана</i>"

    text = (
        "📢 <b>Центр керування Каналом та Групою SVOI Travel</b>\n\n"
        f"👥 Цільова ГРУПА: {grp_status}\n"
        f"📢 Цільовий КАНАЛ: <code>{CURRENT_CHANNEL_TARGET}</code>\n"
        f"🎁 Поточний розіграш: <b>{prize}</b>\n"
        f"👥 Зареєстровано учасників: <b>{count}</b>\n"
        f"📋 У листі очікування: <b>{len(WAITLIST_DATA)} людей</b>\n\n"
        "Оберіть команду на плашці адміністратора:"
    )
    await callback.message.edit_text(text, reply_markup=get_channel_menu_keyboard(), parse_mode="HTML")

# --- 1. СТВОРЕННЯ РОЗІГРАШУ В АДМІНЦІ ТА КНОПКА «ПОДІЛИТИСЯ В ГРУПІ» ---
@router.callback_query(F.data == "cb_adm_gw_card")
async def cb_giveaway_admin_card(callback: CallbackQuery):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return
    await callback.message.edit_text(
        get_admin_giveaway_card_text(),
        reply_markup=get_admin_giveaway_card_kb(),
        parse_mode="HTML"
    )

@router.callback_query(F.data.in_({"cb_adm_gw_new", "cb_adm_gw_new_group"}))
async def cb_giveaway_new_prompt(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return
    await state.set_state(ChannelAdminStates.waiting_for_giveaway_prize)
    
    text = (
        "🎁 <b>Створення нового РОЗІГРАШУ в Адмін-панелі</b>\n\n"
        "Напишіть у відповідь: <b>який приз розігрується?</b>\n"
        "<i>Наприклад: «Безкоштовне місце в турі до Парижа 🥐🗼»</i>\n\n"
        "Спочатку бот опублікує картку розіграшу <b>тут в Адмінці</b>, а під нею у вас з'явиться кнопка <b>«👥 Поділитися в ГРУПІ»</b>!"
    )
    cancel_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="📋 Відкрити поточну картку розіграшу в Адмінці", callback_data="cb_adm_gw_card")],
            [InlineKeyboardButton(text="❌ Скасувати", callback_data="cb_adm_channel_menu")]
        ]
    )
    await callback.message.edit_text(text, reply_markup=cancel_kb, parse_mode="HTML")

@router.callback_query(F.data.in_({"cb_adm_gw_share_group", "cb_adm_gw_pub_group_now", "cb_adm_gw_share_channel"}))
async def cb_giveaway_share_to_target(callback: CallbackQuery, bot: Bot):
    if not (await check_is_admin(callback.from_user.id)):
        await callback.answer("⛔ Доступ лише для адміністратора!", show_alert=True)
        return
    is_group = callback.data in ("cb_adm_gw_share_group", "cb_adm_gw_pub_group_now")
    gw = GIVEAWAYS_DB.get("gw_active", {})
    gw["is_active"] = True
    prize_text = gw.get("prize", "Безкоштовне місце в турі SVOI")
    count = len(gw.get("participants", []))
    post_text = (
        "🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b> 🌍✨\n\n"
        "Ми розігруємо неймовірний приз серед учасників нашої спільноти:\n"
        f"🎁 <b>{prize_text}</b>\n\n"
        "<b>Умови участі максимально прості:</b>\n"
        "1️⃣ Бути учасником нашої групи та підписаним на канал SVOI\n"
        f"2️⃣ Натиснути кнопку <b>«🎉 Брати участь! ({count})»</b> нижче!\n\n"
        "<i>Бот автоматично реєструє кожного учасника. Нехай щастить! 🍀</i>"
    )
    kb = get_giveaway_button("gw_active", count)
    target = CURRENT_GROUP_TARGET if is_group else CURRENT_CHANNEL_TARGET

    if is_group and not target:
        await callback.answer("⚠️ Група ще не прив'язана! Напишіть у групі будь-яке слово або прив'яжіть ID.", show_alert=True)
        return

    try:
        sent_msg = await bot.send_message(chat_id=target, text=post_text, reply_markup=kb, parse_mode="HTML")
        gw["message_id"] = sent_msg.message_id
        await callback.answer(
            f"✅ Розіграш успішно опубліковано в {'ГРУПІ' if is_group else 'КАНАЛІ'}!",
            show_alert=True
        )
        await callback.message.edit_text(
            f"{get_admin_giveaway_card_text()}\n\n"
            f"✅ <b>СТАТУС: Розіграш щойно ОПУБЛІКОВАНО в {'ГРУПІ ' + CURRENT_GROUP_TITLE if is_group else 'КАНАЛІ'} (<code>{target}</code>)!</b> 🎉",
            reply_markup=get_admin_giveaway_card_kb(),
            parse_mode="HTML"
        )
    except Exception as e:
        logger.warning("Помилка публікації в %s: %s", target, e)
        await callback.answer(f"❌ Помилка публікації: {e}", show_alert=True)

@router.message(ChannelAdminStates.waiting_for_giveaway_prize)
@router.message(ChannelAdminStates.waiting_for_giveaway_prize_group)
async def process_giveaway_prize(message: Message, state: FSMContext):
    prize_text = message.text.strip()
    await state.clear()

    GIVEAWAYS_DB["gw_active"] = {
        "id": "gw_active",
        "prize": prize_text,
        "participants": [],
        "is_active": True,
        "winner": None
    }

    await message.answer(
        f"✅ <b>Розіграш створено та опубліковано в Адмін-панелі!</b>\n\n{get_admin_giveaway_card_text()}",
        reply_markup=get_admin_giveaway_card_kb(),
        parse_mode="HTML"
    )

# --- 2. ОБРОБКА НАТИСКАННЯ «БРАТИ УЧАСТЬ!» У ГРУПІ ТА КАНАЛІ ---
@router.callback_query(F.data.startswith("gw_join_"))
async def cb_giveaway_join(callback: CallbackQuery):
    global CURRENT_GROUP_TARGET, CURRENT_GROUP_TITLE
    if callback.message and callback.message.chat and callback.message.chat.type in ["group", "supergroup"]:
        CURRENT_GROUP_TARGET = str(callback.message.chat.id)
        CURRENT_GROUP_TITLE = callback.message.chat.title or "Група SVOI Travel"

    user = callback.from_user
    gw = GIVEAWAYS_DB.get("gw_active")
    
    if not gw or not gw.get("is_active"):
        await callback.answer("⏳ Цей розіграш уже завершено!", show_alert=True)
        return

    participants = gw["participants"]
    if any(p["user_id"] == user.id for p in participants):
        user_num = next(i+1 for i, p in enumerate(participants) if p["user_id"] == user.id)
        await callback.answer(f"✅ Ви вже берете участь! Ваш номер у списку: #{user_num}", show_alert=True)
        return

    participant_data = {
        "user_id": user.id,
        "username": f"@{user.username}" if user.username else user.first_name,
        "first_name": user.first_name
    }
    participants.append(participant_data)
    new_count = len(participants)

    await callback.answer(f"🎉 Вітаємо, {user.first_name}! Ви успішно зареєстровані! Номер: #{new_count} 🍀", show_alert=True)

    try:
        await callback.message.edit_reply_markup(reply_markup=get_giveaway_button("gw_active", new_count))
    except Exception:
        pass

# --- 3. ПІДБИТТЯ ПІДСУМКІВ ТА ПУБЛІКАЦІЯ ПЕРЕМОЖЦЯ У ГРУПУ І КАНАЛ (ТІЛЬКИ АДМІН) ---
@router.callback_query(F.data == "gw_admin_pick_inline")
async def cb_giveaway_admin_pick_inline(callback: CallbackQuery):
    if not (await check_is_admin(callback.from_user.id)):
        await callback.answer("⛔ Ця кнопка доступна виключно для адміністратора клубу SVOI Travel!", show_alert=True)
        return

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants = gw.get("participants", [])
    if not participants:
        participants = [
            {"user_id": settings.ADMIN_ID, "username": "@alex_traveler", "first_name": "Олександр"}
        ]
    winner = random.choice(participants)
    gw["winner"] = winner
    gw["is_active"] = False

    await callback.answer(f"🏆 Переможця обрано: {winner['first_name']} ({winner['username']})!", show_alert=True)
    winner_post = (
        "🎊🏆 <b>УВАГА! ОФІЦІЙНІ ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊\n\n"
        f"🎁 <b>Приз:</b> {gw.get('prize')}\n"
        f"👥 <b>Усього учасників:</b> {len(participants)}\n\n"
        "✨ <b>Переможцем стає:</b>\n"
        f"🥳 <b>{winner['first_name']} ({winner['username']})!</b> 🎉🎉🎉\n\n"
        f"Щиро вітаємо з перемогою! Напишіть організатору @{settings.MANAGER_USERNAME} для отримання вашого призу! 🚐✨"
    )
    await callback.message.answer(winner_post, parse_mode="HTML")

@router.callback_query(F.data == "cb_adm_gw_pick")
async def cb_giveaway_pick_winner(callback: CallbackQuery):
    if not (await check_is_admin(callback.from_user.id)):
        await callback.answer("⛔ Доступ лише для адміністратора!", show_alert=True)
        return
    await callback.answer()

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants = gw.get("participants", [])
    if not participants:
        participants = [
            {"user_id": 1, "username": "@alex_traveler", "first_name": "Олександр"},
            {"user_id": 2, "username": "@elena_voyage", "first_name": "Олена"}
        ]
    winner = random.choice(participants)
    gw["winner"] = winner
    gw["is_active"] = False

    preview_text = (
        "🏆 <b>ПЕРЕМОЖЦЯ РОЗІГРАШУ ОБРАНО [Панель Адміна]!</b> 🎉\n\n"
        f"🎁 <b>Приз:</b> {gw.get('prize')}\n"
        f"👥 <b>Усього учасників:</b> {len(participants)}\n"
        f"🥳 <b>Переможець:</b> <b>{winner['first_name']} ({winner['username']})</b>\n\n"
        "👇 <b>Куди опублікувати офіційний пост із вітанням переможця?</b>"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="👥 Опублікувати переможця в ГРУПІ", callback_data="cb_adm_pub_winner_group")],
            [InlineKeyboardButton(text="📢 Опублікувати переможця в КАНАЛІ", callback_data="cb_adm_pub_winner_channel")],
            [InlineKeyboardButton(text="🔥 Опублікувати І В ГРУПІ, І В КАНАЛІ", callback_data="cb_adm_pub_winner_both")],
            [InlineKeyboardButton(text="🔄 Переобрати іншого переможця", callback_data="cb_adm_gw_pick")],
            [InlineKeyboardButton(text="🔙 До панелі /channel", callback_data="cb_adm_channel_menu")]
        ]
    )
    await callback.message.edit_text(preview_text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data.in_(["cb_adm_pub_winner_group", "cb_adm_pub_winner_channel", "cb_adm_pub_winner_both"]))
async def cb_publish_winner_target(callback: CallbackQuery, bot: Bot):
    if not (await check_is_admin(callback.from_user.id)):
        await callback.answer("⛔ Доступ лише для адміністратора!", show_alert=True)
        return
    await callback.answer()

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants = gw.get("participants", []) or [{"user_id": 1, "username": "@alex_traveler", "first_name": "Олександр"}]
    winner = gw.get("winner") or random.choice(participants)
    gw["winner"] = winner

    winner_post = (
        "🎊🏆 <b>УВАГА! ОФІЦІЙНІ ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊\n\n"
        f"🎁 <b>Приз:</b> {gw.get('prize')}\n"
        f"👥 <b>Усього брало участь:</b> {len(participants)} учасників\n\n"
        "✨ <b>Генератор випадкових чисел обрав переможця:</b>\n"
        f"🥳 <b>ПЕРЕМОЖЕЦЬ: {winner['first_name']} ({winner['username']})!</b> 🎉🎉🎉\n\n"
        f"Щиро вітаємо з перемогою! Менеджер клубу @{settings.MANAGER_USERNAME} зв'яжеться з вами для вручення призу! 🚐🌍"
    )
    action_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Забронювати поїздку", url=f"https://t.me/{settings.BOT_USERNAME}?start=trips"),
                InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    logs = []
    if callback.data in ["cb_adm_pub_winner_group", "cb_adm_pub_winner_both"]:
        if CURRENT_GROUP_TARGET:
            try:
                await bot.send_message(chat_id=CURRENT_GROUP_TARGET, text=winner_post, reply_markup=action_kb, parse_mode="HTML")
                logs.append(f"✅ Опубліковано в <b>ГРУПІ «{CURRENT_GROUP_TITLE}»</b> (<code>{CURRENT_GROUP_TARGET}</code>)")
            except Exception as e:
                logs.append(f"⚠️ Помилка публікації в групу: {e}")
        else:
            logs.append("⚠️ Група ще не прив'язана числовим ID (напишіть у групі будь-яке повідомлення з ботом)")

    if callback.data in ["cb_adm_pub_winner_channel", "cb_adm_pub_winner_both"]:
        if CURRENT_CHANNEL_TARGET:
            try:
                await bot.send_message(chat_id=CURRENT_CHANNEL_TARGET, text=winner_post, reply_markup=action_kb, parse_mode="HTML")
                logs.append(f"✅ Опубліковано в <b>КАНАЛІ</b> (<code>{CURRENT_CHANNEL_TARGET}</code>)")
            except Exception as e:
                logs.append(f"⚠️ Помилка публікації в канал: {e}")

    await callback.message.edit_text(
        f"🏆 <b>Звіт про публікацію переможця {winner['first_name']} ({winner['username']}):</b>\n\n" +
        "\n\n".join(logs) + "\n\n" + winner_post,
        reply_markup=get_channel_menu_keyboard(),
        parse_mode="HTML"
    )

# --- 4. ПУБЛІКАЦІЯ ПОСТА ТУРУ В КАНАЛ З КНОПКОЮ «ЗАБРОНЮВАТИ» ---
@router.callback_query(F.data == "cb_adm_post_tour")
async def cb_post_tour_menu(callback: CallbackQuery):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return
        
    buttons = []
    for trip in TRIPS_DATA[:6]:
        buttons.append([
            InlineKeyboardButton(text=f"📢 Опублікувати: {trip['title'][:25]}...", callback_data=f"cb_publish_trip_{trip['id']}")
        ])
    buttons.append([InlineKeyboardButton(text="🔙 Назад до панелі", callback_data="cb_adm_channel_menu")])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await callback.message.edit_text(
        f"📢 <b>Оберіть тур для публікації в канал <code>{CURRENT_CHANNEL_TARGET}</code>:</b>\n"
        "Бот прикріпить інлайн-кнопку «💺 Забронювати в боті» та кнопку «🚀 Mini App».",
        reply_markup=kb,
        parse_mode="HTML"
    )

@router.callback_query(F.data.startswith("cb_publish_trip_"))
async def cb_publish_trip_selected(callback: CallbackQuery, bot: Bot):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return

    trip_id = callback.data.replace("cb_publish_trip_", "")
    trip = next((t for t in TRIPS_DATA if t['id'] == trip_id), TRIPS_DATA[0])

    highlights = trip.get('highlights', [])
    highlights_text = "\n".join([f"• {h}" for h in highlights]) if highlights else "• Відвідування головних панорамних локацій\n• Вільний час для прогулянок та фото\n• Комфортний трансфер без стресу"

    post_text = (
        f"🌟 <b>Ексклюзивний виїзд: {trip.get('title', 'Тур Європою')}!</b> 🌍✨\n\n"
        f"💰 <b>Ціна: {trip.get('price', 100)}€</b> | Тривалість: <b>{trip.get('duration', '1 день')}</b>\n"
        f"🚐 Комфортний трансфер Opel Vivaro (дводіапазонний клімат, відкидні крісла, USB)\n"
        f"📍 Адресний збір: Саарланд, Трір, Люксембург (Door-to-Door)!\n\n"
        f"<b>У програмі поїздки:</b>\n"
        f"{highlights_text}\n\n"
        "👉 Натисніть кнопку нижче, щоб обрати своє місце у салоні або забронювати тур прямо зараз:"
    )

    booking_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Забронювати поїздку в боті", url=f"https://t.me/{settings.BOT_USERNAME}?start=trip_{trip['id']}")
            ],
            [
                InlineKeyboardButton(text="🚀 Відкрити Mini App (3D салон)", web_app=WebAppInfo(url=settings.MINI_APP_URL)),
                InlineKeyboardButton(text="💬 Менеджер", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    published = False
    target = CURRENT_CHANNEL_TARGET
    if target:
        try:
            if trip.get("image"):
                await bot.send_photo(chat_id=target, photo=trip["image"], caption=post_text, reply_markup=booking_kb, parse_mode="HTML")
            else:
                await bot.send_message(chat_id=target, text=post_text, reply_markup=booking_kb, parse_mode="HTML")
            published = True
        except Exception as e:
            logger.warning("Помилка публікації в канал %s: %s", target, e)

    if published:
        await callback.message.answer(
            f"✅ <b>Тур «{trip.get('title')}» УСПІШНО ОПУБЛІКОВАНО прямо в канал {target}!</b> 📢",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
    else:
        await callback.message.answer(
            f"⚠️ Бот надіслав пост сюди для перегляду (щоб публікувати прямо в канал, перевірте права бота в <code>{target}</code>):",
            parse_mode="HTML"
        )
        await callback.message.answer(post_text, reply_markup=booking_kb, parse_mode="HTML")

# --- 5. ВІКТОРИНА (КВІЗ) У КАНАЛ ---
@router.callback_query(F.data == "cb_adm_send_quiz")
async def cb_send_quiz_menu(callback: CallbackQuery, bot: Bot):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return

    question = "У якому місті знаходиться відомий міст закоханих біля Озера Кохання (Minnewater)?"
    options = [
        "Амстердам (Нідерланди) 🚲",
        "Брюгге (Бельгія) 🇧🇪",
        "Страсбург (Франція) 🍷",
        "Кольмар (Франція) 🌸"
    ]
    correct_id = 1
    explanation = "Це казковий Брюгге! Туди ми вирушаємо в тур вихідного дня за 110€."

    published = False
    target = CURRENT_CHANNEL_TARGET
    if target:
        try:
            await bot.send_poll(
                chat_id=target,
                question=f"🧠 РАНКОВА ВІКТОРИНА SVOI: {question}",
                options=options,
                type="quiz",
                correct_option_id=correct_id,
                explanation=explanation,
                is_anonymous=False
            )
            published = True
        except Exception as e:
            logger.warning("Не вдалося опублікувати вікторину в %s: %s", target, e)

    if published:
        await callback.message.answer(
            f"✅ <b>Офіційну вікторину з конфетті ОПУБЛІКОВАНО прямо в канал {target}!</b> 🎉🧠",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
    else:
        await callback.message.answer(
            "🧠 <b>Вікторина для публікації:</b>\n"
            f"Запитання: {question}\n"
            "Варіанти:\n" + "\n".join([f"• {opt}" for opt in options]),
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )

# --- 6. ПУБЛІКАЦІЯ КНОПКИ MINI APP ---
@router.callback_query(F.data == "cb_adm_post_miniapp")
async def cb_post_miniapp(callback: CallbackQuery, bot: Bot):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return

    post_text = (
        "🚀✨ <b>ЗУСТРІЧАЙТЕ ОНОВЛЕНИЙ SVOI MINI APP!</b> 🌍🚐\n\n"
        "Тепер обрати тур та місце в салоні стало неймовірно зручно прямо всередині Telegram!\n\n"
        "<b>Що всередині нашої Mini App:</b>\n"
        "✨ <b>Інтерактивний салон Opel Vivaro</b>: оберіть своє крісло на сенсорній схемі\n"
        f"🗺 <b>Вітрина всіх {len(TRIPS_DATA)} авторських турів</b> з яскравими фотографіями та описом\n"
        "⚡️ Прорахунок вартості та надсилання броні в 1 клік\n\n"
        "Натискайте кнопку <b>«🚀 Відкрити SVOI Mini App»</b> та вирушайте в подорож Європою!"
    )

    miniapp_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🚀 Відкрити SVOI Mini App", web_app=WebAppInfo(url=settings.MINI_APP_URL))
            ],
            [
                InlineKeyboardButton(text="🗺 Розклад турів", url=f"https://t.me/{settings.BOT_USERNAME}?start=trips"),
                InlineKeyboardButton(text="💬 Менеджер", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    target = CURRENT_CHANNEL_TARGET
    if target:
        try:
            await bot.send_message(chat_id=target, text=post_text, reply_markup=miniapp_kb, parse_mode="HTML")
            await callback.message.answer(f"✅ Анонс Mini App ОПУБЛІКОВАНО у канал {target}!", reply_markup=get_channel_menu_keyboard(), parse_mode="HTML")
            return
        except Exception as e:
            logger.warning("Помилка публікації miniapp в канал: %s", e)

    await callback.message.answer(post_text, reply_markup=miniapp_kb, parse_mode="HTML")

# --- 7. ПЕРЕГЛЯД ЛИСТА ОЧІКУВАННЯ (WAITLIST ДЛЯ АДМІНА) ---
@router.callback_query(F.data == "cb_adm_waitlist")
async def cb_admin_waitlist_view(callback: CallbackQuery):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return

    if not WAITLIST_DATA:
        text = "📋 <b>Лист очікування наразі порожній.</b>\nВсі запити на тури закриті або ще не надходили."
    else:
        lines = []
        for i, item in enumerate(WAITLIST_DATA, 1):
            lines.append(
                f"<b>#{i} | {item['trip_title']}</b>\n"
                f"👤 Клієнт: <b>{item['name']}</b> ({item['handle']})\n"
                f"📱 Телефон: <code>{item.get('phone', 'не вказано')}</code>\n"
                f"💺 Місць: <b>{item.get('seats', 1)}</b> | Бажана дата: <i>{item['desired_date']}</i>\n"
                f"Статус: 🟡 <b>{item.get('status', 'очікує')}</b>"
            )
        text = (
            "📋 <b>Лист очікування пасажирів (SVOI Waitlist)</b>\n\n"
            + "\n\n────────────────\n\n".join(lines) +
            "\n\n💡 <i>Коли звільняється місце в турі або відкривається додатковий рейс — зв'яжіться з туристом для підтвердження броні!</i>"
        )

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Написати першому в черзі", url=f"https://t.me/{WAITLIST_DATA[0]['handle'].lstrip('@')}") if WAITLIST_DATA and WAITLIST_DATA[0].get('handle') != 'без юзернейма' else InlineKeyboardButton(text="🗺 До турів", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 До панелі каналу", callback_data="cb_adm_channel_menu")]
        ]
    )
    await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")

# --- 8. НАЛАШТУВАННЯ ЦІЛЬОВОГО КАНАЛУ ДЛЯ ПУБЛІКАЦІЙ ---
@router.callback_query(F.data == "cb_adm_set_channel")
async def cb_admin_set_channel(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return
    await state.set_state(ChannelAdminStates.waiting_for_channel_id)
    
    text = (
        "⚙️ <b>Налаштування цільового каналу для публікацій</b>\n\n"
        f"Поточний канал: <code>{CURRENT_CHANNEL_TARGET}</code>\n\n"
        "<b>Як легко налаштувати канал (оберіть будь-який спосіб):</b>\n"
        "1️⃣ <b>Просто перешліть сюди будь-який пост</b> зі свого каналу! Бот автоматично визначить числовий ID.\n"
        "2️⃣ Або надішліть <b>числовий ID</b> каналу (починається з <code>-100...</code>).\n"
        "3️⃣ Або надішліть публічний <b>@юзернейм каналу</b>.\n\n"
        "<i>💡 Важливо: бот обов'язково повинен бути доданий адміністратором у канал з увімкненим правом «Публікація повідомлень».</i>"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="❌ Скасувати", callback_data="cb_adm_channel_menu")]]
    )
    await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")

@router.message(ChannelAdminStates.waiting_for_channel_id)
async def process_set_channel_id(message: Message, state: FSMContext):
    global CURRENT_CHANNEL_TARGET
    await state.clear()
    
    # 1. Перевірка пересланого повідомлення з каналу (підтримка і forward_from_chat, і нового forward_origin в Bot API 7.0+)
    forwarded_chat = getattr(message, "forward_from_chat", None)
    forward_origin = getattr(message, "forward_origin", None)
    if not forwarded_chat and forward_origin and hasattr(forward_origin, "chat"):
        forwarded_chat = forward_origin.chat

    if forwarded_chat and getattr(forwarded_chat, "type", "") in ["channel", "supergroup"]:
        chat_id = str(forwarded_chat.id)
        chat_title = getattr(forwarded_chat, "title", None) or "Канал SVOI"
        CURRENT_CHANNEL_TARGET = chat_id
        await message.answer(
            f"✅ <b>Канал успішно визначено та прив'язано!</b> 🎉\n\n"
            f"📢 Назва: <b>{chat_title}</b>\n"
            f"🆔 Числовий ID закритого каналу: <code>{CURRENT_CHANNEL_TARGET}</code>\n\n"
            "Тепер усі розіграші, опитування та пости публікуватимуться прямо в цей канал!",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
        return

    raw_text = (message.text or "").strip()
    if not raw_text:
        await message.answer("⚠️ Не вдалося визначити канал. Будь ласка, перешліть пост із каналу або вкажіть числовий ID (-100...):", reply_markup=get_channel_menu_keyboard())
        return

    # Якщо користувач ввів закрите посилання-запрошення t.me/+...
    if "t.me/+" in raw_text or "joinchat" in raw_text:
        await message.answer(
            "⚠️ <b>Ви надіслали закрите посилання-запрошення (t.me/+...)!</b>\n\n"
            "Telegram API не дозволяє публікувати за посиланням-запрошенням — для приватного каналу потрібен його <b>числовий ID (починається з -100...)</b>.\n\n"
            "👉 <b>Просто перешліть будь-яке повідомлення зі свого каналу сюди в бот</b>, і бот сам миттєво дізнається числовий ID!",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
        return

    # Якщо користувач ввів публічне посилання на канал виду https://t.me/username
    if "t.me/" in raw_text and not raw_text.startswith("-100"):
        raw_text = "@" + raw_text.split("t.me/")[-1].strip("/@")

    CURRENT_CHANNEL_TARGET = raw_text
    await message.answer(
        f"✅ <b>Цільовий канал збережено:</b> <code>{CURRENT_CHANNEL_TARGET}</code>!\n\n"
        "Переконайтеся, що бот доданий адміністратором каналу з правом «Публікація повідомлень».",
        reply_markup=get_channel_menu_keyboard(),
        parse_mode="HTML"
    )

@router.channel_post()
async def on_any_channel_post(message: Message):
    """Автоматично запам'ятовує числовий ID (-100...) приватного каналу при будь-якому пості в каналі"""
    global CURRENT_CHANNEL_TARGET
    if message.chat and message.chat.type in ["channel", "supergroup"]:
        CURRENT_CHANNEL_TARGET = str(message.chat.id)
        logger.info("Автоматично збережено ID каналу з channel_post: %s (%s)", message.chat.title, CURRENT_CHANNEL_TARGET)

@router.my_chat_member()
async def on_bot_added_as_admin(event: ChatMemberUpdated, bot: Bot):
    """
    Автоматично фіксує додавання бота адміністратором у канал або групу!
    Миттєво прив'язує channel.id і надсилає звіт головному адміністратору.
    """
    chat = event.chat
    if chat.type in ["channel", "supergroup"]:
        new_status = event.new_chat_member.status
        if new_status in ["administrator", "creator"]:
            global CURRENT_CHANNEL_TARGET
            CURRENT_CHANNEL_TARGET = str(chat.id)
            logger.info("Бот автоматично прив'язаний до каналу: %s (ID: %s)", chat.title, chat.id)
            try:
                await bot.send_message(
                    chat_id=settings.ADMIN_ID,
                    text=(
                        f"🎉 <b>БОТ УСПІШНО ДОДАНИЙ АДМІНІСТРАТОРОМ У КАНАЛ!</b> 📢\n\n"
                        f"• Назва каналу: <b>{chat.title}</b>\n"
                        f"• ID каналу: <code>{chat.id}</code>\n\n"
                        f"✅ <b>Цей ID автоматично встановлено для публікацій!</b>\n"
                        f"Тепер усі розіграші, тури та вікторини з команди /channel миттєво відправлятимуться прямо в цей канал."
                    ),
                    parse_mode="HTML"
                )
            except Exception as e:
                logger.warning("Не вдалося сповістити адміна про додавання в канал: %s", e)

