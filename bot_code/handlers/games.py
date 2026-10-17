import logging
import random
from aiogram import Router, F, Bot
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest

from bot_code.keyboards.inline import get_games_keyboard, get_back_keyboard
from bot_code.config import settings

logger = logging.getLogger(__name__)
router = Router(name="games_router")

# База локаций для игры «Гео-Детектив»
GEO_QUESTS = [
    {
        "id": "etretat",
        "question": "🕵️ <b>Гео-Детектив #1: Где сделан этот снимок?</b>\n\n"
                    "«Белоснежные алебастровые арки, высеченные волнами Атлантического океана, "
                    "вдохновлявшие Клода Моне и писателя Мориса Леблана на истории об Арсене Люпене».",
        "options": [
            ("🇫🇷 Этрета (Нормандия, Франция)", True),
            ("🇮🇹 Побережье Амальфи (Италия)", False),
            ("🇬🇧 Белые скалы Дувра (Англия)", False),
            ("🇵🇹 Мыс Рока (Португалия)", False),
        ],
        "fact": "Это знаменитые скалы <b>Этрета</b> в Нормандии! Мы посещаем эту локацию в туре «Этрета + Париж».",
        "secret_guide": "🎁 <b>Секретный гайд по Этрета:</b> Лучший вид на закат открывается с тропы у часовни Notre-Dame de la Garde, а самые свежие устрицы подают прямо внизу у лодочных доков всего за 1.5€ за штуку!"
    },
    {
        "id": "aare",
        "question": "🕵️ <b>Гео-Детектив #2: Что это за мистическое ущелье?</b>\n\n"
                    "«Глубокий каньон с бирюзовой ледниковой водой, деревянными мостиками вдоль отвесных скал "
                    "и гротами, который вдохновил Толкина на создание эльфийского Ривенделла».",
        "options": [
            ("🇨🇭 Ущелье Аарешлюхт (Швейцария)", True),
            ("🇦🇹 Ущелье Лихтенштейнкламм (Австрия)", False),
            ("🇸🇮 Ущелье Винтгар (Словения)", False),
            ("🇩🇪 Бастай (Саксонская Швейцария)", False),
        ],
        "fact": "Это волшебное <b>ущелье реки Ааре</b> в Бернских Альпах! Мы посещаем его в туре «Ааре + Лаутербруннен + Берн».",
        "secret_guide": "🎁 <b>Секретный гайд:</b> В ущелье всегда прохладно даже в жару (+12°C). Не забудьте легкую ветровку! А в 10 минутах от выхода находится кафе с легендарным швейцарским меренговым десертом."
    },
    {
        "id": "bruges",
        "question": "🕵️ <b>Гео-Детектив #3: В каком сказочном городе этот мост?</b>\n\n"
                    "«Старинный каменный мост над каналом, где плавают белые лебеди, а в воздухе "
                    "пахнет горячим бельгийским шоколадом и пряными вафлями».",
        "options": [
            ("🇧🇪 Брюгге (Бельгия)", True),
            ("🇳🇱 Амстердам (Нидерланды)", False),
            ("🇫🇷 Кольмар (Франция)", False),
            ("🇩🇪 Бамберг (Германия)", False),
        ],
        "fact": "Это средневековый <b>Брюгге</b> у Озера Любви (Minnewater)! Мы едем сюда в туре выходного дня за 110€.",
        "secret_guide": "🎁 <b>Секретный гайд:</b> Попробуйте бельгийское пиво 'Brugse Zot' в исторической пивоварне De Halve Maan — под городом проложен единственный в мире пивопровод длиной 3 км!"
    }
]

