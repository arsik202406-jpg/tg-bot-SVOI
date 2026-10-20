import logging
from aiogram import Router, F, Bot
from aiogram.types import (
    Message,
    CallbackQuery,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    InputMediaPhoto
)
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext

try:
    from bot_code.data.trips import (
        TRIPS_CATALOG,
        get_free_seats,
        set_free_seats,
        get_trip_date,
        set_trip_date,
        get_trip_poster,
        set_trip_poster,
        format_trip_card_html,
        WAITLIST_DATA
    )
    from bot_code.keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_pax_keyboard,
        get_seats_keyboard,
        get_admin_seats_edit_keyboard
    )
    from bot_code.states.states import BookingState, AdminTripEditState
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import (
        TRIPS_CATALOG,
        get_free_seats,
        set_free_seats,
        get_trip_date,
        set_trip_date,
        get_trip_poster,
        set_trip_poster,
        format_trip_card_html,
        WAITLIST_DATA
    )
    from keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_pax_keyboard,
        get_seats_keyboard,
        get_admin_seats_edit_keyboard
    )
    from states.states import BookingState, AdminTripEditState
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="trips_router")

TRIPS_HEADER = (
    "🗺 <b>Напрямки та дати поїздок SVOI — Повна інформація по програмах</b> 🇪🇺✨\n\n"
    "Ми організовуємо душевні авторські подорожі в камерному форматі (до 8 осіб) на комфортабельному <b>Opel Vivaro</b>:\n\n"
    "🌍 <b>Детальний огляд наших поїздок за країнами:</b>\n"
    "• 🇫🇷 <b>Франція:</b>\n"
    "  — <b>Ельзас + Страсбург + Кольмар (80€):</b> Маленька Франція, собор Нотр-Дам, канали Кольмара, Тарт Фламбе\n"
    "  — <b>Париж (120€):</b> Версальський палац, круїз на яхті по Сені, Лувр, вечірня Ейфелева вежа\n"
    "  — <b>Етрета + Париж (140€):</b> 5 годин на скелях Етрета біля океану + 2–3 год вечірній Париж\n"
    "  — <b>Мон-Сен-Мішель (2 дні, 270€):</b> острів-абатство, Сен-Мало та устриці Канкаля (готель включено)\n"
    "  — <b>Лазурове узбережжя (3 дні, 440€):</b> Ніцца, Монако, Монте-Карло, Канни (готель включено)\n"
    "• 🇧🇪 <b>Бельгія:</b>\n"
    "  — <b>Брюссель, Антверпен та Брюгге (90€–110€):</b> Гран-Плас, Атоміум, вокзал-палац Антверпена, Озеро Кохання та канали Брюгге\n"
    "• 🇳🇱 <b>Голландія (Нідерланди):</b>\n"
    "  — <b>Гітхорн, Заандам, Амстердам, Море (120€):</b> водне село Гітхорн, вітряки Заандама, канали Амстердама та пляж Північного моря\n"
    "• 🇩🇪 <b>Німеччина:</b>\n"
    "  — <b>Замок Нойшванштайн, Берлін, Дрезден, Штутгарт, Леголенд, Ліндау (120€):</b> баварські замки, музеї авто, парк Legoland та столичні маршрути\n"
    "• 🇱🇮 <b>Ліхтенштейн (3 країни за 1 день, 120€):</b>\n"
    "  — <b>Вадуц, Брегенц та Ліндау:</b> замок Вадуц, сцена на Боденському озері в Брегенці та острів Ліндау\n"
    "• 🇨🇭 <b>Швейцарія (120€):</b>\n"
    "  — <b>Рейнський водоспад + Цюрих + Люцерн</b> АБО <b>Ущелина Ааре + Лаутербруннен (72 водоспади) + Берн</b>\n"
    "• 🇮🇹 <b>Італія (2 дні, 270€):</b> <b>Озеро Комо + Мілан</b> (вілли Белладжо, катер, собор Дуомо, готель включено)\n"
    "• 🇨🇿 <b>Чехія (120€):</b> <b>Прага</b> (Празький Град, Карлів міст, куранти Орлой)\n\n"
    "<blockquote>🚐 <b>Авто:</b> 8-місний <b>Opel Vivaro</b> (клімат-контроль, USB, стеля «Зоряне небо», багаж до <code>10 кг</code>)\n"
    "📍 <b>Збір за адресою (Door-to-Door):</b> Саарланд, Трір та Люксембург\n"
    "💳 <b>Оплата:</b> <code>0% передоплати</code> на всі одноденні тури!</blockquote>\n\n"
    "👇 <b>Натисніть на будь-яку поїздку нижче, щоб відкрити погодинну програму, фото та забронювати місце:</b>"
)

