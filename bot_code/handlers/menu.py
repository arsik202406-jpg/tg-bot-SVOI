import logging
from aiogram import Router, F
from aiogram.filters import CommandStart
from aiogram.types import Message, CallbackQuery
from aiogram.fsm.context import FSMContext
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.keyboards.inline import (
        get_main_menu_keyboard,
        get_back_keyboard,
        get_trips_keyboard,
        get_booking_trips_keyboard,
        get_faq_keyboard,
        get_games_keyboard,
        get_reviews_keyboard,
        get_custom_trip_keyboard
    )
    from bot_code.data.trips import REVIEWS_DATA, CUSTOM_TRIP_INFO
    from bot_code.config import settings
except ModuleNotFoundError:
    from keyboards.inline import (
        get_main_menu_keyboard,
        get_back_keyboard,
        get_trips_keyboard,
        get_booking_trips_keyboard,
        get_faq_keyboard,
        get_games_keyboard,
        get_reviews_keyboard,
        get_custom_trip_keyboard
    )
    from data.trips import REVIEWS_DATA, CUSTOM_TRIP_INFO
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="menu_router")

MAIN_MENU_TEXT = (
    "🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n"
    "Ми організовуємо душевні та продумані поїздки найкрасивішими куточками Європи "
    "на комфортабельному мінівені Opel Vivaro без стресу, поспіху та мовних бар'єрів!\n\n"
    "✨ <b>Чому обирають SVOI:</b>\n"
    "• 🚐 <i>Комфорт у дорозі:</i> просторий 8-місний мінівен з клімат-контролем та зручними відкидними кріслами\n"
    "• 💳 <i>Чесні умови:</i> працюємо <code>без передоплати</code> на одноденні поїздки!\n"
    "• 📍 <i>Зручний старт:</i> адресний збір (Door-to-Door) по Саарланду, Тріру та Люксембургу\n"
    "• 👥 <i>Маленькі душевні групи</i> (до 8 осіб)\n\n"
    "<blockquote>👇 Оберіть потрібний розділ нижче (всі переходи працюють в одному вікні):</blockquote>"
)

from aiogram.types import LinkPreviewOptions

async def safe_edit_menu_message(callback: CallbackQuery, text: str, reply_markup):
    """Редагує поточне повідомлення без видалення до підтвердження відправки"""
    if not callback.message:
        return
    try:
        if callback.message.photo:
            sent = await callback.message.answer(
                text=text,
                reply_markup=reply_markup,
                parse_mode="HTML",
                link_preview_options=LinkPreviewOptions(is_disabled=True)
            )
            if sent:
                try:
                    await callback.message.delete()
                except Exception:
                    pass
        else:
            await callback.message.edit_text(
                text=text,
                reply_markup=reply_markup,
                parse_mode="HTML",
                link_preview_options=LinkPreviewOptions(is_disabled=True)
            )
    except TelegramBadRequest as e:
        if "message is not modified" not in str(e):
            logger.debug("Помилка редагування повідомлення: %s", e)

@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    """Обробник команди /start з персоналізованим меню"""
    await state.clear()
    user_id = message.from_user.id if message.from_user else None
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(user_id=user_id),
        parse_mode="HTML"
    )

@router.callback_query(F.data == "cb_back")
async def process_back_to_menu(callback: CallbackQuery, state: FSMContext):
    """Повернення до головного меню з урахуванням прав адміна в тому ж вікні"""
    await callback.answer()
    await state.clear()
    user_id = callback.from_user.id if callback.from_user else None
    await safe_edit_menu_message(
        callback,
        MAIN_MENU_TEXT,
        get_main_menu_keyboard(user_id=user_id)
    )

@router.callback_query(F.data == "cb_book")
async def process_book_menu(callback: CallbackQuery, state: FSMContext):
    """
    Крок 1 покрокової воронки бронювання:
    Спочатку користувач обов'язково обирає тур та дату, і лише після цього переходить до вибору місця в салоні!
    """
    await callback.answer()
    await state.clear()
    step1_text = (
        "💺 <b>Крок 1 із 3: Оберіть тур для бронювання місця</b> 🗺✨\n\n"
        "<blockquote>🔥 <b>Порядок бронювання в клубі SVOI:</b>\n"
        "1️⃣ <b>Спочатку оберіть напрямок та дату</b> зі списку нижче\n"
        "2️⃣ <b>Потім оберіть місце в салоні</b> Opel Vivaro (1–8 або вільна посадка)\n"
        "3️⃣ <b>Підтвердіть заявку в 1 клік!</b> (<code>0% передоплати</code> на одноденні поїздки)</blockquote>\n\n"
        "👇 <b>Натисніть на тур, щоб перейти до вибору місця:</b>"
    )
    await safe_edit_menu_message(callback, step1_text, get_booking_trips_keyboard())