# Квиз: Правда или Ложь (неочевидные факты)
QUIZ_QUESTIONS = [
    {
        "id": "q1",
        "question": "🧠 <b>Правда или Ложь #1 (Швейцария):</b>\n\n"
                    "Правда ли, что в Швейцарии законом запрещено владеть только одной морской свинкой?",
        "answer": True,
        "explanation": "<b>Это ПРАВДА!</b> 🐹 В Швейцарии действует строгий закон о защите животных: морские свинки признаны социальными существами, страдающими от одиночества. По закону их можно держать только парами!"
    },
    {
        "id": "q2",
        "question": "🧠 <b>Правда или Ложь #2 (Париж, Франция):</b>\n\n"
                    "Правда ли, что Эйфелеву башню изначально планировали снести через 20 лет после постройки?",
        "answer": True,
        "explanation": "<b>Это ПРАВДА!</b> 🗼 Башню построили как временную арку для Всемирной выставки 1889 года и должны были разобрать в 1909 году. Её спасло лишь изобретение радио — верхушку башни использовали как гигантскую радиоантенну!"
    },
    {
        "id": "q3",
        "question": "🧠 <b>Правда или Ложь #3 (Лихтенштейн):</b>\n\n"
                    "Правда ли, что всё государство Лихтенштейн можно было официально арендовать на сутки на Airbnb?",
        "answer": True,
        "explanation": "<b>Это ПРАВДА!</b> 🏰 В 2011 году княжество Лихтенштейн совместно с Airbnb запустило акцию: за $70,000 в сутки компания до 150 человек могла 'арендовать страну', получить символический ключ от государства и дегустировать вино в винном погребе правящего князя!"
    }
]

@router.callback_query(F.data == "cb_games")
async def process_games_main(callback: CallbackQuery):
    """Главный экран раздела игр и викторин"""
    await callback.answer()
    text = (
        "🎮 <b>Интерактивные игры и викторины туристического клуба SVOI</b> 🏆\n\n"
        "Скучаете по дороге на работу или вечером? Участвуйте в играх, проверяйте интуицию "
        "и получайте ценные бонусы для ваших будущих поездок!\n\n"
        "✨ <b>Доступные активности:</b>\n"
        "• 🕵️ <b>Игра «Гео-Детектив»:</b> угадайте неочевидную локацию из наших маршрутов по деталям и получите <b>Карту Приоритета (+5€ выбор места)</b> или секретный гайд!\n"
        "• 🧠 <b>Квиз «Правда или Ложь»:</b> 3 шокирующих факта о европейских странах, которые вы вряд ли знали.\n"
        "• 🎁 <b>Розыгрыши билетов:</b> как бот проводит викторины и конкурсы прямо в нашем Telegram-чате.\n\n"
        "👇 <i>Выберите игру:</i>"
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=get_games_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_game_geo")
async def process_game_geo_start(callback: CallbackQuery):
    """Старт игры Гео-Детектив"""
    await callback.answer()
    quest = random.choice(GEO_QUESTS)
    
    buttons = []
    for opt_title, is_correct in quest["options"]:
        cb = f"cb_geocheck_{quest['id']}_{1 if is_correct else 0}"
        buttons.append([InlineKeyboardButton(text=opt_title, callback_data=cb)])
    buttons.append([InlineKeyboardButton(text="🔙 К выбору игр", callback_data="cb_games")])
    
    if callback.message:
        await callback.message.edit_text(
            text=f"{quest['question']}\n\n<i>Выберите правильный ответ:</i>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_geocheck_"))
