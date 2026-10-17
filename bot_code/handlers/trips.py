import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery
from aiogram.exceptions import TelegramBadRequest
from aiogram.fsm.context import FSMContext

from bot_code.data.trips import TRIPS_CATALOG
from bot_code.keyboards.inline import (
    get_trips_keyboard,
    get_trip_detail_keyboard,
    get_seats_keyboard
)
from bot_code.states.states import BookingState

logger = logging.getLogger(__name__)
router = Router(name="trips_router")

TRIPS_HEADER = (
    "🗺 <b>Актуальные направления и расписание туров SVOI</b> 🇪🇺✨\n\n"
    "Все поездки осуществляются из <b>Саарбрюккена</b> (с подсадкой по маршруту) "
    "на комфортабельном VIP-минивэне Opel Vivaro.\n\n"
    "👇 <i>Нажмите на направление, чтобы открыть подробную программу тура и забронировать:</i>"
)

@router.callback_query(F.data == "cb_trips")
async def process_trips_list(callback: CallbackQuery):
    """Выводит список направлений с ценами в столбик"""
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
    """Выводит подробную карточку выбранного тура"""
    await callback.answer()
    trip_id = callback.data.replace("cb_trip_", "")
    
    trip = TRIPS_CATALOG.get(trip_id)
    if not trip:
        await callback.answer("Тур не найден", show_alert=True)
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
    """Переход к выбору места и оформлению конкретного тура"""
    await callback.answer()
    trip_id = callback.data.replace("cb_book_target_", "")
    trip = TRIPS_CATALOG.get(trip_id)
    
    trip_title = trip["title"] if trip else "Выбранный тур"
    await state.update_data(trip_id=trip_id, trip_title=trip_title)
    await state.set_state(BookingState.choosing_seat)
    
    text = (
        f"🎯 <b>Бронирование тура: {trip_title}</b>\n\n"
        "Вы можете выбрать конкретное место в 8-местном минивэне Opel Vivaro:\n\n"
        "💺 <b>Фиксированное место на выбор:</b> +5€\n"
        "🎲 <b>Без выбора места (свободная посадка):</b> 0€\n\n"
        "👇 <i>Выберите номер места в салоне:</i>"
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
