import logging
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.keyboards.inline import (
        get_main_menu_keyboard,
        get_back_keyboard,
        get_seats_keyboard,
        get_faq_keyboard,
        get_games_keyboard
    )
    from bot_code.config import settings
except ModuleNotFoundError:
    from keyboards.inline import (
        get_main_menu_keyboard,
        get_back_keyboard,
        get_seats_keyboard,
        get_faq_keyboard,
        get_games_keyboard
    )
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="menu_router")

MAIN_MENU_TEXT = (
    "🌟 <b>Добро пожаловать в туристический клуб SVOI!</b> 🌍✨\n\n"
    "Мы организуем душевные и продуманные поездки по самым красивым уголкам Европы "
    "на комфортабельном минивэне Opel Vivaro без стресса, спешки и языковых барьеров!\n\n"
    "✨ <b>Почему выбирают SVOI:</b>\n"
    "• 🚐 <i>Комфорт в дороге:</i> просторный 8-местный минивэн (2 места рядом с водителем, 3 во 2-м и 3 во 3-м ряду)\n"
    "• 💳 <i>Честные условия:</i> работаем <b>без предоплаты</b> на однодневные поездки!\n"
    "• 📍 <i>Удобный старт:</i> отправление из Саарбрюккена + подсадка по пути\n"
    "• 👥 <i>Маленькие душевные группы</i> (до 8 человек)\n\n"
    "👇 <b>Выберите интересующий раздел в меню:</b>"
)

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Обработчик команды /start"""
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "cb_back")
async def process_back_to_menu(callback: CallbackQuery):
    """Возврат в главное меню без дублирования сообщений (через edit_text)"""
    await callback.answer()
    try:
        if callback.message:
            await callback.message.edit_text(
                text=MAIN_MENU_TEXT,
                reply_markup=get_main_menu_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            logger.warning("Ошибка при возврате в меню: %s", e)

@router.callback_query(F.data == "cb_car")
async def process_car_info(callback: CallbackQuery):
    """Информация об автопарке клуба SVOI: минивэн Opel Vivaro"""
    await callback.answer()
    car_text = (
        "🚐 <b>Наш минивэн: Opel Vivaro (8 пассажирских мест)</b> 🚗\n\n"
        "Мы заботимся о том, чтобы дорога была легкой и приятной!\n\n"
        "💺 <b>Схема мест в салоне (всего 8 мест):</b>\n"
        "• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\n"
        "• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\n"
        "• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\n\n"
        "🌟 <b>Оснащение и удобства:</b>\n"
        "• 💺 <b>Удобные регулируемые сиденья:</b> индивидуальные ремни безопасности, комфортный наклон спинки\n"
        "• 📏 <b>Пространство для ног:</b> свободно даже для высоких пассажиров\n"
        "• ❄️🔥 <b>Кондиционер и отопление салона:</b> комфорт в любое время года\n"
        "• ⚡️ <b>Зарядка телефонов:</b> USB-разъемы в салоне для ваших гаджетов\n"
        "• 🧳 <b>Багажное отделение:</b> 10 кг при дальних поездках + ручная кладь в салон\n"
        "• 🧼 <b>Идеальная чистота:</b> влажная уборка перед каждым выездом\n\n"
        "<i>Вы можете зафиксировать конкретное место при бронировании (+5€) или занять свободное при посадке (0€).</i>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=car_text,
                reply_markup=get_back_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_meeting")
async def process_meeting_points(callback: CallbackQuery):
    """Информация о точках сбора и логистике"""
    await callback.answer()
    meeting_text = (
        "📍 <b>Точки сбора пассажиров & Логистика клуба SVOI</b> 🗺\n\n"
        "🏡 <b>Сбор и развоз по адресу (Door-to-Door):</b>\n"
        "• <b>Забираем всех прямо по адресу</b> по земле <b>Саарланд (Saarland)</b>, в <b>Трире (Trier)</b> и <b>Люксембурге (Luxembourg)</b>!\n"
        "• Развозим также обратно по указанному адресу.\n\n"
        "🛣 <b>Сбор в других землях и возможность подсадки:</b>\n"
        "Можем забрать и в других землях — это зависит от маршрута (по пути или нет) или же если не однодневный тур.\n"
        "👉 <b>При наличии от 4-х человек можем забрать с других земель!</b>\n\n"
        "Города и условия подсадки:\n"
        "• <b>Хомбург (Homburg Saar)</b> — уточняйте\n"
        "• <b>Кайзерслаутерн (Kaiserslautern)</b> — возможен если более 4х человек и не однодневный тур\n"
        "• <b>Мангейм / Людвигсхафен (Mannheim)</b> — возможен если более 4х человек и не однодневный тур\n"
        "• <b>Франкфурт-на-Майне (Frankfurt am Main)</b> — возможен если более 4х человек и не однодневный тур\n"
        "• <b>Карлсруэ (Karlsruhe)</b> — для южных направлений по пути\n"
        "• <b>Страсбург (Strasbourg)</b> — по Франции и Швейцарии\n"
        "• <b>Бельгия</b> — при поездках в Нормандию, Голландию и Париж\n\n"
        "💬 <i>Писать менеджеру для уточнения — возможность подсадки уточняйте: @SVOI_travel_admin</i>\n\n"
        "⏰ <b>Точное время подачи трансфера:</b>\n"
        "Точное время, за которым за вами заедут, высылается <b>в личный чат за день вечером перед поездкой</b>.\n\n"
        "👥 <b>Связь с водителем и чат группы:</b>\n"
        "Основные вопросы водителю и по поездке вы сможете задать в новосозданной однодневной группе для коммуникации группы. <b>Через день группа удаляется.</b>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=meeting_text,
                reply_markup=get_back_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass


@router.callback_query(F.data == "cb_terms")
async def process_terms(callback: CallbackQuery):
    """Условия поездок, правила отмены, документы"""
    await callback.answer()
    terms_text = (
        "📜 <b>Условия поездок туристического клуба SVOI</b> 📌\n\n"
        "🛂 <b>Необходимые документы:</b>\n"
        "• Действующий заграничный паспорт\n"
        "• Действующий европейский ВНЖ (Aufenthaltstitel), ПМЖ или шенгенская виза\n"
        "• 🏥 <b>Медицинская страховка:</b> Обязательна медицинская туристическая страховка для людей без ВНЖ в Европе\n\n"
        "🧳 <b>Багаж:</b>\n"
        "• <b>10 кг при дальних поездках</b> в багажный отсек\n"
        "• 1 небольшая <b>ручная кладь</b> с личными вещами в салон авто\n\n"
        "💳 <b>Бронирование и оплата:</b>\n"
        "• 🔥 <b>Бронь у нас БЕЗ ПРЕДОПЛАТЫ!</b> Оплата тура происходит при посадке в день поездки\n"
        "• Предоплата требуется <b>ТОЛЬКО при поездках на несколько дней</b> для бронирования отелей\n\n"
        "🔄 <b>Правила отмены и возврата:</b>\n"
        "• Отмена более чем за 72 часа до выезда — перенос даты или отмена без удержаний\n"
        "• Менее 24 часов — бронь можно передать другу\n\n"
        "🚭 <b>В салоне строго запрещено курение и распитие крепкого алкоголя.</b>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=terms_text,
                reply_markup=get_back_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_partner")
async def process_partner(callback: CallbackQuery):
    """Сотрудничество и партнерская программа"""
    await callback.answer()
    partner_text = (
        "🤝 <b>Партнерская программа & Сотрудничество</b> 💼\n\n"
        "Клуб SVOI открыт для друзей, блогеров, гидов и активных путешественников!\n\n"
        "🌟 <b>Наши форматы сотрудничества:</b>\n"
        "1. <b>Приведи друзей:</b> соберите компанию от 4 человек и получите персональную скидку 10% каждому!\n"
        "2. <b>Индивидуальный чартер:</b> аренда всего минивэна (8 мест) с водителем под ваш маршрут со скидкой 15%.\n"
        "3. <b>Для блогеров и инфлюенсеров:</b> бартерные поездки за честные обзоры и отметки.\n\n"
        f"📩 <i>Свяжитесь напрямую с основателем клуба:</i> @{settings.MANAGER_USERNAME.lstrip('@')}"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=partner_text,
                reply_markup=get_back_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_book")
async def process_book_menu(callback: CallbackQuery):
    """Раздел выбора места в салоне минивэна"""
    await callback.answer()
    seats_info = (
        "💺 <b>Выбор места в минивэне Opel Vivaro (8 мест)</b>\n\n"
        "Схема рассадки пассажиров по порядку:\n"
        "• <b>1-й ряд (рядом с водителем):</b> 2 места\n"
        "• <b>2-й ряд:</b> 3 места (окно / центр / окно)\n"
        "• <b>3-й ряд:</b> 3 места (окно / центр / окно)\n\n"
        "💵 <b>Тариф:</b>\n"
        "• Фиксация конкретного места по порядку: <b>+5€</b>\n"
        "• Без выбора места (свободная посадка): <b>0€</b>\n\n"
        "👇 <i>Выберите желаемое место:</i>"
    )
    
    try:
        if callback.message:
            await callback.message.edit_text(
                text=seats_info,
                reply_markup=get_seats_keyboard("general"),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_faq")
async def process_faq_menu(callback: CallbackQuery):
    """Раздел частых вопросов FAQ"""
    await callback.answer()
    faq_text = (
        "❓ <b>Частые вопросы о поездках клуба SVOI (FAQ)</b> 💡\n\n"
        "Собрали для вас подробные ответы на главные вопросы:\n\n"
        "• 💳 Оплата: <b>работаем без предоплаты на однодневные поездки</b>!\n"
        "• ⏱ Маршруты и тайминг: примеры комбинированных туров\n"
        "• 🎯 Как выбрать тур: размеренные прогулки vs. активный темп\n"
        "• 💺 Салон Opel Vivaro: 8 мест (2 спереди, 3 во 2-м и 3 во 3-м ряду)\n\n"
        "👇 <i>Нажмите интересующий вопрос:</i>"
    )
    try:
        if callback.message:
            await callback.message.edit_text(
                text=faq_text,
                reply_markup=get_faq_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_faq_payment")
async def process_faq_payment(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💳 <b>Когда и как оплата поездки?</b>\n\n"
        "🔥 <b>Мы работаем БЕЗ ПРЕДОПЛАТЫ на все однодневные поездки!</b>\n\n"
        "• <b>Однодневные туры:</b> Вы просто бронируете место, а оплачиваете поездку непосредственно при посадке в минивэн!\n"
        "• <b>Многодневные поездки (2–3 дня):</b> Предоплата требуется <b>ТОЛЬКО для многодневных туров</b> (для бронирования номеров в отелях).\n"
        "• <b>Способы оплаты:</b> Наличные при посадке (в евро), банковский перевод SEPA / IBAN (Германия/ЕС), PayPal.\n"
        "• <b>Отмена:</b> При предупреждении за 72+ часа — перенос или отмена без удержаний."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    await callback.answer()
    text = (
        "⏱ <b>Сколько времени на локациях?</b>\n\n"
        "Мы рассчитываем маршрут так, чтобы не было ощущения суеты:\n\n"
        "• <b>Однодневные туры (Париж, Амстердам, Брюгге):</b> от 5 до 8 часов чистого времени в городе!\n\n"
        "• <b>Комбинированные маршруты:</b>\n"
        "  — 🌊 <b>Этрета + Париж:</b> к примеру, <b>5 часов на скалах Этрета</b> и океане + <b>2–3 часа</b> в вечернем Париже!\n"
        "  — 🇨🇭 <b>Швейцария комбо:</b> <b>3 часа Лаутербруннен</b> (долина 72 водопадов), <b>2 часа ущелье Ааре</b>, <b>2 часа Берн</b>!\n\n"
        "• <b>Туры на выходные (2–3 дня):</b> размеренная программа с ночевкой в комфортабельном отеле."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🎯 <b>Как выбрать тур новичку?</b>\n\n"
        "🌿 <b>Размеренные туры (для спокойных прогулок и релакса):</b>\n"
        "• <b>Брюгге (110€)</b> — каналы, лебеди, шоколад, уютные террасы\n"
        "• <b>Эльзас + Страсбург (80€)</b> — пряничные фахверковые улочки\n"
        "• <b>Замок Нойшванштайн (120€)</b> — прогулка к озеру Альпзее и замку\n"
        "• <b>Лазурный берег (3 дня, 440€)</b> — курортный отдых у моря с отелем\n\n"
        "⚡️ <b>Туры в темпе (активно, «галопом по Европам»):</b>\n"
        "• <b>Лихтенштейн (3 страны за 1 день, 120€)</b> — Лихтенштейн + Австрия + Швейцария\n"
        "• <b>Этрета + Париж (140€)</b> — 5 ч скалы Нормандии + 2–3 ч Париж\n"
        "• <b>Швейцария комбо (120€)</b> — 3 ч Лаутербруннен + 2 ч ущелье Ааре + 2 ч Берн\n"
        "• <b>Париж или Амстердам (120€)</b> — максимум впечатлений за 1 день\n\n"
        f"Напишите менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} — мы поможем подобрать тур!"
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💺 <b>Как расположены и регулируются сидения?</b>\n\n"
        "В нашем 8-местном минивэне Opel Vivaro сиденья расположены по схеме 2+3+3:\n\n"
        "• <b>1-й ряд (рядом с водителем):</b> 2 места (Место 1 — центр, Место 2 — панорамное окно)\n"
        "• <b>2-й ряд:</b> 3 места (Место 3 — окно, Место 4 — центр, Место 5 — окно)\n"
        "• <b>3-й ряд:</b> 3 места (Место 6 — окно, Место 7 — центр, Место 8 — окно)\n\n"
        "🛋 <b>Комфорт:</b> Регулируемый наклон спинки для сна, USB-зарядки для смартфонов, кондиционер.\n"
        "💵 <b>Выбор места:</b> Фиксация конкретного места по порядку — <b>5€</b>. Без выбора (свободная посадка) — <b>0€</b>."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🚶 <b>Как мы гуляем по локациям?</b>\n\n"
        "1. <b>Вводная прогулка:</b> По прибытии мы вместе знакомимся с ключевыми достопримечательностями и видовыми точками.\n\n"
        "2. <b>Свободное время:</b> Вы не привязаны к группе с флажком! Гуляйте в своем темпе, посещайте музеи, сидите в уютных кафе или устраивайте шопинг.\n\n"
        "3. <b>Поддержка:</b> Организатор всегда на связи в чате поездки и делится точными локациями лучших заведений."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_games")
async def process_games_menu(callback: CallbackQuery):
    """Раздел игр и геймификации"""
    await callback.answer()
    games_text = (
        "🎮 <b>Игры и викторины клуба SVOI</b> 🏆\n\n"
        "Участвуйте в играх, выигрывайте бонусы и Карту Приоритета (+5€ к бесплатному выбору места)!\n\n"
        "👇 <i>Выберите активность:</i>"
    )
    await callback.message.edit_text(text=games_text, reply_markup=get_games_keyboard(), parse_mode="HTML")
