from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
try:
    from bot_code.data.trips import TRIPS_CATALOG
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import TRIPS_CATALOG
    from config import settings

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """
    Главное меню бота SVOI Travel
    Кнопки расположены эргономично по 1-2 в ряд
    """
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    
    keyboard = [
        [
            InlineKeyboardButton(text="🗺 Поездки", callback_data="cb_trips"),
            InlineKeyboardButton(text="💺 Забронировать место", callback_data="cb_book")
        ],
        [
            InlineKeyboardButton(text="❓ Частые вопросы (FAQ)", callback_data="cb_faq"),
            InlineKeyboardButton(text="🎮 Игры и викторины", callback_data="cb_games")
        ],
        [
            InlineKeyboardButton(text="🚐 Фото авто", callback_data="cb_car"),
            InlineKeyboardButton(text="📍 Точки сбора", callback_data="cb_meeting")
        ],
        [
            InlineKeyboardButton(text="📜 Условия поездок", callback_data="cb_terms"),
            InlineKeyboardButton(text="🤝 Стать партнером", callback_data="cb_partner")
        ],
        [
            InlineKeyboardButton(text="✍️ Оставить пожелания", callback_data="cb_feedback")
        ],
        [
            InlineKeyboardButton(text="🆘 Поддержка (Менеджер)", url=manager_url),
            InlineKeyboardButton(text="📢 Наш Канал", url=settings.CHANNEL_URL)
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка возврата в главное меню"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """Список всех доступных направлений с ценами в столбик"""
    buttons = []
    for trip_id, trip in TRIPS_CATALOG.items():
        text = f"📍 {trip['short_title']} — {trip['price']}{trip['currency']}"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    
    buttons.append([InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """Клавиатура для карточки тура с бронью и возвратом"""
    keyboard = [
        [
            InlineKeyboardButton(
                text="💺 Забронировать этот тур", 
                callback_data=f"cb_book_target_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(text="🗺 Другие направления", callback_data="cb_trips"),
            InlineKeyboardButton(text="🔙 Главное меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """
    Клавиатура выбора места в салоне Opel Vivaro (8 пассажирских мест):
    1-й ряд (рядом с водителем): 2 места
    2-й ряд: 3 места
    3-й ряд: 3 места
    Интерактивные плашки по порядку.
    Фиксация любого конкретного места — 5€, без выбора (свободная посадка) — 0€
    """
    keyboard = [
        [
            InlineKeyboardButton(
                text="💺 Место 1 (рядом с водителем) — 5€", 
                callback_data=f"cb_seat_1_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Место 2 (водитель, окно) — 5€", 
                callback_data=f"cb_seat_2_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💺 Место 3 (2-й ряд, окно) — 5€", 
                callback_data=f"cb_seat_3_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Место 4 (2-й ряд, центр) — 5€", 
                callback_data=f"cb_seat_4_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Место 5 (2-й ряд, окно) — 5€", 
                callback_data=f"cb_seat_5_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💺 Место 6 (3-й ряд, окно) — 5€", 
                callback_data=f"cb_seat_6_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Место 7 (3-й ряд, центр) — 5€", 
                callback_data=f"cb_seat_7_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Место 8 (3-й ряд, окно) — 5€", 
                callback_data=f"cb_seat_8_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="🎲 Без выбора места (свободная посадка) — 0€", 
                callback_data=f"cb_seat_none_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(text="💬 Написать менеджеру лично", url=f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_faq_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура раздела частых вопросов"""
    faq_post_url = "https://t.me/c/3876884115/5"
    keyboard = [
        [
            InlineKeyboardButton(text="💳 Когда оплата? (Без предоплаты)", callback_data="cb_faq_payment"),
            InlineKeyboardButton(text="⏱ Сколько времени на локациях?", callback_data="cb_faq_time")
        ],
        [
            InlineKeyboardButton(text="🎯 Размеренный vs темп: как выбрать тур?", callback_data="cb_faq_choose"),
            InlineKeyboardButton(text="💺 Схема мест (2+3+3) и регулировки", callback_data="cb_faq_seats")
        ],
        [
            InlineKeyboardButton(text="🚶 Как мы гуляем по локациям?", callback_data="cb_faq_walking")
        ],
        [
            InlineKeyboardButton(text="📌 Читать тему FAQ в Telegram", url=faq_post_url)
        ],
        [
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_games_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура интерактивных игр и викторин"""
    keyboard = [
        [
            InlineKeyboardButton(text="🕵️ Игра «Гео-Детектив»", callback_data="cb_game_geo")
        ],
        [
            InlineKeyboardButton(text="🧠 Викторина «Правда или Ложь»", callback_data="cb_game_quiz")
        ],
        [
            InlineKeyboardButton(text="🎁 Розыгрыши и викторины в группе", callback_data="cb_game_group_info")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_cancel_feedback_keyboard() -> InlineKeyboardMarkup:
    """Клавиатура для отмены ввода отзыва/пожелания"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="cb_cancel_feedback")]
        ]
    )
