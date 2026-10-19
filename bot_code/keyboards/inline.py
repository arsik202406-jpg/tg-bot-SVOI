from aiogram.types import InlineKeyboardMarkup, InlineKeyboardButton, WebAppInfo
try:
    from bot_code.data.trips import TRIPS_CATALOG, get_free_seats
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import TRIPS_CATALOG, get_free_seats
    from config import settings

def get_main_menu_keyboard(user_id: int | None = None) -> InlineKeyboardMarkup:
    """
    Головне меню бота SVOI Travel.
    Чітке, не перевантажене. Всі другорядні плашки (умови, точки збору) сховані в FAQ.
    Керування каналом відображається ТІЛЬКИ для адміністратора.
    """
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"
    is_admin = (user_id is not None) and (user_id == settings.ADMIN_ID)

    keyboard = [
        [
            InlineKeyboardButton(text="💺 ЗАБРОНЮВАТИ МІСЦЕ", callback_data="cb_book")
        ],
        [
            InlineKeyboardButton(text="🗺 Напрямки та дати", callback_data="cb_trips"),
            InlineKeyboardButton(text="⭐ Відгуки туристів", callback_data="cb_reviews")
        ],
        [
            InlineKeyboardButton(text="❓ Часті питання (FAQ)", callback_data="cb_faq"),
            InlineKeyboardButton(text="🤝 Стати партнером клубу", callback_data="cb_partner")
        ],
        [
            InlineKeyboardButton(text="🎮 Ігри та вікторини", callback_data="cb_games"),
            InlineKeyboardButton(text="📢 Наш канал", url=settings.CHANNEL_URL)
        ],
        [
            InlineKeyboardButton(text="💬 ЗВ'ЯЗОК З МЕНЕДЖЕРОМ", url=manager_url)
        ]
    ]

    # Тільки для адміністратора
    if is_admin:
        keyboard.append([
            InlineKeyboardButton(text="👑 Керування каналом (/channel)", callback_data="cb_adm_channel_menu"),
            InlineKeyboardButton(text="📋 Лист очікування", callback_data="cb_adm_waitlist")
        ])

    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_back_keyboard() -> InlineKeyboardMarkup:
    """Кнопка повернення до головного меню"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """
    Список напрямків з лаконічними підписами та номерами спочатку.
    Текст НІКОЛИ не обрізається на смартфонах!
    """
    buttons = []
    for idx, (trip_id, trip) in enumerate(TRIPS_CATALOG.items(), start=1):
        free_seats = get_free_seats(trip_id)
        seats_label = f"{free_seats} м." if free_seats > 0 else "Аншлаг"
        # Коротке ім'я міста без зайвих дужок
        title = trip.get('destination') or trip.get('short_title', trip.get('title', ''))
        if "(" in title:
            title = title.split("(")[0].strip()
        text = f"{idx}. {title} — {trip['price']}€ [{seats_label}]"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    
    buttons.append([InlineKeyboardButton(text="🔙 Назад до меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str, is_admin: bool = False) -> InlineKeyboardMarkup:
    """Картка туру з лаконічними кнопками бронювання, листа очікування та адмін-лічильника"""
    free_seats = get_free_seats(trip_id)
    keyboard = []

    if free_seats > 0:
        keyboard.append([
            InlineKeyboardButton(
                text=f"💺 Забронювати ({free_seats} вільних місць)", 
                callback_data=f"cb_book_target_{trip_id}"
            )
        ])
    else:
        keyboard.append([
            InlineKeyboardButton(
                text="📋 Лист очікування (місць немає)", 
                callback_data=f"cb_waitlist_add_{trip_id}"
            )
        ])

    keyboard.append([
        InlineKeyboardButton(text="📋 Лист очікування", callback_data=f"cb_waitlist_add_{trip_id}"),
        InlineKeyboardButton(text="🚐 5-8 осіб", callback_data="cb_custom_trip")
    ])

    if is_admin:
        keyboard.append([
            InlineKeyboardButton(
                text=f"⚙️ Змінити місця ({free_seats}/8) [Адмін]", 
                callback_data=f"cb_adm_seats_{trip_id}"
            )
        ])

    keyboard.append([
        InlineKeyboardButton(text="🗺 Інші тури", callback_data="cb_trips"),
        InlineKeyboardButton(text="🔙 Меню", callback_data="cb_back")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """
    Клавіатура вибору місця в салоні Opel Vivaro.
    НОМЕРИ СПОЧАТКУ, короткі назви, щоб текст НІКОЛИ не обрізався на смартфонах!
    """
    keyboard = [
        # 1-й ряд (біля водія)
        [
            InlineKeyboardButton(text="1️⃣ Водій (+5€)", callback_data=f"cb_seat_1_{trip_id}"),
            InlineKeyboardButton(text="2️⃣ Вікно (+5€)", callback_data=f"cb_seat_2_{trip_id}")
        ],
        # 2-й ряд
        [
            InlineKeyboardButton(text="3️⃣ Ліве (+5€)", callback_data=f"cb_seat_3_{trip_id}"),
            InlineKeyboardButton(text="4️⃣ Центр (+5€)", callback_data=f"cb_seat_4_{trip_id}"),
            InlineKeyboardButton(text="5️⃣ Праве (+5€)", callback_data=f"cb_seat_5_{trip_id}")
        ],
        # 3-й ряд
        [
            InlineKeyboardButton(text="6️⃣ Ліве (+5€)", callback_data=f"cb_seat_6_{trip_id}"),
            InlineKeyboardButton(text="7️⃣ Центр (0€)", callback_data=f"cb_seat_7_{trip_id}"),
            InlineKeyboardButton(text="8️⃣ Праве (+5€)", callback_data=f"cb_seat_8_{trip_id}")
        ],
        # Вільна посадка
        [
            InlineKeyboardButton(text="🎲 Вільна посадка (0€)", callback_data=f"cb_seat_none_{trip_id}")
        ],
        [
            InlineKeyboardButton(text="💬 Написати менеджеру", url=f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}"),
            InlineKeyboardButton(text="🔙 Назад", callback_data=f"cb_trip_{trip_id}" if trip_id != "general" else "cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_admin_seats_edit_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """Клавіатура для швидкого налаштування вільних місць адміністратором (від 0 до 8)"""
    row1 = [InlineKeyboardButton(text=f"{i}", callback_data=f"cb_set_seats_{trip_id}_{i}") for i in range(0, 5)]
    row2 = [InlineKeyboardButton(text=f"{i}", callback_data=f"cb_set_seats_{trip_id}_{i}") for i in range(5, 9)]
    return InlineKeyboardMarkup(
        inline_keyboard=[
            row1,
            row2,
            [InlineKeyboardButton(text="🔙 Повернутися до туру", callback_data=f"cb_trip_{trip_id}")]
        ]
    )

def get_faq_keyboard() -> InlineKeyboardMarkup:
    """
    Згрупований та структурований розділ FAQ та інформації:
    Сюди перенесено точки збору, умови, опис буса, ігри та партнерство.
    """
    keyboard = [
        [
            InlineKeyboardButton(text="📍 Точки збору (Door-to-Door)", callback_data="cb_meeting"),
            InlineKeyboardButton(text="📜 Умови поїздок & 0% передоплати", callback_data="cb_terms")
        ],
        [
            InlineKeyboardButton(text="🚐 Фото та комфорт Opel Vivaro", callback_data="cb_car"),
            InlineKeyboardButton(text="🤝 Стати партнером клубу", callback_data="cb_partner")
        ],
        [
            InlineKeyboardButton(text="⏱ Скільки часу на локаціях?", callback_data="cb_faq_time"),
            InlineKeyboardButton(text="🚶 Як гуляємо на екскурсіях?", callback_data="cb_faq_walking")
        ],
        [
            InlineKeyboardButton(text="🎮 Ігри та гео-вікторини", callback_data="cb_games"),
            InlineKeyboardButton(text="✍️ Залишити побажання", callback_data="cb_feedback")
        ],
        [
            InlineKeyboardButton(text="🔙 Повернутися в головне меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_reviews_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для розділу відгуків"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✍️ Залишити свій відгук", callback_data="cb_feedback")],
            [InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
        ]
    )

def get_custom_trip_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для індивідуального виїзду (5-8 осіб)"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text=Доброго+дня!+Цікавить+індивідуальний+виїзд+для+нашої+компанії"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Обговорити індивідуальний виїзд", url=manager_url)],
            [InlineKeyboardButton(text="🗺 Обрати тур з розкладу", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Головне меню", callback_data="cb_back")]
        ]
    )

def get_games_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура інтерактивних ігор та вікторин (розширена колекція)"""
    keyboard = [
        [
            InlineKeyboardButton(text="🕵️ Гра «Гео-Детектив»", callback_data="cb_game_geo"),
            InlineKeyboardButton(text="🧠 «Правда чи Неправда»", callback_data="cb_game_quiz")
        ],
        [
            InlineKeyboardButton(text="🍽 Гастро-Квіз «Смаки Європи»", callback_data="cb_game_gastro"),
            InlineKeyboardButton(text="💶 Інтуїція: Цифри та рекорди", callback_data="cb_game_price")
        ],
        [
            InlineKeyboardButton(text="🎒 Тест: Підбір ідеального туру", callback_data="cb_game_match"),
            InlineKeyboardButton(text="🎰 Колесо Фортуни SVOI", callback_data="cb_game_wheel")
        ],
        [
            InlineKeyboardButton(text="🎁 Розіграші квитків у каналі/групі", callback_data="cb_game_group_info")
        ],
        [
            InlineKeyboardButton(text="🔙 Назад до FAQ", callback_data="cb_faq"),
            InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")
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
