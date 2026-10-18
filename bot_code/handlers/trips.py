import logging
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext

try:
    from bot_code.data.trips import (
        TRIPS_CATALOG, 
        get_free_seats, 
        set_free_seats, 
        WAITLIST_DATA
    )
    from bot_code.keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_seats_keyboard,
        get_admin_seats_edit_keyboard
    )
    from bot_code.states.states import BookingState
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import (
        TRIPS_CATALOG, 
        get_free_seats, 
        set_free_seats, 
        WAITLIST_DATA
    )
    from keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_seats_keyboard,
        get_admin_seats_edit_keyboard
    )
    from states.states import BookingState
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="trips_router")

TRIPS_HEADER = (
    "🗺 <b>Актуальні напрямки та розклад турів SVOI</b> 🇪🇺✨\n\n"
    "Усі поїздки здійснюються із <b>Саарбрюккена</b> (з підсадкою за маршрутом) "
    "на комфортабельному VIP-мінівені Opel Vivaro.\n\n"
    "👇 <i>Натисніть на напрямок, щоб відкрити програму туру та кількість вільних місць:</i>"
)

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery):
    """Виводить список напрямків з цінами та лічильником вільних місць"""
    await callback.answer()
    try:
        if callback.message:
            await callback.message.edit_text(
                text=TRIPS_HEADER,
                reply_markup=get_trips_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data.startswith("cb_trip_"))
async def process_trip_detail(callback: CallbackQuery):
    """Виводить детальну картку туру з лічильником місць"""
    await callback.answer()
    trip_id = callback.data.replace("cb_trip_", "")
    
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не знайдено", show_alert=True)
        return

    is_admin = (callback.from_user.id == settings.ADMIN_ID)
    free_seats = get_free_seats(trip_id)
    
    if free_seats > 4:
        seats_status = f"🟢 <b>Вільних місць: {free_seats} із 8</b>"
    elif free_seats > 0:
        seats_status = f"🟡 <b>Залишилося лише {free_seats} місця!</b>"
    else:
        seats_status = "🔴 <b>Усі 8 місць зайняті (доступний лист очікування)</b>"

    full_description = (
        f"{trip['description']}\n\n"
        f"📊 <b>Статус заповнення рейсу:</b>\n"
        f"• {seats_status}"
    )

    if is_admin:
        full_description += f"\n👑 <i>(Панель адміна: ви можете змінювати лічильник вільних місць кнопкою нижче)</i>"
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=full_description,
                reply_markup=get_trip_detail_keyboard(trip_id, is_admin=is_admin),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data.startswith("cb_adm_seats_"))
async def process_adm_seats_open(callback: CallbackQuery):
    """Відкриває меню зміни вільних місць для адміна"""
    await callback.answer()
    if callback.from_user.id != settings.ADMIN_ID:
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
    await callback.message.edit_text(text=text, reply_markup=get_admin_seats_edit_keyboard(trip_id), parse_mode="HTML")

@router.callback_query(F.data.startswith("cb_set_seats_"))
async def process_set_seats(callback: CallbackQuery):
    """Зберігає нову кількість вільних місць для туру"""
    parts = callback.data.split("_")
    # cb_set_seats_{trip_id}_{count}
    trip_id = parts[3]
    count = int(parts[4])
    
    set_free_seats(trip_id, count)
    await callback.answer(f"✅ Встановлено {count} вільних місць!", show_alert=True)
    
    # Повертаємо оновлену картку туру
    callback.data = f"cb_trip_{trip_id}"
    await process_trip_detail(callback)

@router.callback_query(F.data.startswith("cb_waitlist_add_"))
async def process_waitlist_add(callback: CallbackQuery, bot: Bot):
    """Запис клієнта у лист очікування на тур"""
    await callback.answer()
    trip_id = callback.data.replace("cb_waitlist_add_", "")
    trip = TRIPS_CATALOG.get(trip_id, {})
    user = callback.from_user
    
    # Записуємо в базу
    new_entry = {
        "id": f"wl-{len(WAITLIST_DATA)+1}",
        "user_id": user.id,
        "name": user.first_name,
        "handle": f"@{user.username}" if user.username else "без юзернейма",
        "trip_id": trip_id,
        "trip_title": trip.get("short_title", trip_id),
        "desired_date": "Найближчий виїзд",
        "seats": 1,
        "status": "очікує"
    }
    WAITLIST_DATA.append(new_entry)

    # Сповіщення адміну
    try:
        admin_text = (
            "📋 <b>НОВИЙ ЗАПИС У ЛИСТ ОЧІКУВАННЯ!</b>\n\n"
            f"👤 Клієнт: <b>{user.first_name}</b> ({new_entry['handle']})\n"
            f"🆔 ID: <code>{user.id}</code>\n"
            f"🗺 Тур: <b>{new_entry['trip_title']}</b>\n"
            f"💺 Запитано місць: 1\n"
            f"📅 Дата: Найближчий рейс"
        )
        await bot.send_message(chat_id=settings.ADMIN_ID, text=admin_text, parse_mode="HTML")
    except Exception as e:
        logger.warning("Не вдалося надіслати лист очікування адміну: %s", e)

    confirm_text = (
        "✅ <b>Ви успішно додані до листа очікування!</b> 📋✨\n\n"
        f"Тур: <b>{trip.get('title', 'Обраний тур')}</b>\n"
        "Як тільки з'явиться вільне місце або відкриється додатковий рейс — менеджер клубу SVOI миттєво напише вам!"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🗺 Інші напрямки", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
        ]
    )
    await callback.message.edit_text(confirm_text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data.startswith("cb_book_target_"))
async def process_book_target_trip(callback: CallbackQuery, state: FSMContext):
    """Перехід до вибору місця та оформлення конкретного туру"""
    await callback.answer()
    trip_id = callback.data.replace("cb_book_target_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    
    trip_title = trip["title"] if trip else "Обраний тур"
    await state.update_data(trip_id=trip_id, trip_title=trip_title)
    await state.set_state(BookingState.choosing_seat)
    
    text = (
        f"🎯 <b>Бронювання туру: {trip_title}</b>\n\n"
        "Схема салону 8-місного Opel Vivaro (номери крісел):\n\n"
        "• <b>1️⃣–2️⃣:</b> VIP біля водія (+15€, панорамний огляд)\n"
        "• <b>3️⃣–5️⃣:</b> Капітанські крісла 2-го ряду (+5..10€)\n"
        "• <b>6️⃣–8️⃣:</b> Затишний диван 3-го ряду (0..5€)\n"
        "• <b>🎲 Вільна посадка:</b> 0€ доплати\n\n"
        "👇 <i>Оберіть потрібне місце (номер вказано на кнопці):</i>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=text,
                reply_markup=get_seats_keyboard(trip_id),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass
