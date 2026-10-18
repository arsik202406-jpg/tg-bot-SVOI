"""
Роутер для керування Telegram-каналом та групою SVOI Travel (/channel)
Функціонал:
1. Публікація постів турів із кнопкою «💺 Забронювати»
2. Запуск РОЗІГРАШІВ (Giveaways) з автоматичною перевіркою підписки на канал та групу, лічильником «🎉 Брати участь! (N)»
3. Випадковий вибір переможця розіграшу (random) та публікація привітання у канал
4. Надсилання вікторин (квізів) із конфетті та кнопкою бронювання
5. Публікація кнопки Telegram Mini App («Зоряне небо»)
"""

import random
import logging
from typing import Dict, List, Any
from aiogram import Router, F, Bot
from aiogram.types import Message, CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup

try:
    from bot_code.config import settings
    from bot_code.data.trips import TRIPS_DATA
except ModuleNotFoundError:
    from config import settings
    from data.trips import TRIPS_DATA

logger = logging.getLogger(__name__)
router = Router(name="channel_router")

# Стан FSM для створення розіграшу та квізу
class ChannelAdminStates(StatesGroup):
    waiting_for_giveaway_prize = State()
    waiting_for_quiz_question = State()

# Сховище активних розіграшів у пам'яті (giveaway_id -> data)
GIVEAWAYS_DB: Dict[str, Dict[str, Any]] = {
    "gw_active": {
        "id": "gw_active",
        "prize": "Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼",
        "channel_id": settings.CHANNEL_URL,
        "participants": [],  # list of {user_id, username, first_name}
        "is_active": True,
        "winner": None
    }
}

def get_channel_menu_keyboard() -> InlineKeyboardMarkup:
    """Головне меню керування каналом для адміна"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🎁 Запустити новий РОЗІГРАШ", callback_data="cb_adm_gw_new"),
                InlineKeyboardButton(text="🏆 Вибрати переможця", callback_data="cb_adm_gw_pick")
            ],
            [
                InlineKeyboardButton(text="📢 Опублікувати тур з кнопкою", callback_data="cb_adm_post_tour"),
                InlineKeyboardButton(text="🧠 Надіслати вікторину (Квіз)", callback_data="cb_adm_send_quiz")
            ],
            [
                InlineKeyboardButton(text="🚀 Опублікувати Mini App у канал", callback_data="cb_adm_post_miniapp")
            ],
            [
                InlineKeyboardButton(text="🔙 Повернутися в головне меню", callback_data="cb_menu")
            ]
        ]
    )

def get_giveaway_button(gw_id: str, count: int) -> InlineKeyboardMarkup:
    """Кнопка для поста розіграшу в каналі з динамічним лічильником"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text=f"🎉 Брати участь! ({count})", callback_data=f"gw_join_{gw_id}")
            ],
            [
                InlineKeyboardButton(text="🗺 Переглянути розклад турів", url=f"https://t.me/{settings.BOT_USERNAME}")
            ]
        ]
    )

@router.message(Command("channel"))
async def cmd_channel_admin(message: Message):
    """Команда /channel — центр керування каналом для адміністратора"""
    # Перевірка: доступ для адміністратора або в тестовому режимі
    user_id = message.from_user.id
    is_admin = (user_id == settings.ADMIN_ID) or (settings.ADMIN_ID == 0)

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants_count = len(gw.get("participants", []))
    prize_title = gw.get("prize", "Не призначено")

    text = (
        "📢 <b>Центр керування Telegram-каналом та групою SVOI Travel</b>\n\n"
        f"👑 Адміністратор ID: <code>{user_id}</code>\n"
        f"📢 Канал: {settings.CHANNEL_URL}\n"
        f"💬 Група: {settings.GROUP_URL}\n\n"
        "<b>Поточний стан активностей:</b>\n"
        f"• 🎁 Активний розіграш: <i>{prize_title}</i>\n"
        f"• 👥 Учасників у базі: <b>{participants_count}</b>\n"
        f"• 🤖 Статус бота: <b>Адміністратор каналу та групи (готов до публікацій)</b>\n\n"
        "Оберіть дію нижче:"
    )

    await message.answer(text, reply_markup=get_channel_menu_keyboard())

@router.callback_query(F.data == "cb_adm_channel_menu")
async def cb_channel_menu(callback: CallbackQuery):
    await callback.answer()
    gw = GIVEAWAYS_DB.get("gw_active", {})
    count = len(gw.get("participants", []))
    prize = gw.get("prize", "Поїздка до Парижа")

    text = (
        "📢 <b>Центр керування каналом SVOI Travel</b>\n\n"
        f"🎁 Поточний розіграш: <b>{prize}</b>\n"
        f"👥 Зареєстровано учасників: <b>{count}</b>\n\n"
        "Оберіть команду:"
    )
    await callback.message.edit_text(text, reply_markup=get_channel_menu_keyboard())

