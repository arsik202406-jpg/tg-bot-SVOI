from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton
try:
    from bot_code.data.trips import TRIPS_CATALOG
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import TRIPS_CATALOG
    from config import settings

def get_main_menu_keyboard() -> InlineKeyboardMarkup:
    """
    Головне меню бота SVOI Travel
    Кнопки розташовані ергономічно по 1-2 в ряд
    """
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    
    keyboard = [
        [
            InlineKeyboardButton(text="🚀 Відкрити Mini App (Зоряне небо & 3D)", callback_data="cb_open_miniapp")
        ],
        [
            InlineKeyboardButton(text="🗺 Поїздки", callback_data="cb_trips"),
            InlineKeyboardButton(text="💺 Забронювати місце", callback_data="cb_book")
        ],
        [
            InlineKeyboardButton(text="❓ Часті питання (FAQ)", callback_data="cb_faq"),
            InlineKeyboardButton(text="🎮 Ігри та вікторини", callback_data="cb_games")
        ],
        [
            InlineKeyboardButton(text="🚐 Фото авто", callback_data="cb_car"),
            InlineKeyboardButton(text="📍 Точки збору", callback_data="cb_meeting")
        ],
        [
            InlineKeyboardButton(text="📜 Умови поїздок", callback_data="cb_terms"),
            InlineKeyboardButton(text="🤝 Стати партнером", callback_data="cb_partner")
        ],
        [
            InlineKeyboardButton(text="✍️ Залишити побажання / відгук", callback_data="cb_feedback")
        ],
        [
            InlineKeyboardButton(text="🆘 Підтримка (Менеджер)", url=manager_url),
            InlineKeyboardButton(text="📢 Наш Канал", url=settings.CHANNEL_URL)
        ],
        [
            InlineKeyboardButton(text="📢 Керування каналом (/channel)", callback_data="cb_adm_channel_menu")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка повернення до головного меню"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """Список усіх доступних напрямків з цінами у стовпчик"""
    buttons = []
    for trip_id, trip in TRIPS_CATALOG.items():
        text = f"📍 {trip['short_title']} — {trip['price']}{trip['currency']}"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    
    buttons.append([InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """Клавіатура для картки туру з бронюванням та поверненням"""
    keyboard = [
        [
            InlineKeyboardButton(
                text="💺 Забронювати цей тур", 
                callback_data=f"cb_book_target_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(text="🗺 Інші напрямки", callback_data="cb_trips"),
            InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """
    Клавіатура вибору місця в салоні Opel Vivaro (8 пасажирських місць):
    1-й ряд (поруч із водієм): 2 місця
    2-й ряд: 3 місця
    3-й ряд: 3 місця
    Інтерактивні плашки по порядку.
    Фіксація будь-якого конкретного місця — 5€, без вибору (вільна посадка) — 0€
    """
    keyboard = [
        [
            InlineKeyboardButton(
                text="💺 Місце 1 (поруч з водієм) — 5€", 
                callback_data=f"cb_seat_1_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Місце 2 (водій, вікно) — 5€", 
                callback_data=f"cb_seat_2_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💺 Місце 3 (2-й ряд, вікно) — 5€", 
                callback_data=f"cb_seat_3_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Місце 4 (2-й ряд, центр) — 5€", 
                callback_data=f"cb_seat_4_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Місце 5 (2-й ряд, вікно) — 5€", 
                callback_data=f"cb_seat_5_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="💺 Місце 6 (3-й ряд, вікно) — 5€", 
                callback_data=f"cb_seat_6_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Місце 7 (3-й ряд, центр) — 5€", 
                callback_data=f"cb_seat_7_{trip_id}"
            ),
            InlineKeyboardButton(
                text="💺 Місце 8 (3-й ряд, вікно) — 5€", 
                callback_data=f"cb_seat_8_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(
                text="🎲 Без вибору місця (вільна посадка) — 0€", 
                callback_data=f"cb_seat_none_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(text="💬 Написати менеджеру особисто", url=f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_faq_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура розділу частих запитань"""
    faq_post_url = "https://t.me/c/3876884115/5"
    keyboard = [
        [
            InlineKeyboardButton(text="💳 Коли оплата? (Без передоплати)", callback_data="cb_faq_payment"),
            InlineKeyboardButton(text="⏱ Скільки часу на локаціях?", callback_data="cb_faq_time")
        ],
        [
            InlineKeyboardButton(text="🎯 Розмірений vs темп: як обрати тур?", callback_data="cb_faq_choose"),
            InlineKeyboardButton(text="💺 Схема місць (2+3+3) та регулювання", callback_data="cb_faq_seats")
        ],
        [
            InlineKeyboardButton(text="🚶 Як ми гуляємо на локаціях?", callback_data="cb_faq_walking")
        ],
        [
            InlineKeyboardButton(text="📌 Читати тему FAQ у Telegram", url=faq_post_url)
        ],
        [
            InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_games_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура інтерактивних ігор та вікторин"""
    keyboard = [
        [
            InlineKeyboardButton(text="🕵️ Гра «Гео-Детектив»", callback_data="cb_game_geo")
        ],
        [
            InlineKeyboardButton(text="🧠 Вікторина «Правда чи Неправда»", callback_data="cb_game_quiz")
        ],
        [
            InlineKeyboardButton(text="🎁 Розіграші та вікторини у групі", callback_data="cb_game_group_info")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_cancel_feedback_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для скасування введення відгуку/побажання"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Скасувати введення", callback_data="cb_cancel_feedback")]
        ]
    )
