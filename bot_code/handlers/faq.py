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
    "❓ <b>Частые вопросы о поездках клуба SVOI (FAQ)</b> 💡\n\n"
    "Собрали для вас подробные ответы на самые популярные вопросы о формате наших путешествий, "
    "оплате, маршрутах и времени на локациях:\n\n"
    "👇 <i>Нажмите на интересующий вопрос или перейдите к подробной теме в канале:</i>"
)

@router.callback_query(F.data == "cb_faq")
async def process_faq_main(callback: CallbackQuery):
    """Главный экран раздела FAQ"""
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
    """Как гуляем по локациям"""
    await callback.answer()
    text = (
        "🚶 <b>Как мы гуляем по локациям?</b>\n\n"
        "Мы ценим баланс между познавательной программой и вашим личным отдыхом:\n\n"
        "1. <b>Вводная прогулка:</b> По прибытии мы вместе проходим по ключевым достопримечательностям города/локации, "
        "показываем лучшие ракурсы для фото, делимся интересными фактами и лайфхаками.\n\n"
        "2. <b>Свободное время:</b> Вы не привязаны жестко к группе с зонтиком! У вас есть возможность погулять "
        "в своем темпе, зайти в музей, посидеть в уютном кафе, попробовать местную кухню или заняться шопингом.\n\n"
        "3. <b>Гайды и связь:</b> Организатор всегда на связи в общем чате поездки и делится точками на карте (лучшие кафе, сувениры, туалеты)."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 К списку вопросов", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_time")
async def process_faq_time(callback: CallbackQuery):
    """Сколько времени на локациях"""
    await callback.answer()
    text = (
        "⏱ <b>Сколько времени мы проводим на локациях?</b>\n\n"
        "• В однодневных турах (Париж, Амстердам, Брюгге и др.) на сам город или ключевой объект "
        "выделяется <b>от 5 до 8 часов чистого времени</b> без учета дороги.\n\n"
        "• В комбинированных маршрутах (например, Этрета + Париж или 3 страны за 1 день) время делится: "
        "2.5–3.5 часа на первой локации (скалы/природа) и 4–5 часов в основном городе.\n\n"
        "• В двухдневных и трехдневных турах (Мон-Сен-Мишель, Лазурный берег) темп более размеренный, "
        "с заселением в отель и вечерней прогулкой."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 К списку вопросов", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_payment")
async def process_faq_payment(callback: CallbackQuery):
    """Когда и как происходит оплата"""
    await callback.answer()
    text = (
        "💳 <b>Когда и как происходит оплата?</b>\n\n"
        "1. <b>Бронирование места:</b> Вы оставляете заявку в боте или пишете менеджеру. Для фиксации места "
        "вносится небольшая предоплата (или полная стоимость по согласованию).\n\n"
        "2. <b>Способы оплаты:</b>\n"
        "• Банковский перевод SEPA / IBAN (Германия и вся Европа)\n"
        "• PayPal (Friends & Family / Goods)\n"
        "• Оплата наличными при посадке (по предварительной договоренности с менеджером)\n\n"
        "3. <b>Гарантия возврата:</b> При отмене более чем за 72 часа до выезда предоплата возвращается на 100% "
        "или переносится на любой другой тур без штрафов."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 К списку вопросов", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_seats")
async def process_faq_seats(callback: CallbackQuery):
    """Как регулируются сидения"""
    await callback.answer()
    text = (
        "💺 <b>Как устроены и регулируются сиденья в минивэне?</b>\n\n"
        "• В минивэне Opel Vivaro установлены комфортные сиденья с индивидуальными ремнями безопасности.\n"
        "• <b>Регулировка:</b> Спинки большинства пассажирских сидений откидываются назад для отдыха в дороге.\n"
        "• <b>Пространство для ног:</b> Увеличенный зазор между рядами позволяет вытянуть ноги даже людям высокого роста.\n"
        "• <b>Выбор места:</b> При бронировании вы можете зафиксировать конкретное понравившееся кресло за <b>5€</b> "
        "(например, впереди у лобового стекла или у окна), либо занять любое свободное бесплатно."
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 К списку вопросов", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_faq_choose")
async def process_faq_choose(callback: CallbackQuery):
    """Как выбрать тур новичку"""
    await callback.answer()
    text = (
        "🎯 <b>Как новичку выбрать свой первый тур?</b>\n\n"
        "• <b>Если хочется сказки и архитектуры:</b> Брюгге (110€) или Эльзас + Страсбург (80€) — идеальные мягкие поездки одного дня.\n"
        "• <b>Если хочется мировой классики:</b> Париж (120€) или Амстердам (120€) — насыщенная программа с круизами на корабликах.\n"
        "• <b>Если любите горы и природу:</b> Швейцария (Рейнский водопад + Цюрих или долина водопадов Лаутербруннен) — 120€.\n"
        "• <b>Если хочется максимум стран за 1 день:</b> Лихтенштейн (Лихтенштейн + Австрия + Швейцария) — 120€.\n\n"
        "Напишите нашему менеджеру @SVOI_travel_admin — мы с радостью подскажем, какой тур лучше всего подойдет под ваши даты и пожелания!"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔙 К списку вопросов", callback_data="cb_faq")],
            [InlineKeyboardButton(text="🗺 Открыть каталог поездок", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🏠 Главное меню", callback_data="cb_back")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