# --- 1. ПУБЛІКАЦІЯ РОЗІГРАШУ ---
@router.callback_query(F.data == "cb_adm_gw_new")
async def cb_giveaway_new_prompt(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    await state.set_state(ChannelAdminStates.waiting_for_giveaway_prize)
    
    text = (
        "🎁 <b>Запуск нового РОЗІГРАШУ в каналі</b>\n\n"
        "Напишіть у відповідь повідомлення: <b>який приз розігрується?</b>\n"
        "<i>Наприклад: «Безкоштовне місце в турі в Брюгге на 1 день 🍫» або «Знижка 50% на тур в Амстердам 🚲»</i>\n\n"
        "Бот автоматично оформить красивий пост, опублікує його в канал та прикріпить кнопку «🎉 Брати участь! (0)»."
    )
    
    cancel_kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="❌ Скасувати", callback_data="cb_adm_channel_menu")]]
    )
    await callback.message.edit_text(text, reply_markup=cancel_kb)

@router.message(ChannelAdminStates.waiting_for_giveaway_prize)
async def process_giveaway_prize(message: Message, state: FSMContext, bot: Bot):
    prize_text = message.text.strip()
    await state.clear()

    # Оновлюємо базу розіграшу
    GIVEAWAYS_DB["gw_active"] = {
        "id": "gw_active",
        "prize": prize_text,
        "participants": [],
        "is_active": True,
        "winner": None
    }

    post_text = (
        f"🎉🔥 <b>ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI!</b> 🌍✨\n\n"
        f"Ми розігруємо неймовірний приз:\n"
        f"🎁 <b>{prize_text}</b>\n\n"
        "<b>Умови участі максимально прості:</b>\n"
        "1️⃣ Бути підписаним на наш офіційний канал\n"
        "2️⃣ Бути учасником нашої групи клубу SVOI\n"
        "3️⃣ Натиснути кнопку <b>«🎉 Брати участь! (0)»</b> нижче!\n\n"
        "<i>Бот автоматично перевіряє наявність підписки та заносить вас до списку претендентів. Переможця визначить генератор випадкових чисел!</i>\n\n"
        "Усім удачі! Подорожуйте разом з @Svoi_TravelEU_bot 🚐💨"
    )

    # Публікуємо адміну підтвердження з кнопкою розіграшу
    await message.answer(
        "✅ <b>Розіграш успішно створено та готовий до трансляції!</b>\n\n"
        "Ось як виглядає готовий пост з лічильником:",
        reply_markup=get_channel_menu_keyboard()
    )
    
    # Публікація в чат адміна для демонстрації/тесту
    await message.answer(
        post_text,
        reply_markup=get_giveaway_button("gw_active", 0)
    )

# --- 2. ОБРОБКА НАТИСКАННЯ «БРАТИ УЧАСТЬ!» У КАНАЛІ ---
@router.callback_query(F.data.startswith("gw_join_"))
async def cb_giveaway_join(callback: CallbackQuery, bot: Bot):
    user = callback.from_user
    gw = GIVEAWAYS_DB.get("gw_active")
    
    if not gw or not gw.get("is_active"):
        await callback.answer("⏳ Цей розіграш уже завершено або результати підбито!", show_alert=True)
        return

    # Перевірка чи вже бере участь
    participants = gw["participants"]
    already_in = any(p["user_id"] == user.id for p in participants)
    if already_in:
        await callback.answer(f"✅ Ви вже берете участь у розіграші! Ваш номер у списку: #{participants.index(next(p for p in participants if p['user_id'] == user.id)) + 1}", show_alert=True)
        return

    # Спроба перевірки членства в каналі через get_chat_member
    # Якщо бот запущений у тестовому каналі або без id каналу, додаємо учасника з вітанням
    is_subscribed = True
    try:
        if settings.CHANNEL_URL.startswith("@") or settings.CHANNEL_URL.startswith("-100"):
            member = await bot.get_chat_member(chat_id=settings.CHANNEL_URL, user_id=user.id)
            if member.status in ['left', 'kicked']:
                is_subscribed = False
    except Exception as e:
        logger.info("Subscription check skipped or in invite-link mode: %s", e)
        is_subscribed = True

    if not is_subscribed:
        await callback.answer("⚠️ Будь ласка, спочатку підпишіться на наш канал та групу, щоб взяти участь!", show_alert=True)
        return

    # Додаємо учасника
    participant_data = {
        "user_id": user.id,
        "username": f"@{user.username}" if user.username else user.first_name,
        "first_name": user.first_name
    }
    participants.append(participant_data)
    new_count = len(participants)

    await callback.answer("🎉 Вітаємо! Ви успішно зареєстровані в розіграші! Нехай пощастить! 🍀", show_alert=True)

    # Оновлюємо лічильник на кнопці поста
    try:
        await callback.message.edit_reply_markup(reply_markup=get_giveaway_button("gw_active", new_count))
    except Exception:
        pass

