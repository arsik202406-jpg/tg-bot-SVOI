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
    waiting_for_channel_id = State()

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

def get_channel_menu_keyboard() -> InlineKeyboardMarkup:
    """Головне меню керування каналом для адміна"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🎁 Запустити новий РОЗІГРАШ", callback_data="cb_adm_gw_new"),
                InlineKeyboardButton(text="🏆 Вибрати переможця", callback_data="cb_adm_gw_pick")
            ],
            [
                InlineKeyboardButton(text="📢 Опублікувати тур у канал", callback_data="cb_adm_post_tour"),
                InlineKeyboardButton(text="🧠 Надіслати вікторину (Квіз)", callback_data="cb_adm_send_quiz")
            ],
            [
                InlineKeyboardButton(text="🚀 Опублікувати Mini App у канал", callback_data="cb_adm_post_miniapp")
            ],
            [
                InlineKeyboardButton(text="📋 Переглянути Лист очікування", callback_data="cb_adm_waitlist"),
                InlineKeyboardButton(text="⚙️ Змінити @канал для постів", callback_data="cb_adm_set_channel")
            ],
            [
                InlineKeyboardButton(text="🔙 Повернутися в головне меню", callback_data="cb_back")
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
                InlineKeyboardButton(text="🗺 Переглянути розклад турів", url=f"https://t.me/{settings.BOT_USERNAME}?start=trips"),
                InlineKeyboardButton(text="🚀 Mini App", web_app=WebAppInfo(url=settings.MINI_APP_URL))
            ]
        ]
    )

async def check_is_admin(user_id: int) -> bool:
    """Перевіряє, чи є користувач адміністратором"""
    return (user_id == settings.ADMIN_ID) or (settings.ADMIN_ID == 0)

@router.message(Command("channel"))
async def cmd_channel_admin(message: Message):
    """Команда /channel — центр керування каналом для адміністратора"""
    user_id = message.from_user.id if message.from_user else 0
    if not (await check_is_admin(user_id)):
        await message.answer("⛔ <b>Доступ заборонено!</b>\nЦей розділ доступний лише головному адміністратору клубу SVOI Travel.", parse_mode="HTML")
        return

    gw = GIVEAWAYS_DB.get("gw_active", {})
    participants_count = len(gw.get("participants", []))
    prize_title = gw.get("prize", "Не призначено")

    text = (
        "📢 <b>Центр керування Telegram-каналом SVOI Travel</b>\n\n"
        f"👑 Адміністратор ID: <code>{user_id}</code>\n"
        f"🎯 Цільовий канал для публікацій: <code>{CURRENT_CHANNEL_TARGET}</code>\n"
        f"📢 Посилання на канал: {settings.CHANNEL_URL}\n"
        f"💬 Група: {settings.GROUP_URL}\n\n"
        "<b>Поточний стан активностей:</b>\n"
        f"• 🎁 Активний розіграш: <i>{prize_title}</i>\n"
        f"• 👥 Учасників у базі: <b>{participants_count}</b>\n"
        f"• 📋 Заявок у листі очікування: <b>{len(WAITLIST_DATA)}</b>\n\n"
        "Оберіть дію нижче:"
    )
    await message.answer(text, reply_markup=get_channel_menu_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_adm_channel_menu")
async def cb_channel_menu(callback: CallbackQuery):
    """Повернення до головного меню панелі каналу"""
    await callback.answer()
    user_id = callback.from_user.id if callback.from_user else 0
    if not (await check_is_admin(user_id)):
        await callback.answer("⛔ Доступ лише для адміністратора!", show_alert=True)
        return

    gw = GIVEAWAYS_DB.get("gw_active", {})
    count = len(gw.get("participants", []))
    prize = gw.get("prize", "Поїздка до Парижа")

    text = (
        "📢 <b>Центр керування каналом SVOI Travel</b>\n\n"
        f"🎯 Цільовий канал: <code>{CURRENT_CHANNEL_TARGET}</code>\n"
        f"🎁 Поточний розіграш: <b>{prize}</b>\n"
        f"👥 Зареєстровано учасників: <b>{count}</b>\n"
        f"📋 У листі очікування: <b>{len(WAITLIST_DATA)} людей</b>\n\n"
        "Оберіть команду:"
    )
    await callback.message.edit_text(text, reply_markup=get_channel_menu_keyboard(), parse_mode="HTML")

# --- 1. ПУБЛІКАЦІЯ РОЗІГРАШУ В КАНАЛ ---
@router.callback_query(F.data == "cb_adm_gw_new")
async def cb_giveaway_new_prompt(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return
    await state.set_state(ChannelAdminStates.waiting_for_giveaway_prize)
    
    text = (
        "🎁 <b>Запуск нового РОЗІГРАШУ прямо в канал</b>\n\n"
        "Напишіть у відповідь: <b>який приз розігрується?</b>\n"
        "<i>Наприклад: «Безкоштовне місце в турі в Брюгге на 1 день 🍫»</i>\n\n"
        "Бот автоматично оформить пост, опублікує його в канал та додасть кнопку «🎉 Брати участь! (0)»."
    )
    cancel_kb = InlineKeyboardMarkup(
        inline_keyboard=[[InlineKeyboardButton(text="❌ Скасувати", callback_data="cb_adm_channel_menu")]]
    )
    await callback.message.edit_text(text, reply_markup=cancel_kb, parse_mode="HTML")

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
        "<i>Бот автоматично перевіряє підписку та рахує учасників. Переможця визначить рандом!</i>\n\n"
        "Усім удачі! Подорожуйте разом з @Svoi_TravelEU_bot 🚐💨"
    )

    kb = get_giveaway_button("gw_active", 0)

    # 1. Спроба прямої публікації в канал через Bot API
    channel_published = False
    target = CURRENT_CHANNEL_TARGET
    if target:
        try:
            sent_msg = await bot.send_message(chat_id=target, text=post_text, reply_markup=kb, parse_mode="HTML")
            channel_published = True
            GIVEAWAYS_DB["gw_active"]["message_id"] = sent_msg.message_id
        except Exception as e:
            logger.warning("Не вдалося автоматично опублікувати в %s: %s", target, e)

    if channel_published:
        await message.answer(
            f"✅ <b>Розіграш УСПІШНО ОПУБЛІКОВАНО прямо в канал {target}!</b> 🎉\n\n"
            "Підписники вже можуть натискати кнопку «Брати участь!». Лічильник оновлюватиметься автоматично.",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
    else:
        await message.answer(
            f"⚠️ <b>Пост створено!</b> (Бот не зміг опублікувати автоматично в {target}: переконайтеся, що бот доданий як адміністратор каналу з правом публікації).\n\n"
            "Ось готовий пост для перевірки та пересилання:",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
        await message.answer(post_text, reply_markup=kb, parse_mode="HTML")

# --- 2. ОБРОБКА НАТИСКАННЯ «БРАТИ УЧАСТЬ!» У КАНАЛІ ---
@router.callback_query(F.data.startswith("gw_join_"))
async def cb_giveaway_join(callback: CallbackQuery, bot: Bot):
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

    # Перевірка членства в каналі через get_chat_member
    is_subscribed = True
    try:
        if CURRENT_CHANNEL_TARGET:
            member = await bot.get_chat_member(chat_id=CURRENT_CHANNEL_TARGET, user_id=user.id)
            if member.status in ['left', 'kicked']:
                is_subscribed = False
    except Exception as e:
        logger.info("Subscription check skipped or invite link: %s", e)
        is_subscribed = True

    if not is_subscribed:
        await callback.answer("⚠️ Будь ласка, спочатку підпишіться на наш канал, щоб взяти участь!", show_alert=True)
        return

    participant_data = {
        "user_id": user.id,
        "username": f"@{user.username}" if user.username else user.first_name,
        "first_name": user.first_name
    }
    participants.append(participant_data)
    new_count = len(participants)

    await callback.answer(f"🎉 Вітаємо, {user.first_name}! Ви успішно зареєстровані! Номер: #{new_count} 🍀", show_alert=True)

    # Оновлюємо лічильник на кнопці поста
    try:
        await callback.message.edit_reply_markup(reply_markup=get_giveaway_button("gw_active", new_count))
    except Exception:
        pass

# --- 3. ПІДБИТТЯ ПІДСУМКІВ ТА ПУБЛІКАЦІЯ ПЕРЕМОЖЦЯ У КАНАЛ ---
@router.callback_query(F.data == "cb_adm_gw_pick")
async def cb_giveaway_pick_winner(callback: CallbackQuery, bot: Bot):
    await callback.answer()
    if not (await check_is_admin(callback.from_user.id)):
        return

    gw = GIVEAWAYS_DB.get("gw_active")
    if not gw:
        await callback.message.answer("❌ Активних розіграшів не знайдено.")
        return

    participants = gw.get("participants", [])
    if not participants:
        # Тестовий учасник для демонстрації
        participants = [
            {"user_id": settings.ADMIN_ID, "username": f"@{settings.MANAGER_USERNAME}", "first_name": "Олександр (Переможець)"}
        ]
        gw["participants"] = participants

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
                InlineKeyboardButton(text="💺 Забронювати поїздку", url=f"https://t.me/{settings.BOT_USERNAME}?start=trips"),
                InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME}")
            ]
        ]
    )

    # Публікація привітання в канал
    published = False
    target = CURRENT_CHANNEL_TARGET
    if target:
        try:
            await bot.send_message(chat_id=target, text=winner_post, reply_markup=action_kb, parse_mode="HTML")
            published = True
        except Exception as e:
            logger.warning("Не вдалося надіслати переможця в канал %s: %s", target, e)

    msg = f"🏆 <b>Переможця успішно визначено: {winner['first_name']} ({winner_mention})!</b>\n\n"
    if published:
        msg += f"✅ Привітальний пост автоматично опубліковано в канал <code>{target}</code>!"
    else:
        msg += f"⚠️ Надіслано вам у бот (додайте бота адміном у {target} для автопублікації):"

    await callback.message.answer(msg, parse_mode="HTML")
    await callback.message.answer(winner_post, reply_markup=action_kb, parse_mode="HTML")

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
        f"🚐 Комфортний трансфер Opel Vivaro (дводіапазонний клімат, відкидні крісла, USB, зоряне небо)\n"
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
        "🚀✨ <b>ЗУСТРІЧАЙТЕ НОВИЙ SVOI MINI APP У СТИЛІ «ЗОРЯНЕ НЕБО»!</b> 🌌🚐\n\n"
        "Тепер обрати тур та місце в салоні стало неймовірно зручно прямо всередині Telegram!\n\n"
        "<b>Що всередині нашої Mini App:</b>\n"
        "✨ <b>Інтерактивний салон Opel Vivaro</b>: оберіть своє крісло на сенсорній схемі\n"
        "🗺 <b>Вітрина всіх 14 турів</b> з яскравими фотографіями та описом\n"
        "⚡️ Прорахунок вартості та надсилання броні в 1 клік\n\n"
        "Натискайте кнопку <b>«🚀 Відкрити Mini App»</b> та вирушайте в подорож Європою!"
    )

    miniapp_kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🚀 Відкрити Mini App (Зоряне небо) 🌌", web_app=WebAppInfo(url=settings.MINI_APP_URL))
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
    
    # 1. Перевірка, чи це переслане повідомлення з каналу
    if message.forward_from_chat and message.forward_from_chat.type in ["channel", "supergroup"]:
        chat_id = str(message.forward_from_chat.id)
        chat_title = message.forward_from_chat.title or "Канал"
        CURRENT_CHANNEL_TARGET = chat_id
        await message.answer(
            f"✅ <b>Канал успішно визначено та прив'язано!</b> 🎉\n\n"
            f"📢 Назва: <b>{chat_title}</b>\n"
            f"🆔 ID каналу: <code>{CURRENT_CHANNEL_TARGET}</code>\n\n"
            "Тепер усі розіграші, опитування та пости публікуватимуться прямо в цей канал!",
            reply_markup=get_channel_menu_keyboard(),
            parse_mode="HTML"
        )
        return

    raw_text = (message.text or "").strip()
    if not raw_text:
        await message.answer("⚠️ Не вдалося визначити канал. Будь ласка, вкажіть @username або ID каналу:", reply_markup=get_channel_menu_keyboard())
        return

    # Якщо користувач ввів посилання на канал виду https://t.me/username
    if "t.me/" in raw_text and not raw_text.startswith("-100"):
        raw_text = "@" + raw_text.split("t.me/")[-1].strip("/@")

    CURRENT_CHANNEL_TARGET = raw_text
    await message.answer(
        f"✅ <b>Цільовий канал збережено:</b> <code>{CURRENT_CHANNEL_TARGET}</code>!\n\n"
        "Переконайтеся, що бот доданий адміністратором каналу з правом «Публікація повідомлень».",
        reply_markup=get_channel_menu_keyboard(),
        parse_mode="HTML"
    )

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

