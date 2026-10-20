from aiogram.types import (
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    ReplyKeyboardMarkup,
    KeyboardButton
)
try:
    from bot_code.data.trips import TRIPS_CATALOG, get_free_seats, get_trip_date
    from bot_code.config import settings
except ModuleNotFoundError:
    from data.trips import TRIPS_CATALOG, get_free_seats, get_trip_date
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
    """Кнопка повернення до головного меню (обов'язкова в кожному підменю)"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )

def get_trips_keyboard() -> InlineKeyboardMarkup:
    """
    Список напрямків з прапором, датою, ціною та вільними місцями.
    """
    buttons = []
    for idx, (trip_id, trip) in enumerate(TRIPS_CATALOG.items(), start=1):
        free_seats = get_free_seats(trip_id)
        seats_label = f"{free_seats}/8 м." if free_seats > 0 else "Аншлаг"
        flag = trip.get("flag", "🇪🇺")
        date_str = get_trip_date(trip_id)
        title = trip.get("short_title", trip.get("title", ""))
        if "(" in title:
            title = title.split("(")[0].strip()
        text = f"{flag} {title} | {date_str} • {trip['price']}€ [{seats_label}]"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_trip_{trip_id}")])
    
    buttons.append([InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_booking_trips_keyboard() -> InlineKeyboardMarkup:
    """
    Крок 1 бронювання: Спочатку обов'язковий вибір туру зі списку напрямків,
    після чого відкривається вибір конкретного місця в салоні.
    """
    buttons = []
    for trip_id, trip in TRIPS_CATALOG.items():
        free_seats = get_free_seats(trip_id)
        seats_label = f"🔥 {free_seats}/8" if free_seats > 0 else "🔴 0/8"
        flag = trip.get("flag", "🇪🇺")
        date_str = get_trip_date(trip_id)
        title = trip.get("short_title", trip.get("title", ""))
        if "(" in title:
            title = title.split("(")[0].strip()
        text = f"{flag} {title} | {date_str} • {trip['price']}€ ({seats_label})"
        buttons.append([InlineKeyboardButton(text=text, callback_data=f"cb_book_target_{trip_id}")])

    buttons.append([InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")])
    return InlineKeyboardMarkup(inline_keyboard=buttons)

def get_trip_detail_keyboard(trip_id: str, is_admin: bool = False) -> InlineKeyboardMarkup:
    """
    Картка туру з кнопками:
    - Забронювати місце (перехід до вибору місця для цього туру)
    - Лист очікування / Індивідуальний виїзд
    - Адмін-кнопки: зміна місць, зміна дати поїздки, зміна постера (фото)
    - Повернення в меню
    """
    free_seats = get_free_seats(trip_id)
    keyboard = []

    if free_seats > 0:
        keyboard.append([
            InlineKeyboardButton(
                text=f"💺 Обрати місце та забронювати ({free_seats} з 8 вільних)", 
                callback_data=f"cb_book_target_{trip_id}"
            )
        ])
    else:
        keyboard.append([
            InlineKeyboardButton(
                text="📋 Записатися в лист очікування (місць немає)", 
                callback_data=f"cb_waitlist_add_{trip_id}"
            )
        ])

    keyboard.append([
        InlineKeyboardButton(text="📋 Лист очікування", callback_data=f"cb_waitlist_add_{trip_id}"),
        InlineKeyboardButton(text="🚐 Своя компанія (5-8 ос.)", callback_data="cb_custom_trip")
    ])

    # Блок управління для адміністратора: місця, дата, постер
    if is_admin:
        keyboard.append([
            InlineKeyboardButton(
                text=f"⚙️ Місця ({free_seats}/8) [Адмін]", 
                callback_data=f"cb_adm_seats_{trip_id}"
            ),
            InlineKeyboardButton(
                text="📅 Змінити дату [Адмін]", 
                callback_data=f"cb_adm_date_{trip_id}"
            )
        ])
        keyboard.append([
            InlineKeyboardButton(
                text="🖼 Змінити постер (фото) [Адмін]", 
                callback_data=f"cb_adm_poster_{trip_id}"
            )
        ])

    keyboard.append([
        InlineKeyboardButton(text="🗺 Інші напрямки", callback_data="cb_trips"),
        InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
    ])
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_pax_keyboard(trip_id: str) -> InlineKeyboardMarkup:
    """
    Альтернативний вибір кількості осіб [ 1 ], [ 2 ], [ 3+ ] або перехід до схеми місць.
    """
    return get_seats_keyboard(trip_id)

def get_contact_share_reply_keyboard() -> ReplyKeyboardMarkup:
    """
    Крок 3 воронки бронювання:
    Спеціальна кнопка Telegram 📱 Поділитися номером (request_contact=True)
    """
    return ReplyKeyboardMarkup(
        keyboard=[
            [KeyboardButton(text="📱 Поділитися номером", request_contact=True)]
        ],
        resize_keyboard=True,
        one_time_keyboard=True,
        input_field_placeholder="Натисніть кнопку нижче, щоб поділитися номером..."
    )

def get_contact_step_inline_keyboard(trip_id: str, seat_or_pax_label: str, username: str | None = None) -> InlineKeyboardMarkup:
    """
    Інлайн-кнопки на Кроці 3: дозволяє підтвердити бронь взагалі без вводу цифр,
    якщо у користувача є @username у профілі, або натиснути нижню кнопку 📱 Поділитися номером.
    """
    user_tag = f"@{username.lstrip('@')}" if username else "профіль Telegram"
    keyboard = [
        [
            InlineKeyboardButton(
                text=f"✅ Підтвердити заявку ({user_tag})",
                callback_data=f"cb_fast_confirm_{seat_or_pax_label}_{trip_id}"
            )
        ],
        [
            InlineKeyboardButton(text="🔙 Змінити місце в салоні", callback_data=f"cb_book_target_{trip_id}"),
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_seats_keyboard(trip_id: str = "general") -> InlineKeyboardMarkup:
    """
    Крок 2 воронки бронювання (після вибору туру):
    Клавіатура вибору конкретного місця в салоні Opel Vivaro для обраного туру.
    Місце 1 — +5€ (Панорамне), Місце 2 — +5€ (Вікно).
    """
    keyboard = [
        # 1-й ряд (біля водія)
        [
            InlineKeyboardButton(text="💺 1: Панорамне (+5€)", callback_data=f"cb_seat_1_{trip_id}"),
            InlineKeyboardButton(text="💺 2: Вікно (+5€)", callback_data=f"cb_seat_2_{trip_id}")
        ],
        # 2-й ряд
        [
            InlineKeyboardButton(text="💺 3: Ліве (+5€)", callback_data=f"cb_seat_3_{trip_id}"),
            InlineKeyboardButton(text="💺 4: Центр (+5€)", callback_data=f"cb_seat_4_{trip_id}"),
            InlineKeyboardButton(text="💺 5: Праве (+5€)", callback_data=f"cb_seat_5_{trip_id}")
        ],
        # 3-й ряд
        [
            InlineKeyboardButton(text="💺 6: Ліве (+5€)", callback_data=f"cb_seat_6_{trip_id}"),
            InlineKeyboardButton(text="💺 7: Центр (0€)", callback_data=f"cb_seat_7_{trip_id}"),
            InlineKeyboardButton(text="💺 8: Праве (+5€)", callback_data=f"cb_seat_8_{trip_id}")
        ],
        # Вільна посадка або кілька місць
        [
            InlineKeyboardButton(text="🎲 Без вибору місця (вільна посадка) — 0€", callback_data=f"cb_seat_none_{trip_id}")
        ],
        [
            InlineKeyboardButton(text="[ 👥 2 місця поруч ]", callback_data=f"cb_pax_2_{trip_id}"),
            InlineKeyboardButton(text="[ 👨‍👩‍👧 3+ місць ]", callback_data=f"cb_pax_3_{trip_id}")
        ],
        [
            InlineKeyboardButton(text="🗺 Змінити тур", callback_data="cb_book"),
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
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
            [
                InlineKeyboardButton(text="🔙 До картки туру", callback_data=f"cb_trip_{trip_id}"),
                InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
            ]
        ]
    )

def get_faq_keyboard() -> InlineKeyboardMarkup:
    """
    Згрупований та структурований розділ FAQ та інформації.
    Обов'язково має кнопку 🔙 Назад в меню.
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
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_reviews_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для розділу відгуків"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="✍️ Залишити свій відгук", callback_data="cb_feedback")],
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )

def get_custom_trip_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для індивідуального виїзду (5-8 осіб)"""
    manager_url = f"https://t.me/{settings.MANAGER_USERNAME.lstrip('@')}?text=Доброго+дня!+Цікавить+індивідуальний+виїзд+для+нашої+компанії"
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Обговорити індивідуальний виїзд", url=manager_url)],
            [InlineKeyboardButton(text="🗺 Обрати тур з розкладу", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
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
            InlineKeyboardButton(text="🔙 До FAQ", callback_data="cb_faq"),
            InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")
        ]
    ]
    return InlineKeyboardMarkup(inline_keyboard=keyboard)

def get_cancel_feedback_keyboard() -> InlineKeyboardMarkup:
    """Клавіатура для скасування введення відгуку/побажання"""
    return InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="❌ Скасувати введення", callback_data="cb_cancel_feedback")],
            [InlineKeyboardButton(text="🔙 Назад в меню", callback_data="cb_back")]
        ]
    )