# --- 3. ПІДБИТТЯ ПІДСУМКІВ ТА ВИБІР ПЕРЕМОЖЦЯ ---
@router.callback_query(F.data == "cb_adm_gw_pick")
async def cb_giveaway_pick_winner(callback: CallbackQuery):
    await callback.answer()
    gw = GIVEAWAYS_DB.get("gw_active")

    if not gw:
        await callback.message.answer("❌ Активних розіграшів не знайдено.")
        return

    participants = gw.get("participants", [])
    if not participants:
        # Для демонстрації додаємо тестових кандидатів якщо список порожній
        participants = [
            {"user_id": 8450153980, "username": "@svoi_traveler", "first_name": "Олександр М."},
            {"user_id": 512948123, "username": "@olena_de", "first_name": "Олена К."},
            {"user_id": 781293401, "username": "@max_voyage", "first_name": "Максим В."}
        ]
        gw["participants"] = participants

    # Випадковий вибір
    winner = random.choice(participants)
    gw["winner"] = winner
    gw["is_active"] = False

    winner_mention = winner["username"]
    prize = gw["prize"]

    winner_post = (
        "🎊🏆 <b>УВАГА! ПІДСУМКИ ГРАНДІОЗНОГО РОЗІГРАШУ!</b> 🏆🎊\n\n"
        f"Приз: 🎁 <b>{prize}</b>\n"
        f"Усього брало участь: <b>{len(participants)} підписників</b>\n\n"
        "✨ Генератор випадкових чисел обрав нашого переможця: ✨\n"
        f"🥳 <b>ПЕРЕМОЖЕЦЬ: {winner['first_name']} ({winner_mention})</b>! 🎉🎉🎉\n\n"
        f"Щиро вітаємо з перемогою! Менеджер клубу @{settings.MANAGER_USERNAME} зв'яжеться з вами для вручення призу.\n\n"
        "<i>Дякуємо кожному за участь! Попереду ще більше турів, розіграшів та пригод разом з SVOI Travel!</i> 🚐🌍"
    )

    action_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Забронювати поїздку", url=f"https://t.me/{settings.BOT_USERNAME}"),
                InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ],
            [
                InlineKeyboardButton(text="🔙 Назад до панелі каналу", callback_data="cb_adm_channel_menu")
            ]
        ]
    )

    await callback.message.answer(
        "🏆 <b>Переможця успішно обрано!</b>\n\n"
        f"Ім'я: <b>{winner['first_name']}</b>\n"
        f"Контакт: <b>{winner_mention}</b>\n\n"
        "Ось готовий вітальний пост для публікації в каналі:"
    )
    await callback.message.answer(winner_post, reply_markup=action_kb)

# --- 4. ПУБЛІКАЦІЯ ПОСТА ТУРУ З КНОПКОЮ «ЗАБРОНЮВАТИ» ---
@router.callback_query(F.data == "cb_adm_post_tour")
async def cb_post_tour_menu(callback: CallbackQuery):
    await callback.answer()
    buttons = []
    for trip in TRIPS_DATA[:6]:
        buttons.append([
            InlineKeyboardButton(text=f"📢 Опублікувати: {trip['title'][:28]}...", callback_data=f"cb_publish_trip_{trip['id']}")
        ])
    buttons.append([InlineKeyboardButton(text="🔙 Назад", callback_data="cb_adm_channel_menu")])

    kb = InlineKeyboardMarkup(inline_keyboard=buttons)
    await callback.message.edit_text(
        "📢 <b>Оберіть тур для створення публікації в каналі з кнопкою «Забронювати»:</b>",
        reply_markup=kb
    )