@router.callback_query(F.data == "cb_car")
async def process_car_info(callback: CallbackQuery):
    """Інформація про автопарк клубу SVOI: мінівен Opel Vivaro"""
    await callback.answer()
    car_text = (
        "🚐 <b>Наш мінівен: Opel Vivaro (8 пасажирських місць)</b> 🚗\n\n"
        "💺 <b>Схема місць у салоні (2 + 3 + 3):</b>\n"
        "• <b>1-й ряд (поруч із водієм):</b> Місце 1 — <code>+5€ (Панорамне)</code>, Місце 2 — <code>+5€ (Вікно)</code>\n"
        "• <b>2-й ряд:</b> Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно (<code>+5€</code>)\n"
        "• <b>3-й ряд:</b> Місце 6 — вікно (<code>+5€</code>), Місце 7 — центр (<code>0€</code>), Місце 8 — вікно (<code>+5€</code>)\n\n"
        "🌟 <b>Оснащення та зручності:</b>\n"
        "• ❄️ Дводіапазонний клімат-контроль та обігрів салону\n"
        "• ⚡️ Швидкі USB-роз'єми в салоні для зарядки смартфонів\n"
        "• 💺 М'які сидіння з відкидними спинками та простором для ніг\n\n"
        "<blockquote>🧳 <b>Норма багажу:</b> до <code>10 кг</code> у багажне відділення при далеких поїздках + 1 ручна поклажа в салон.</blockquote>"
    )
    await safe_edit_menu_message(callback, car_text, get_back_keyboard())

@router.callback_query(F.data == "cb_meeting")
async def process_meeting_points(callback: CallbackQuery):
    """Інформація про точки збору та логістику з блоками цитат"""
    await callback.answer()
    meeting_text = (
        "📍 <b>Точки збору пасажирів & Логістика клубу SVOI</b> 🗺\n\n"
        "<blockquote>🏡 <b>Збір та розвезення за адресою (Door-to-Door):</b>\n"
        "Забираємо всіх прямо від під'їзду по землі <b>Саарланд (Saarland)</b>, у <b>Трірі (Trier)</b> та <b>Люксембурзі (Luxembourg)</b> і повертаємо назад за адресою!</blockquote>\n\n"
        "🛣 <b>Збір в інших землях (від 4-х осіб):</b>\n"
        "• <b>Хомбург (Homburg Saar)</b> — по дорозі за маршрутом\n"
        "• <b>Кайзерслаутерн / Мангейм / Франкфурт</b> — при групі від <code>4-х осіб</code>\n"
        "• <b>Карлсруе / Страсбург</b> — для південних напрямків (Швейцарія, Франція, Італія)\n\n"
        "<blockquote>⏰ <b>Важливо:</b> Точний час подачі авто надсилається в особистий чат <code>за день увечері</code> перед виїздом.</blockquote>"
    )
    await safe_edit_menu_message(callback, meeting_text, get_back_keyboard())

@router.callback_query(F.data == "cb_terms")
async def process_terms(callback: CallbackQuery):
    """Умови поїздок, правила скасування, документи"""
    await callback.answer()
    terms_text = (
        "📜 <b>Умови поїздок туристичного клубу SVOI</b> 📌\n\n"
        "<blockquote>🔥 <b>Головне правило клубу:</b>\n"
        "Працюємо <code>БЕЗ ПЕРЕДОПЛАТИ (0%)</code> на всі одноденні поїздки! Оплата здійснюється водієві при посадці в день виїзду.</blockquote>\n\n"
        "🛂 <b>Необхідні документи:</b>\n"
        "• Дійсний закордонний паспорт + ВНЖ (<code>Aufenthaltstitel</code>) або віза\n"
        "• Медична туристична страховка\n\n"
        "🧳 <b>Багаж:</b>\n"
        "• До <code>10 кг</code> у багажний відсік + ручна поклажа в салон\n\n"
        "<blockquote>🔄 <b>Скасування броні:</b> за <code>72+ години</code> до виїзду — безкоштовне перенесення або скасування без жодних штрафів.</blockquote>"
    )
    await safe_edit_menu_message(callback, terms_text, get_back_keyboard())

@router.callback_query(F.data == "cb_partner")
async def process_partner(callback: CallbackQuery):
    """Співпраця та партнерська програма"""
    await callback.answer()
    partner_text = (
        "🤝 <b>Партнерська програма & Співпраця</b> 💼\n\n"
        "Клуб SVOI відкритий для друзів, блогерів, гідів та активних мандрівників!\n\n"
        "🌟 <b>Наші формати співпраці:</b>\n"
        "1. <b>Приведи друзів:</b> зберіть компанію від 4 осіб та отримайте персональну знижку <code>-10%</code> кожному!\n"
        "2. <b>Індивідуальний чартер:</b> оренда всього мінівена (8 місць) з водієм під ваш маршрут зі знижкою <code>-15%</code>.\n"
        "3. <b>Для блогерів та інфлюенсерів:</b> бартерні поїздки за чесні огляди та відмітки.\n\n"
        f"<blockquote>📩 Прямий контакт засновника клубу: @{settings.MANAGER_USERNAME.lstrip('@')}</blockquote>"
    )
    await safe_edit_menu_message(callback, partner_text, get_back_keyboard())