async def process_geocheck(callback: CallbackQuery):
    """Проверка ответа в Гео-Детективе"""
    await callback.answer()
    parts = callback.data.split("_")
    quest_id = parts[2]
    is_correct = parts[3] == "1"
    
    quest = next((q for q in GEO_QUESTS if q["id"] == quest_id), GEO_QUESTS[0])
    
    if is_correct:
        promo_code = f"PRIORITY-{random.randint(100, 999)}"
        text = (
            "🎉 <b>БРАВО! ВЫ НАСТОЯЩИЙ ГЕО-ДЕТЕКТИВ!</b> 🏆\n\n"
            f"{quest['fact']}\n\n"
            f"{quest['secret_guide']}\n\n"
            f"🎁 <b>Ваш бонус: КАРТА ПРИОРИТЕТА</b>\n"
            f"Промокод: <code>{promo_code}</code>\n"
            f"Даёт право <b>бесплатно выбрать любое место в минивэне (экономия 5€)</b> или скидку 10% на ваш первый тур!\n"
            f"<i>Просто отправьте промокод нашему менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} при бронировании.</i>"
        )
    else:
        text = (
            "Упс, не совсем так! 🔍\n\n"
            f"Правильный ответ: {quest['fact']}\n\n"
            "Но не расстраивайтесь, вы можете попробовать угадать следующую локацию!"
        )
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Сыграть еще раз", callback_data="cb_game_geo")],
            [InlineKeyboardButton(text="🗺 Выбрать тур в этот город", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Меню игр", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_game_quiz")
async def process_quiz_start(callback: CallbackQuery):
    """Старт квиза Правда или Ложь"""
    await callback.answer()
    q = random.choice(QUIZ_QUESTIONS)
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👍 ПРАВДА", callback_data=f"cb_qcheck_{q['id']}_1"),
                InlineKeyboardButton(text="👎 ЛОЖЬ", callback_data=f"cb_qcheck_{q['id']}_0")
            ],
            [InlineKeyboardButton(text="🔙 Меню игр", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(
            text=f"{q['question']}\n\n<i>Как вы думаете?</i>",
            reply_markup=kb,
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_qcheck_"))
async def process_quiz_check(callback: CallbackQuery):
    """Проверка ответа в квизе"""
    await callback.answer()
    parts = callback.data.split("_")
    q_id = parts[2]
    user_choice = parts[3] == "1"
    
    q = next((item for item in QUIZ_QUESTIONS if item["id"] == q_id), QUIZ_QUESTIONS[0])
    correct = (user_choice == q["answer"])
    
    result_title = "🎉 <b>В точку! Вы абсолютно правы!</b>" if correct else "😮 <b>Сюрприз! Вы удивитесь:</b>"
    text = (
        f"{result_title}\n\n"
        f"{q['explanation']}\n\n"
        f"Такие удивительные факты и истории мы рассказываем во время наших поездок! Присоединяйтесь!"
    )
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎲 Следующий факт", callback_data="cb_game_quiz")],
            [InlineKeyboardButton(text="🗺 Расписание туров", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Меню игр", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_game_group_info")
async def process_group_games_info(callback: CallbackQuery):
    """Информация о викторинах и розыгрышах в группе Telegram"""
    await callback.answer()
    text = (
        "📢 <b>Викторины и розыгрыши билетов прямо в группе Telegram!</b> 🎟✨\n\n"
        "<b>Может ли бот проводить квизы в группе?</b>\n"
        "👉 <b>ДА!</b> Наш бот использует официальный механизм Telegram Quiz (<code>bot.send_poll(type='quiz')</code>).\n\n"
        "🔥 <b>Как это работает в нашей группе SVOI:</b>\n"
        "1. <b>Квизы раз в 2–3 дня:</b> Бот публикует опрос с 1 правильным ответом. При верном клике у пользователя летит праздничное конфетти!\n"
        "2. <b>Розыгрыши билетов и призов:</b> Бот запускает пост с кнопкой «Участвовать в розыгрыше». В назначенный час бот автоматически выбирает случайного победителя из списка нажавших кнопку!\n"
        "3. <b>Призы:</b> Бесплатное место в поездке, бесплатный выбор любого места в авто (+5€) или скидка 15% на следующий тур!\n\n"
        "Вступайте в нашу группу и не пропускайте активности:"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Перейти в группу путешественников SVOI", url=settings.GROUP_URL)],
            [InlineKeyboardButton(text="📢 Наш официальный канал", url=settings.CHANNEL_URL)],
            [InlineKeyboardButton(text="🔙 Назад к играм", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