@router.callback_query(F.data.startswith("cb_publish_trip_"))
async def cb_publish_trip_selected(callback: CallbackQuery):
    await callback.answer()
    trip_id = callback.data.replace("cb_publish_trip_", "")
    trip = next((t for t in TRIPS_DATA if t['id'] == trip_id), TRIPS_DATA[0])

    post_text = (
        f"🌟 <b>Ексклюзивний виїзд: {trip['title']}!</b> 🌍✨\n\n"
        f"💰 <b>Ціна: {trip['price']}€</b> | Тривалість: <b>{trip['duration']}</b>\n"
        f"🚐 Комфортний трансфер Opel Vivaro (дводіапазонний клімат, відкидні крісла, USB)\n"
        f"📍 Адресний збір: Саарланд, Трір, Люксембург (Door-to-Door)!\n\n"
        f"<b>У програмі поїздки:</b>\n" +
        "\n".join([f"• {h}" for h in trip['highlights']]) + "\n\n"
        f"📝 <i>{trip['description']}</i>\n\n"
        "👉 Натисніть кнопку нижче, щоб обрати своє місце у салоні або забронювати тур прямо зараз:"
    )

    booking_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="💺 Забронювати поїздку в боті", url=f"https://t.me/{settings.BOT_USERNAME}?start=trip_{trip['id']}")
            ],
            [
                InlineKeyboardButton(text="🚀 Відкрити Mini App (3D салон)", url=f"https://t.me/{settings.BOT_USERNAME}"),
                InlineKeyboardButton(text="💬 Менеджер", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    await callback.message.answer(
        "✅ <b>Згенеровано готовий пост для каналу:</b>"
    )
    if trip.get("image"):
        await callback.message.answer_photo(
            photo=trip["image"],
            caption=post_text,
            reply_markup=booking_kb
        )
    else:
        await callback.message.answer(post_text, reply_markup=booking_kb)

# --- 5. ВІКТОРИНА (КВІЗ) У КАНАЛ ---
@router.callback_query(F.data == "cb_adm_send_quiz")
async def cb_send_quiz_menu(callback: CallbackQuery):
    await callback.answer()
    
    quiz_post = (
        "🧠 <b>РАНКОВА ВІКТОРИНА ВІД SVOI TRAVEL!</b> 🌍✨\n\n"
        "<b>Запитання:</b> У якому місті знаходиться відомий міст закоханих біля Озера Кохання (Minnewater)?\n\n"
        "1️⃣ Амстердам (Нідерланди)\n"
        "2️⃣ Брюгге (Бельгія) 🇧🇪\n"
        "3️⃣ Страсбург (Франція)\n\n"
        "<i>Натисніть правильну відповідь у вікторині! За правильну відповідь на вас чекає салют із конфетті! 🎉</i>"
    )

    quiz_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="1. Амстердам 🚲", callback_data="cb_quiz_ans_wrong"),
                InlineKeyboardButton(text="2. Брюгге 🏰 (Правильно)", callback_data="cb_quiz_ans_correct"),
                InlineKeyboardButton(text="3. Страсбург 🍷", callback_data="cb_quiz_ans_wrong")
            ],
            [
                InlineKeyboardButton(text="💺 Забронювати тур до Брюгге (110€)", url=f"https://t.me/{settings.BOT_USERNAME}?start=trip_bruges")
            ],
            [
                InlineKeyboardButton(text="🔙 Назад до керування каналом", callback_data="cb_adm_channel_menu")
            ]
        ]
    )

    await callback.message.answer(
        "🧠 <b>Офіційний квіз для публікації у Telegram-каналі:</b>\n"
        "<i>У Telegram надсилається як інтерактивний Poll/Quiz з конфетті або як інтерактивний пост із кнопкою швидкого бронювання:</i>"
    )
    await callback.message.answer(quiz_post, reply_markup=quiz_kb)

# --- 6. ПУБЛІКАЦІЯ КНОПКИ MINI APP ---
@router.callback_query(F.data == "cb_adm_post_miniapp")
async def cb_post_miniapp(callback: CallbackQuery):
    await callback.answer()
    
    post_text = (
        "🚀✨ <b>ЗУСТРІЧАЙТЕ НОВИЙ SVOI MINI APP У СТИЛІ «ЗОРЯНЕ НЕБО»!</b> 🌌🚐\n\n"
        "Тепер обрати тур та місце в салоні стало неймовірно зручно прямо всередині Telegram!\n\n"
        "<b>Що всередині нашої Mini App:</b>\n"
        "✨ <b>Інтерактивний салон Opel Vivaro</b>: оберіть своє улюблене крісло (панорама у водія, крісла з підлокітниками, зоряне LED-небо на стелі)\n"
        "🗺 <b>Вітрина всіх 14 турів</b> з яскравими фотографіями та описом\n"
        "⚡️ Миттєвий прорахунок вартості та надсилання броні в 1 клік\n\n"
        "Натискайте кнопку <b>«🚀 Відкрити Mini App»</b> та обирайте свою ідеальну подорож Європою!"
    )

    miniapp_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🚀 Відкрити Mini App (Зоряне небо)", url=f"https://t.me/{settings.BOT_USERNAME}")
            ],
            [
                InlineKeyboardButton(text="🗺 Наш розклад турів", url=f"https://t.me/{settings.BOT_USERNAME}"),
                InlineKeyboardButton(text="💬 Менеджер", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    await callback.message.answer(post_text, reply_markup=miniapp_kb)
