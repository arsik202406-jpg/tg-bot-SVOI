import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext

try:
    from bot_code.data.trips import TRIPS_CATALOG
    from bot_code.keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_seats_keyboard
    )
    from bot_code.states.states import BookingState
except ModuleNotFoundError:
    from data.trips import TRIPS_CATALOG
    from keyboards.inline import (
        get_trips_keyboard,
        get_trip_detail_keyboard,
        get_seats_keyboard
    )
    from states.states import BookingState

logger = logging.getLogger(__name__)
router = Router(name="trips_router")

TRIPS_HEADER = (
    "🗺 <b>Актуальні напрямки та розклад турів SVOI</b> 🇪🇺✨\n\n"
    "Усі поїздки здійснюються із <b>Саарбрюккена</b> (з підсадкою за маршрутом) "
    "на комфортабельному VIP-мінівені Opel Vivaro.\n\n"
    "👇 <i>Натисніть на напрямок, щоб відкрити детальну програму туру та забронювати:</i>"
)

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery):
    """Виводить список напрямків з цінами у стовпчик"""
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
    """Виводить детальну картку обраного туру"""
    await callback.answer()
    trip_id = callback.data.replace("cb_trip_", "")
    
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не знайдено", show_alert=True)
        return
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=trip["description"],
                reply_markup=get_trip_detail_keyboard(trip_id),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

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
        "Ви можете обрати конкретне місце у 8-місному мінівені Opel Vivaro:\n\n"
        "💺 <b>Фіксоване місце на вибір:</b> +5€\n"
        "🎲 <b>Без вибору місця (вільна посадка):</b> 0€\n\n"
        "👇 <i>Оберіть номер місця в салоні:</i>"
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