async def edit_or_replace_with_text(callback: CallbackQuery, text: str, reply_markup: InlineKeyboardMarkup):
    """
    Універсальна функція редагування повідомлення (без спаму в чаті).
    Якщо попереднє повідомлення мало фото (картка туру), замінює або редагує його в одному вікні.
    """
    if not callback.message:
        return
    try:
        if callback.message.photo:
            await callback.message.delete()
            await callback.message.answer(text=text, reply_markup=reply_markup, parse_mode="HTML")
        else:
            await callback.message.edit_text(text=text, reply_markup=reply_markup, parse_mode="HTML")
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            try:
                await callback.message.edit_caption(caption=text, reply_markup=reply_markup, parse_mode="HTML")
            except Exception:
                pass

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery, state: FSMContext):
    """Виводить список напрямків з датами, цінами та лічильником вільних місць в тому ж вікні"""
    await callback.answer()
    await state.clear()
    await edit_or_replace_with_text(callback, TRIPS_HEADER, get_trips_keyboard())

@router.callback_query(F.data.startswith("cb_trip_"))
async def process_trip_detail(callback: CallbackQuery, state: FSMContext):
    """
    Виводить детальну картку туру за єдиним шаблоном:
    - Яскравий постер (фото) місця
    - Заголовок жирним: Прапор + Назва | Дата
    - Програма по годинах (3-4 пункти булітами)
    - Блок <blockquote> + <code>
    - Чіткий блок внизу: 💶 Ціна: XX€ | 🔥 Місць: X з 8
    """
    await callback.answer()
    await state.clear()
    trip_id = callback.data.replace("cb_trip_", "")
    
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не знайдено", show_alert=True)
        return

    is_admin = (callback.from_user.id == settings.ADMIN_ID) if callback.from_user else False
    caption = format_trip_card_html(trip_id, is_admin=is_admin)
    markup = get_trip_detail_keyboard(trip_id, is_admin=is_admin)
    poster = get_trip_poster(trip_id)

    if not callback.message:
        return

    try:
        media = InputMediaPhoto(media=poster, caption=caption, parse_mode="HTML")
        await callback.message.edit_media(media=media, reply_markup=markup)
    except TelegramBadRequest:
        try:
            await callback.message.edit_text(text=caption, reply_markup=markup, parse_mode="HTML")
        except TelegramBadRequest:
            pass

# ================= АДМІН-КЕРУВАННЯ ТУРОМ: МІСЦЯ, ДАТИ, ПОСТЕР =================

@router.callback_query(F.data.startswith("cb_adm_seats_"))
async def process_adm_seats_open(callback: CallbackQuery):
    """Відкриває меню зміни вільних місць для адміна (в тому ж повідомленні)"""
    await callback.answer()
    if not callback.from_user or callback.from_user.id != settings.ADMIN_ID:
        await callback.answer("Доступ лише для адміністратора!", show_alert=True)
        return
        
    trip_id = callback.data.replace("cb_adm_seats_", "")
    trip = TRIPS_CATALOG.get(trip_id, {})
    current_free = get_free_seats(trip_id)

    text = (
        f"⚙️ <b>Керування місцями: {trip.get('title', trip_id)}</b>\n\n"
        f"Поточна кількість вільних місць: <b>{current_free} із 8</b>\n\n"
        "Оберіть нове значення (від 0 до 8):"
    )
    await edit_or_replace_with_text(callback, text, get_admin_seats_edit_keyboard(trip_id))

@router.callback_query(F.data.startswith("cb_set_seats_"))
async def process_set_seats(callback: CallbackQuery, state: FSMContext):
    """Зберігає нову кількість вільних місць для туру"""
    parts = callback.data.split("_")
    # cb_set_seats_{trip_id}_{count}
    count = int(parts[-1])
    trip_id = "_".join(parts[3:-1])
    
    set_free_seats(trip_id, count)
    await callback.answer(f"✅ Встановлено {count} з 8 вільних місць!", show_alert=True)
    
    callback.data = f"cb_trip_{trip_id}"
    await process_trip_detail(callback, state)

@router.callback_query(F.data.startswith("cb_adm_date_"))
async def process_adm_date_open(callback: CallbackQuery, state: FSMContext):
    """Відкриває меню зміни дати виїзду для адміна"""
    await callback.answer()
    if not callback.from_user or callback.from_user.id != settings.ADMIN_ID:
        await callback.answer("Доступ лише для адміністратора!", show_alert=True)
        return

    trip_id = callback.data.replace("cb_adm_date_", "")
    trip = TRIPS_CATALOG.get(trip_id, {})
    current_date = get_trip_date(trip_id)

    await state.update_data(admin_edit_trip_id=trip_id)
    await state.set_state(AdminTripEditState.waiting_for_date)

    quick_dates = ["24 жовтня", "25 жовтня", "31 жовтня", "1 листопада", "7–8 листопада", "14–15 листопада"]
    kb_rows = []
    for i in range(0, len(quick_dates), 2):
        row = [
            InlineKeyboardButton(
                text=f"📅 {d}",
                callback_data=f"cb_set_date_{trip_id}_{d}"
            )
            for d in quick_dates[i:i+2]
        ]
        kb_rows.append(row)
    kb_rows.append([
        InlineKeyboardButton(text="🔙 До картки туру", callback_data=f"cb_trip_{trip_id}"),
        InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
    ])

    text = (
        f"📅 <b>Зміна дати поїздки [Адмін]</b>\n\n"
        f"Тур: <b>{trip.get('title', trip_id)}</b>\n"
        f"Поточна дата: <code>{current_date}</code>\n\n"
        "👉 Оберіть швидку дату кнопкою нижче АБО <b>напишіть нову дату в чат</b> (наприклад: <code>15 листопада</code>):"
    )
    await edit_or_replace_with_text(callback, text, InlineKeyboardMarkup(inline_keyboard=kb_rows))

@router.callback_query(F.data.startswith("cb_set_date_"))
async def process_adm_date_quick_set(callback: CallbackQuery, state: FSMContext):
    """Швидке збереження дати поїздки кнопкою"""
    raw = callback.data.replace("cb_set_date_", "")
    # Find matching trip_id prefix
    matched_trip_id = None
    new_date = ""
    for tid in TRIPS_CATALOG.keys():
        if raw.startswith(f"{tid}_"):
            matched_trip_id = tid
            new_date = raw[len(tid) + 1:]
            break

    if not matched_trip_id:
        await callback.answer("Помилка визначення туру", show_alert=True)
        return

    set_trip_date(matched_trip_id, new_date)
    await state.clear()
    await callback.answer(f"✅ Нову дату «{new_date}» збережено!", show_alert=True)
    callback.data = f"cb_trip_{matched_trip_id}"
    await process_trip_detail(callback, state)

