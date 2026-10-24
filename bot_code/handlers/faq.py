import logging
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.keyboards.inline import get_faq_keyboard, get_back_keyboard
except ModuleNotFoundError:
    from keyboards.inline import get_faq_keyboard, get_back_keyboard

logger = logging.getLogger(__name__)
router = Router(name="faq_router")

FAQ_MAIN_TEXT = (
    "❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\n\n"
    "Зібрали для вас детальні відповіді на найпопулярніші питання про формат наших подорожей, "
    "оплату, маршрути та час на локаціях:\n\n"
    "👇 <i>Натисніть на запитання, яке вас цікавить:</i>"
)

@router.callback_query(F.data == "cb_faq")
async def process_faq_main(callback: CallbackQuery):
    """Головний екран розділу FAQ"""
    await callback.answer()
    try:
        if callback.message:
            await callback.message.edit_text(
                text=FAQ_MAIN_TEXT,
                reply_markup=get_faq_keyboard(),
                parse_mode="HTML"
            )
    except TelegramBadRequest:
        pass

@router.callback_query(F.data == "cb_faq_walking")
async def process_faq_walking(callback: CallbackQuery):
    """Як гуляємо по локаціях"""
    await callback.answer()
    text = (
        "🚶 <b>Як ми гуляємо на локаціях?</b>\n\n"
        "Ми цінуємо баланс між цікавою пізнавальною програмою та вашим особистим відпочинком:\n\n"
        "1. <b>Вступна прогулянка:</b> Після прибуття ми разом проходимося ключовими визначними пам'ятками міста/локації, "
        "показуємо найкращі ракурси для фото, ділимося цікавими фактами та корисними лайфхаками.\n\n"
        "2. <b>Вільний час:</b> Ви не прив'язані жорстко до групи з парасолькою! У вас є можливість погуляти "
        "у власному темпі, завітати до музею, посидіти в затишній кав'ярні, спробувати місцеву кухню або зайнятися шопінгом.\n\n"
        "3. <b>Гайди та зв'язок:</b> Організатор завжди на зв'язку в спільному чаті поїздки та ділиться точками на карті (найкращі заклади, сувеніри, туалети)."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 До списку питань", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    """Скільки часу на локаціях"""
    await callback.answer()
    text = (
        "⏱ <b>Скільки часу ми проводимо на локаціях?</b>\n\n"
        "• В одноденних турах (Париж, Амстердам, Брюгге тощо) на саме місто або ключовий об'єкт "
        "виділяється <b>від 5 до 8 годин чистого часу</b> без урахування дороги.\n\n"
        "• У комбінованих маршрутах (наприклад, Етрета + Париж або 3 країни за 1 день) час ділиться: "
        "2.5–3.5 години на першій локації (скелі/природа) та 4–5 годин в основному місті.\n\n"
        "• У дводенних та триденних турах (Мон-Сен-Мішель, Лазурове узбережжя) темп більш розмірений, "
        "із заселенням у готель та вечірньою прогулянкою."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 До списку питань", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_payment")
async def process_faq_payment(callback: CallbackQuery):
    """Коли і як відбувається оплата"""
    await callback.answer()
    text = (
        "💳 <b>Коли та як відбувається оплата?</b>\n\n"
        "1. <b>Бронювання місця:</b> Ви залишаєте заявку в боті або пишете менеджеру. "
        "На одноденні тури ми працюємо <b>БЕЗ ПЕРЕДОПЛАТИ</b> — оплата при посадці в мінівен!\n\n"
        "2. <b>Багатоденні тури:</b> Невелика передоплата потрібна лише для кількаденних турів для фіксації готелю.\n\n"
        "3. <b>Способи оплати:</b>\n"
        "• Банківський переказ SEPA / IBAN (Німеччина та вся Європа)\n"
        "• PayPal\n"
        "• Готівка в євро при посадці\n\n"
        "4. <b>Гарантія повернення:</b> При скасуванні більш ніж за 72 години до виїзду дата переноситься або бронь скасовується без штрафів."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 До списку питань", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    """Як регулюються сидіння"""
    await callback.answer()
    text = (
        "💺 <b>Як влаштовані та регулюються сидіння в мінівені?</b>\n\n"
        "• У мінівені Opel Vivaro встановлені зручні анатомічні сидіння з індивідуальними ременями безпеки.\n"
        "• <b>Регулювання:</b> Спинки пасажирських сидінь відкидаються назад для відпочинку та сну в дорозі.\n"
        "• <b>Простір для ніг:</b> Збільшена відстань між рядами дозволяє витягнути ноги навіть людям високого зросту.\n"
        "• <b>Вибір місця:</b> Під час бронювання ви можете зафіксувати конкретне крісло за <b>5€</b> "
        "(наприклад, попереду біля водія або біля вікна), або зайняти будь-яке вільне безкоштовно (0€)."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 До списку питань", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    """Як обрати тур новачку"""
    await callback.answer()
    text = (
        "🎯 <b>Як новачку обрати свій перший тур?</b>\n\n"
        "• <b>Якщо хочеться казки та архітектури:</b> Брюгге (110€) або Ельзас + Страсбург (80€) — ідеальні затишні поїздки одного дня.\n"
        "• <b>Якщо хочеться світової класики:</b> Париж (120€) або Амстердам (120€) — насичена програма з круїзами на панорамних човнах.\n"
        "• <b>Якщо любите гори та природу:</b> Зальцбург + Гальштат (135€) або Швейцарія (Рейнський водоспад + Цюрих або долина водоспадів Лаутербруннен) — 120€.\n"
        "• <b>Якщо хочеться максимум країн або міст за 1 день:</b> Ліхтенштейн (Вадуц + Брегенц в Австрії + острів Ліндау в Німеччині, 120€) або Брюгге + Гент + Брюссель (120€).\n\n"
        "Напишіть нашому менеджеру @SVOI_travel_admin — ми з радістю підкажемо, який тур найкраще підійде під ваші дати та побажання!"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 До списку питань", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🗺 Відкрити каталог поїздок", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🏠 Головне меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