@router.callback_query(F.data == "cb_faq")
async def process_faq_menu(callback: CallbackQuery):
    """Розділ частих запитань FAQ"""
    await callback.answer()
    faq_text = (
        "❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\n\n"
        "<blockquote>Зібрали для вас відповіді на головні питання про адресний збір, <code>0% передоплати</code>, комфорт Opel Vivaro та таймінг турів:</blockquote>\n\n"
        "👇 <i>Натисніть на розділ нижче:</i>"
    )
    await safe_edit_menu_message(callback, faq_text, get_faq_keyboard())

@router.callback_query(F.data == "cb_faq_payment")
async def process_faq_payment(callback: CallbackQuery):
    await callback.answer()
    text = (
        "💳 <b>Коли та як відбувається оплата поїздки?</b>\n\n"
        "<blockquote>🔥 <b>Ми працюємо БЕЗ ПЕРЕДОПЛАТИ (0%) на всі одноденні поїздки!</b>\n"
        "Ви бронюєте місце в 1 клік, а оплачуєте при посадці в мінівен.</blockquote>\n\n"
        "• <b>Багатоденні тури (2–3 дні):</b> передоплата потрібна тільки для бронювання готелю.\n"
        "• <b>Способи оплати:</b> готівка в євро при посадці, SEPA / IBAN, PayPal."
    )
    await safe_edit_menu_message(callback, text, get_faq_keyboard())

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    await callback.answer()
    text = (
        "⏱ <b>Скільки часу на локаціях?</b>\n\n"
        "• <b>Одноденні тури (Париж, Амстердам, Брюгге):</b> від <code>5 до 8 годин</code> чистого часу в місті!\n"
        "• <b>Етрета + Париж:</b> <code>5 годин</code> на скелях Етрета + <code>2–3 години</code> у вечірньому Парижі!\n"
        "• <b>Швейцарія комбо:</b> <code>3 год</code> Лаутербруннен + <code>2 год</code> ущелина Ааре + <code>2 год</code> Берн!\n\n"
        "<blockquote>💡 Усі переїзди проходять з комфортними санітарними зупинками та кава-паузами.</blockquote>"
    )
    await safe_edit_menu_message(callback, text, get_faq_keyboard())

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    await callback.answer()
    text = (
        "🚶 <b>Як ми гуляємо на локаціях?</b>\n\n"
        "1. <b>Вступна прогулянка:</b> разом оглядаємо головні локації та найкращі фото-ракурси.\n"
        "2. <b>Вільний час:</b> гуляєте у власному темпі без прив'язки до натовпу.\n"
        "<blockquote>📍 Супроводжуючий клубу завжди на зв'язку та скидає геолокації перевірених кафе й оглядових майданчиків у чат групи.</blockquote>"
    )
    await safe_edit_menu_message(callback, text, get_faq_keyboard())

@router.callback_query(F.data == "cb_games")
async def process_games_menu(callback: CallbackQuery):
    """Розділ ігор та вікторин"""
    await callback.answer()
    games_text = (
        "🎮 <b>Ігри та вікторини клубу SVOI</b> 🏆\n\n"
        "<blockquote>Вигравайте бонуси та промокоди на безкоштовний вибір панорамного місця (<code>+5€</code> у подарунок)!</blockquote>\n\n"
        "👇 <i>Оберіть гру або вікторину:</i>"
    )
    await safe_edit_menu_message(callback, games_text, get_games_keyboard())

@router.callback_query(F.data == "cb_reviews")
async def process_reviews_menu(callback: CallbackQuery):
    """Розділ відгуків туристів клубу SVOI"""
    await callback.answer()
    blocks = []
    for r in REVIEWS_DATA:
        stars = "⭐" * r["rating"]
        blocks.append(
            f"<b>{r['author']}</b> ({r['city']}) — <i>{r['trip']}</i>  {stars}\n"
            f"<blockquote>«{r['text']}»</blockquote>"
        )
    
    text = (
        "⭐ <b>Відгуки туристів клубу SVOI Travel</b> 💬✨\n\n"
        + "\n\n".join(blocks) +
        "\n\n👇 <i>Поділіться своїми враженнями або пропозицією нового маршруту:</i>"
    )
    await safe_edit_menu_message(callback, text, get_reviews_keyboard())

@router.callback_query(F.data == "cb_custom_trip")
async def process_custom_trip(callback: CallbackQuery):
    """Розділ індивідуального виїзду для компаній від 5 до 8 осіб"""
    await callback.answer()
    text = (
        CUSTOM_TRIP_INFO["description"] + "\n\n"
        "👇 <i>Натисніть кнопку нижче, щоб обговорити ваш напрямок та зручну дату з менеджером:</i>"
    )
    await safe_edit_menu_message(callback, text, get_custom_trip_keyboard())

@router.message(~F.web_app_data, ~F.contact)
async def auto_greeting_handler(message: Message, state: FSMContext):
    """
    Автоматичне привітання будь-якого клієнта, якщо він не перебуває в стані FSM.
    """
    current_state = await state.get_state()
    if current_state is not None:
        return

    user_id = message.from_user.id if message.from_user else None
    await message.answer(
        text=MAIN_MENU_TEXT,
        reply_markup=get_main_menu_keyboard(user_id=user_id),
        parse_mode="HTML"
    )