@router.message(AdminTripEditState.waiting_for_date)
async def process_adm_date_text_input(message: Message, state: FSMContext):
    """Зберігає нову дату туру, введену адміном вручну"""
    if not message.from_user or message.from_user.id != settings.ADMIN_ID:
        return
    data = await state.get_data()
    trip_id = data.get("admin_edit_trip_id", "paris")
    new_date = (message.text or "").strip()
    if not new_date:
        return

    set_trip_date(trip_id, new_date)
    await state.clear()
    caption = format_trip_card_html(trip_id, is_admin=True)
    markup = get_trip_detail_keyboard(trip_id, is_admin=True)
    poster = get_trip_poster(trip_id)

    try:
        await message.answer_photo(
            photo=poster,
            caption=f"✅ <b>Дату туру оновлено на «{new_date}»!</b>\n\n{caption}",
            reply_markup=markup,
            parse_mode="HTML"
        )
    except Exception:
        await message.answer(
            text=f"✅ <b>Дату туру оновлено на «{new_date}»!</b>\n\n{caption}",
            reply_markup=markup,
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_adm_poster_"))
async def process_adm_poster_open(callback: CallbackQuery, state: FSMContext):
    """Відкриває меню зміни постера (фото) туру для адміна"""
    await callback.answer()
    if not callback.from_user or callback.from_user.id != settings.ADMIN_ID:
        await callback.answer("Доступ лише для адміністратора!", show_alert=True)
        return

    trip_id = callback.data.replace("cb_adm_poster_", "")
    trip = TRIPS_CATALOG.get(trip_id, {})
    await state.update_data(admin_edit_trip_id=trip_id)
    await state.set_state(AdminTripEditState.waiting_for_poster)

    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="🔙 До картки туру", callback_data=f"cb_trip_{trip_id}"),
                InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
            ]
        ]
    )
    text = (
        f"🖼 <b>Зміна постера (фото) туру [Адмін]</b>\n\n"
        f"Тур: <b>{trip.get('title', trip_id)}</b>\n\n"
        "👉 <b>Надішліть нове фото прямо сюди в чат</b> (як картинку) АБО вставте пряме посилання <code>https://...</code> на зображення:"
    )
    await edit_or_replace_with_text(callback, text, kb)

@router.message(AdminTripEditState.waiting_for_poster)
async def process_adm_poster_input(message: Message, state: FSMContext):
    """Зберігає новий постер туру (підтримує завантажене фото в Telegram або URL)"""
    if not message.from_user or message.from_user.id != settings.ADMIN_ID:
        return
    data = await state.get_data()
    trip_id = data.get("admin_edit_trip_id", "paris")

    new_poster = ""
    if message.photo and len(message.photo) > 0:
        # Використовуємо file_id найбільшого фото Telegram
        new_poster = message.photo[-1].file_id
    elif message.text and message.text.strip().startswith("http"):
        new_poster = message.text.strip()

    if not new_poster:
        await message.answer("⚠️ Будь ласка, надішліть фотографію або коректне посилання (https://...).")
        return

    set_trip_poster(trip_id, new_poster)
    await state.clear()

    caption = format_trip_card_html(trip_id, is_admin=True)
    markup = get_trip_detail_keyboard(trip_id, is_admin=True)

    try:
        await message.answer_photo(
            photo=new_poster,
            caption=f"✅ <b>Постер туру успішно оновлено!</b>\n\n{caption}",
            reply_markup=markup,
            parse_mode="HTML"
        )
    except Exception:
        await message.answer(
            text=f"✅ <b>Постер туру успішно оновлено!</b>\n\n{caption}",
            reply_markup=markup,
            parse_mode="HTML"
        )

# ================= ЛИСТ ОЧІКУВАННЯ ТА ПЕРЕХІД ДО БРОНЮВАННЯ В 1-2 КЛІКИ =================

