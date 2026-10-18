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
    "🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n"
    "Ми організовуємо душевні та продумані поїздки найкрасивішими куточками Європи "
    "на комфортабельному мінівені Opel Vivaro без стресу, поспіху та мовних бар'єрів!\n\n"
    "✨ <b>Чому обирають SVOI:</b>\n"
    "• 🚐 <i>Комфорт у дорозі:</i> просторий 8-місний мінівен (2 місця поруч з водієм, 3 у 2-му та 3 у 3-му ряду)\n"
    "• 💳 <i>Чесні умови:</i> працюємо <b>без передоплати</b> на одноденні поїздки!\n"
    "• 📍 <i>Зручний старт:</i> відправлення із Саарбрюккена + підсадка за маршрутом\n"
    "• 👥 <i>Маленькі душевні групи</i> (до 8 осіб)\n\n"
    "👇 <b>Оберіть потрібний розділ у меню:</b>"
)

@router.message(CommandStart())
async def cmd_start(message: Message):
    """Обробник команди /start"""
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "cb_back")
async def process_back_to_menu(callback: CallbackQuery):
    """Повернення до головного меню без дублювання повідомлень (через edit_text)"""
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
            logger.warning("Помилка при поверненні в меню: %s", e)

@router.callback_query(F.data == "cb_car")
async def process_car_info(callback: CallbackQuery):
    """Інформація про автопарк клубу SVOI: мінівен Opel Vivaro"""
    await callback.answer()
    car_text = (
        "🚐 <b>Наш мінівен: Opel Vivaro (8 пасажирських місць)</b> 🚗\n\n"
        "Ми дбаємо про те, щоб дорога була легкою та приємною!\n\n"
        "💺 <b>Схема місць у салоні (всього 8 місць):</b>\n"
        "• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\n"
        "• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\n"
        "• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\n\n"
        "🌟 <b>Оснащення та зручності:</b>\n"
        "• 💺 <b>Зручні регульовані сидіння:</b> індивідуальні ремені безпеки, комфортний нахил спинки для відпочинку\n"
        "• 📏 <b>Простір для ніг:</b> вільно навіть для високих пасажирів\n"
        "• ❄️🔥 <b>Кондиціонер та опалення салону:</b> комфорт у будь-яку пору року\n"
        "• ⚡️ <b>Зарядка телефонів:</b> USB-роз'єми в салоні для ваших гаджетів\n"
        "• 🧳 <b>Багажне відділення:</b> 10 кг при далеких поїздках + ручна поклажа в салон\n"
        "• 🧼 <b>Ідеальна чистота:</b> вологе прибирання перед кожним виїздом\n\n"
        "<i>Ви можете зафіксувати конкретне місце під час бронювання (+5€) або зайняти вільне при посадці (0€).</i>"
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
    """Інформація про точки збору та логістику"""
    await callback.answer()
    meeting_text = (
        "📍 <b>Точки збору пасажирів & Логістика клубу SVOI</b> 🗺\n\n"
        "🏡 <b>Збір та розвезення за адресою (Door-to-Door):</b>\n"
        "• <b>Забираємо всіх прямо за адресою</b> по землі <b>Саарланд (Saarland)</b>, у <b>Трірі (Trier)</b> та <b>Люксембурзі (Luxembourg)</b>!\n"
        "• Розвеземо також назад за вказаною адресою.\n\n"
        "🛣 <b>Збір в інших землях та можливість підсадки:</b>\n"
        "Можемо забрати й в інших землях — це залежить від маршруту (по дорозі чи ні) або якщо це багатоденний тур.\n"
        "👉 <b>За наявності від 4-х осіб можемо забрати з інших земель!</b>\n\n"
        "Міста та умови підсадки:\n"
        "• <b>Хомбург (Homburg Saar)</b> — уточнюйте\n"
        "• <b>Кайзерслаутерн (Kaiserslautern)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n"
        "• <b>Мангейм / Людвігсхафен (Mannheim)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n"
        "• <b>Франкфурт-на-Майні (Frankfurt am Main)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n"
        "• <b>Карлсруе (Karlsruhe)</b> — для південних напрямків по дорозі\n"
        "• <b>Страсбург (Strasbourg)</b> — по Франції та Швейцарії\n"
        "• <b>Бельгія</b> — при поїздках до Нормандії, Голландії та Парижа\n\n"
        "💬 <i>Напишіть менеджеру для уточнення — можливість підсадки уточнюйте: @SVOI_travel_admin</i>\n\n"
        "⏰ <b>Точний час подачі трансферу:</b>\n"
        "Точний час, о котрій за вами заїдуть, надсилається <b>в особистий чат за день увечері перед поїздкою</b>.\n\n"
        "👥 <b>Зв'язок з водієм та чат групи:</b>\n"
        "Основні питання водієві та щодо поїздки ви зможете поставити у новоствореній одноденній групі для комунікації. <b>Через день група видаляється.</b>"
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
    """Умови поїздок, правила скасування, документи"""
    await callback.answer()
    terms_text = (
        "📜 <b>Умови поїздок туристичного клубу SVOI</b> 📌\n\n"
        "🛂 <b>Необхідні документи:</b>\n"
        "• Дійсний закордонний паспорт\n"
        "• Дійсний європейський ВНЖ (Aufenthaltstitel), ПМЖ або шенгенська віза\n"
        "• 🏥 <b>Медична страховка:</b> Обов'язкова медична туристична страховка для людей без ВНЖ в Європі\n\n"
        "🧳 <b>Багаж:</b>\n"
        "• <b>10 кг при далеких поїздках</b> у багажний відсік\n"
        "• 1 невелика <b>ручна поклажа</b> з особистими речами в салон авто\n\n"
        "💳 <b>Бронювання та оплата:</b>\n"
        "• 🔥 <b>Бронь у нас БЕЗ ПЕРЕДОПЛАТИ!</b> Оплата туру відбувається при посадці в день поїздки\n"
        "• Передоплата потрібна <b>ТІЛЬКИ при поїздках на кілька днів</b> для бронювання номерів у готелях\n\n"
        "🔄 <b>Правила скасування та повернення:</b>\n"
        "• Скасування більш ніж за 72 години до виїзду — перенесення дати або скасування без утримань\n"
        "• Менше 24 годин — бронь можна передати другу\n\n"
        "🚭 <b>У салоні суворо заборонено куріння та вживання міцного алкоголю.</b>"
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
    """Співпраця та партнерська програма"""
    await callback.answer()
    partner_text = (
        "🤝 <b>Партнерська програма & Співпраця</b> 💼\n\n"
        "Клуб SVOI відкритий для друзів, блогерів, гідів та активних мандрівників!\n\n"
        "🌟 <b>Наші формати співпраці:</b>\n"
        "1. <b>Приведи друзів:</b> зберіть компанію від 4 осіб та отримайте персональну знижку 10% кожному!\n"
        "2. <b>Індивідуальний чартер:</b> оренда всього мінівена (8 місць) з водієм під ваш маршрут зі знижкою 15%.\n"
        "3. <b>Для блогерів та інфлюенсерів:</b> бартерні поїздки за чесні огляди та відмітки.\n\n"
        f"📩 <i>Зв'яжіться напряму із засновником клубу:</i> @{settings.MANAGER_USERNAME.lstrip('@')}"
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
    """Розділ вибору місця в салоні мінівена"""
    await callback.answer()
    seats_info = (
        "💺 <b>Вибір місця в мінівені Opel Vivaro (8 місць)</b>\n\n"
        "Схема розсадки пасажирів по порядку:\n"
        "• <b>1-й ряд (поруч із водієм):</b> 2 місця\n"
        "• <b>2-й ряд:</b> 3 місця (вікно / центр / вікно)\n"
        "• <b>3-й ряд:</b> 3 місця (вікно / центр / вікно)\n\n"
        "💵 <b>Тариф:</b>\n"
        "• Фіксація конкретного місця по порядку: <b>+5€</b>\n"
        "• Без вибору місця (вільна посадка): <b>0€</b>\n\n"
        "👇 <i>Оберіть бажане місце:</i>"
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
    """Розділ частих запитань FAQ"""
    await callback.answer()
    faq_text = (
        "❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\n\n"
        "Зібрали для вас детальні відповіді на головні питання:\n\n"
        "• 💳 Оплата: <b>працюємо без передоплати на одноденні поїздки</b>!\n"
        "• ⏱ Маршрути та таймінг: приклади комбінованих турів\n"
        "• 🎯 Як обрати тур: розмірені прогулянки vs. активний темп\n"
        "• 💺 Салон Opel Vivaro: 8 місць (2 спереду, 3 у 2-му та 3 у 3-му ряду)\n\n"
        "👇 <i>Натисніть на запитання, яке вас цікавить:</i>"
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
        "💳 <b>Коли та як відбувається оплата поїздки?</b>\n\n"
        "🔥 <b>Ми працюємо БЕЗ ПЕРЕДОПЛАТИ на всі одноденні поїздки!</b>\n\n"
        "• <b>Одноденні тури:</b> Ви просто бронюєте місце, а оплачуєте поїздку безпосередньо при посадці в мінівен!\n"
        "• <b>Багатоденні поїздки (2–3 дні):</b> Передоплата потрібна <b>ТІЛЬКИ для багатоденних турів</b> (для бронювання номерів у готелях).\n"
        "• <b>Способи оплати:</b> Готівка при посадці (в євро), банківський переказ SEPA / IBAN (Німеччина/ЄС), PayPal.\n"
        "• <b>Скасування:</b> При попередженні за 72+ години — перенесення або скасування без утримань."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    await callback.answer()
    text = (
        "⏱ <b>Скільки часу на локаціях?</b>\n\n"
        "Ми розраховуємо маршрут так, щоб не було відчуття поспіху:\n\n"
        "• <b>Одноденні тури (Париж, Амстердам, Брюгге):</b> від 5 до 8 годин чистого часу в місті!\n\n"
        "• <b>Комбіновані маршрути:</b>\n"
        "  — 🌊 <b>Етрета + Париж:</b> наприклад, <b>5 годин на скелях Етрета</b> та океані + <b>2–3 години</b> у вечірньому Парижі!\n"
        "  — 🇨🇭 <b>Швейцарія комбо:</b> <b>3 години Лаутербруннен</b> (долина 72 водоспадів), <b>2 години ущелина Ааре</b>, <b>2 години Берн</b>!\n\n"
        "• <b>Тури на вихідні (2–3 дні):</b> розмірена програма з ночівлею в комфортабельному готелі."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🎯 <b>Як обрати тур новачку?</b>\n\n"
        "🌿 <b>Розмірені тури (для спокійних прогулянок та релаксу):</b>\n"
        "• <b>Брюгге (110€)</b> — канали, лебеді, шоколад, затишні тераси\n"
        "• <b>Ельзас + Страсбург (80€)</b> — пряникові фахверкові вулички\n"
        "• <b>Замок Нойшванштайн (120€)</b> — прогулянка до озера Альпзее та замку\n"
        "• <b>Лазурове узбережжя (3 дні, 440€)</b> — курортний відпочинок біля моря з готелем\n\n"
        "⚡️ <b>Тури в темпі (активно, «галопом по Європах»):</b>\n"
        "• <b>Ліхтенштейн (3 країни за 1 день, 120€)</b> — Ліхтенштейн + Австрія + Швейцарія\n"
        "• <b>Етрета + Париж (140€)</b> — 5 год скелі Нормандії + 2–3 год Париж\n"
        "• <b>Швейцарія комбо (120€)</b> — 3 год Лаутербруннен + 2 год ущелина Ааре + 2 год Берн\n"
        "• <b>Париж чи Амстердам (120€)</b> — максимум вражень за 1 день\n\n"
        f"Напишіть менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} — ми з радістю допоможемо підібрати тур!"
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💺 <b>Як розташовані та регулюються сидіння?</b>\n\n"
        "У нашому 8-місному мінівені Opel Vivaro сидіння розташовані за схемою 2+3+3:\n\n"
        "• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\n"
        "• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\n"
        "• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\n\n"
        "🛋 <b>Комфорт:</b> Регульований нахил спинки для сну, USB-зарядки для смартфонів, кондиціонер.\n"
        "💵 <b>Вибір місця:</b> Фіксація конкретного місця по порядку — <b>5€</b>. Без вибору (вільна посадка) — <b>0€</b>."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🚶 <b>Як ми гуляємо на локаціях?</b>\n\n"
        "1. <b>Вступна прогулянка:</b> Після прибуття ми разом знайомимося з ключовими визначними пам'ятками та видовими точками.\n\n"
        "2. <b>Вільний час:</b> Ви не прив'язані до групи з прапорцем! Гуляйте у своєму темпі, відвідуйте музеї, відпочивайте в затишних кафе або влаштовуйте шопінг.\n\n"
        "3. <b>Підтримка:</b> Організатор завжди на зв'язку в чаті поїздки та ділиться точними локаціями найкращих закладів."
    )
    await callback.message.edit_text(text=text, reply_markup=get_faq_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_games")
async def process_games_menu(callback: CallbackQuery):
    """Розділ ігор та вікторин"""
    await callback.answer()
    games_text = (
        "🎮 <b>Ігри та вікторини клубу SVOI</b> 🏆\n\n"
        "Беріть участь в іграх, вигравайте бонуси та Картку Пріоритету (+5€ до безкоштовного вибору місця)!\n\n"
        "👇 <i>Оберіть активність:</i>"
    )
    await callback.message.edit_text(text=games_text, reply_markup=get_games_keyboard(), parse_mode="HTML")
