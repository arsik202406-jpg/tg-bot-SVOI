from aiogram.fsm.state import State, StatesGroup

class FeedbackState(StatesGroup):
    waiting_for_text = State()

class BookingState(StatesGroup):
    choosing_trip = State()
    choosing_pax = State()
    choosing_seat = State()
    waiting_for_contact = State()
    confirmation = State()

class AdminTripEditState(StatesGroup):
    waiting_for_date = State()
    waiting_for_poster = State()