@router.callback_query(F.data.startswith("cb_waitlist_add_"))
async def process_waitlist_add(callback: CallbackQuery, bot: Bot):
    """Запис клієнта у лист очікування на тур"""
    await callback.answer()
    trip_id = callback.data.replace("cb_waitlist_add_", "")
    trip = TRIPS_CATALOG.get(trip_id, {})
    user = callback.from_user
    
    new_entry = {
        "id": f"wl-{len(WAITLIST_DATA)+1}",
        "user_id": user.id if user else 0,
        "name": user.first_name if user else "Клієнт",
        "handle": f"@{user.username}" if user and user.username else "без юзернейма",
        "trip_id": trip_id,
        "trip_title": trip.get("short_title", trip_id),
        "desired_date": get_trip_date(trip_id),
        "seats": 1,
        "status": "очікує"
    }
    WAITLIST_DATA.append(new_entry)

    try:
        admin_text = (
            "📋 <b>НОВИЙ ЗАПИС У ЛИСТ ОЧІКУВАННЯ!</b>\n\n"
            f"👤 Клієнт: <b>{new_entry['name']}</b> ({new_entry['handle']})\n"
            f"🆔 ID: <code>{new_entry['user_id']}</code>\n"
            f"🗺 Тур: <b>{new_entry['trip_title']}</b> | 📅 <b>{new_entry['desired_date']}</b>"
        )
        await bot.send_message(chat_id=settings.ADMIN_ID, text=admin_text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Не вдалося надіслати лист очікування адміну: %s", e)

    confirm_text = (
        "✅ <b>Ви успішно додані до листа очікування!</b> 📋✨\n\n"
        f"Тур: <b>{trip.get('title', 'Обраний тур')}</b> ({get_trip_date(trip_id)})\n"
        "Як тільки з'явиться вільне місце або відкриється додатковий рейс — менеджер клубу SVOI миттєво напише вам!"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🗺 Інші напрямки", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )
    await edit_or_replace_with_text(callback, confirm_text, kb)

@router.callback_query(F.data.startswith("cb_book_target_"))
async def process_book_target_trip(callback: CallbackQuery, state: FSMContext):
    """
    Крок 2 покрокової воронки бронювання (після вибору туру):
    Вибір конкретного місця в салоні Opel Vivaro для обраного туру!
    """
    await callback.answer()
    trip_id = callback.data.replace("cb_book_target_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    
    trip_title = trip["title"] if trip else "Європейський тур SVOI"
    trip_date = get_trip_date(trip_id) if trip else "Найближчий виїзд"
    price = trip["price"] if trip else 120

    await state.update_data(trip_id=trip_id, trip_title=trip_title, trip_date=trip_date)
    await state.set_state(BookingState.choosing_seat)
    
    text = (
        f"💺 <b>Крок 2 із 3: Оберіть місце в салоні Opel Vivaro</b>\n\n"
        f"• 🗺 <b>Обраний тур:</b> {trip_title}\n"
        f"• 📅 <b>Дата виїзду:</b> {trip_date}\n"
        f"• 💶 <b>Базова вартість:</b> {price}€ / особа\n\n"
        "🚐 <b>Схема 8-місного салону (2+3+3):</b>\n"
        "• <b>1-й ряд (поруч з водієм):</b> Місце 1 — <code>+5€ (Панорамне)</code>, Місце 2 — <code>+5€ (Вікно)</code>\n"
        "• <b>2-й ряд:</b> Місце 3 (ліве), Місце 4 (центр), Місце 5 (праве) — <code>+5€</code>\n"
        "• <b>3-й ряд:</b> Місце 6 (ліве <code>+5€</code>), Місце 7 (центр <code>0€</code>), Місце 8 (праве <code>+5€</code>)\n"
        "• <b>🎲 Вільна посадка:</b> без фіксації місця — <code>0€</code>\n\n"
        "<blockquote>👇 Натисніть на потрібне місце в салоні (або оберіть 2 / 3+ місць поруч):</blockquote>"
    )
    await edit_or_replace_with_text(callback, text, get_seats_keyboard(trip_id))

@router.callback_query(F.data.startswith("cb_open_seats_"))
async def process_open_seats_schema(callback: CallbackQuery, state: FSMContext):
    """Перехід до схеми вибору конкретного місця в салоні Opel Vivaro"""
    await process_book_target_trip(callback, state)
