import logging
import random
from aiogram import Router, F
from aiogram.types import CallbackQuery, InlineKeyboardMarkup, InlineKeyboardButton
from aiogram.exceptions import TelegramBadRequest

try:
    from bot_code.keyboards.inline import get_games_keyboard, get_back_keyboard
    from bot_code.config import settings
except ModuleNotFoundError:
    from keyboards.inline import get_games_keyboard, get_back_keyboard
    from config import settings

logger = logging.getLogger(__name__)
router = Router(name="games_router")

# База локацій для гри «Гео-Детектив»
GEO_QUESTS = [
    {
        "id": "etretat",
        "question": "🕵️ <b>Гео-Детектив #1: Де зроблено це фото?</b>\n\n"
                    "«Білосніжні алебастрові арки, висічені хвилями Атлантичного океану, "
                    "що надихали Клода Моне та письменника Моріса Леблана на історії про Арсена Люпена».",
        "options": [
            ("🇫🇷 Етрета (Нормандія, Франція)", True),
            ("🇮🇹 Узбережжя Амальфі (Італія)", False),
            ("🇬🇧 Білі скелі Дувра (Англія)", False),
            ("🇵🇹 Мис Рока (Португалія)", False),
        ],
        "fact": "Це знамениті скелі <b>Етрета</b> в Нормандії! Ми відвідуємо цю локацію в турі «Етрета + Париж».",
        "secret_guide": "🎁 <b>Секретний гайд по Етрета:</b> Найкращий вид на захід сонця відкривається зі стежки біля каплиці Notre-Dame de la Garde, а найсвіжіші устриці подають прямо внизу біля човнових доків всього за 1.5€ за штуку!"
    },
    {
        "id": "aare",
        "question": "🕵️ <b>Гео-Детектив #2: Що це за містична ущелина?</b>\n\n"
                    "«Глибокий каньйон з бірюзовою льодовиковою водою, дерев'яними містками вздовж прямовисних скель "
                    "та гротами, що надихнув Толкіна на створення ельфійського Рівенделла».",
        "options": [
            ("🇨🇭 Ущелина Аарешлюхт (Швейцарія)", True),
            ("🇦🇹 Ущелина Ліхтенштайнкламм (Австрія)", False),
            ("🇸🇮 Ущелина Вінтгар (Словенія)", False),
            ("🇩🇪 Бастай (Саксонська Швейцарія)", False),
        ],
        "fact": "Це чарівна <b>ущелина річки Ааре</b> в Бернських Альпах! Ми відвідуємо її в турі «Ааре + Лаутербруннен + Берн».",
        "secret_guide": "🎁 <b>Секретний гайд:</b> В ущелині завжди приємна прохолода навіть у літню спеку (+12°C). Не забудьте легку вітрівку! А за 10 хвилин від виходу знаходиться кафе з легендарним швейцарським десертом безе."
    },
    {
        "id": "bruges",
        "question": "🕵️ <b>Гео-Детектив #3: У якому казковому місті цей міст?</b>\n\n"
                    "«Старовинний кам'яний міст над каналом, де плавають білі лебеді, а в повітрі "
                    "пахне гарячим бельгійським шоколадом та запашними вафлями».",
        "options": [
            ("🇧🇪 Брюгге (Бельгія)", True),
            ("🇳🇱 Амстердам (Нідерланди)", False),
            ("🇫🇷 Кольмар (Франція)", False),
            ("🇩🇪 Бамберг (Німеччина)", False),
        ],
        "fact": "Це середньовічний <b>Брюгге</b> біля Озера Кохання (Minnewater)! Ми їдемо сюди в турі вихідного дня за 110€.",
        "secret_guide": "🎁 <b>Секретний гайд:</b> Скуштуйте бельгійське пиво 'Brugse Zot' в історичній броварні De Halve Maan — під містом прокладено єдиний у світі пивопровід завдовжки 3 км!"
    }
]

# Квіз: Правда чи Неправда
QUIZ_QUESTIONS = [
    {
        "id": "q1",
        "question": "🧠 <b>Правда чи Неправда #1 (Швейцарія):</b>\n\n"
                    "Чи правда, що у Швейцарії законом заборонено володіти лише однією морською свинкою?",
        "answer": True,
        "explanation": "<b>Це ПРАВДА!</b> 🐹 У Швейцарії діє суворий закон про захист тварин: морські свинки визнані соціальними істотами, які страждають від самотності. За законом їх можна тримати лише парами!"
    },
    {
        "id": "q2",
        "question": "🧠 <b>Правда чи Неправда #2 (Париж, Франція):</b>\n\n"
                    "Чи правда, що Ейфелеву вежу спочатку планували розібрати через 20 років після спорудження?",
        "answer": True,
        "explanation": "<b>Це ПРАВДА!</b> 🗼 Вежу збудували як тимчасову вхідну арку для Всесвітньої виставки 1889 року і мали демонтувати у 1909 році. Її врятував винахід радіо — верхівку вежі почали використовувати як велетенську радіоантену!"
    },
    {
        "id": "q3",
        "question": "🧠 <b>Правда чи Неправда #3 (Ліхтенштейн):</b>\n\n"
                    "Чи правда, що всю державу Ліхтенштейн можна було офіційно орендувати на добу через Airbnb?",
        "answer": True,
        "explanation": "<b>Це ПРАВДА!</b> 🏰 У 2011 році князівство Ліхтенштейн спільно з Airbnb запустило акцію: за $70,000 на добу компанія до 150 осіб могла 'орендувати країну', отримати символічний ключ від держави та дегустувати вино в погребі правлячого князя!"
    }
]

@router.callback_query(F.data == "cb_games")
async def process_games_main(callback: CallbackQuery):
    """Головний екран розділу ігор та вікторин"""
    await callback.answer()
    text = (
        "🎮 <b>Інтерактивні ігри та вікторини туристичного клубу SVOI</b> 🏆\n\n"
        "Нудьгуєте дорогою на роботу чи ввечері? Беріть участь в іграх, перевіряйте інтуїцію "
        "та отримуйте приємні бонуси для ваших майбутніх поїздок!\n\n"
        "✨ <b>Доступні активності:</b>\n"
        "• 🕵️ <b>Гра «Гео-Детектив»:</b> вгадайте незвичайну локацію з наших маршрутів за деталями та отримайте <b>Картку Пріоритету (+5€ вибір місця)</b> або секретний гайд!\n"
        "• 🧠 <b>Квіз «Правда чи Неправда»:</b> 3 дивовижні факти про європейські країни, які вас точно здивують.\n"
        "• 🎁 <b>Розіграші квитків:</b> як бот проводить вікторини та конкурси просто в нашому Telegram-чаті.\n\n"
        "👇 <i>Оберіть гру:</i>"
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=get_games_keyboard(), parse_mode="HTML")

@router.callback_query(F.data == "cb_game_geo")
async def process_game_geo_start(callback: CallbackQuery):
    """Старт гри Гео-Детектив"""
    await callback.answer()
    quest = random.choice(GEO_QUESTS)
    
    buttons = []
    for opt_title, is_correct in quest["options"]:
        cb = f"cb_geocheck_{quest['id']}_{1 if is_correct else 0}"
        buttons.append([InlineKeyboardButton(text=opt_title, callback_data=cb)])
    buttons.append([InlineKeyboardButton(text="🔙 До вибору ігор", callback_data="cb_games")])
    
    if callback.message:
        await callback.message.edit_text(
            text=f"{quest['question']}\n\n<i>Оберіть правильну відповідь:</i>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_geocheck_"))
async def process_geocheck(callback: CallbackQuery):
    """Перевірка відповіді в Гео-Детективі"""
    await callback.answer()
    parts = callback.data.split("_")
    quest_id = parts[2]
    is_correct = parts[3] == "1"
    
    quest = next((q for q in GEO_QUESTS if q["id"] == quest_id), GEO_QUESTS[0])
    
    if is_correct:
        promo_code = f"PRIORITY-{random.randint(100, 999)}"
        text = (
            "🎉 <b>БРАВО! ВИ СПРАВЖНІЙ ГЕО-ДЕТЕКТИВ!</b> 🏆\n\n"
            f"{quest['fact']}\n\n"
            f"{quest['secret_guide']}\n\n"
            f"🎁 <b>Ваш бонус: КАРТКА ПРІОРИТЕТУ</b>\n"
            f"Промокод: <code>{promo_code}</code>\n"
            f"Дає право <b>безкоштовно обрати будь-яке місце в мінівені (економія 5€)</b> або знижку 10% на ваш перший тур!\n"
            f"<i>Просто надішліть промокод нашому менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} при бронюванні.</i>"
        )
    else:
        text = (
            "Ой, не зовсім так! 🔍\n\n"
            f"Правильна відповідь: {quest['fact']}\n\n"
            "Але не засмучуйтесь, ви можете спробувати вгадати наступну локацію!"
        )
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Зіграти ще раз", callback_data="cb_game_geo")],
            [InlineKeyboardButton(text="🗺 Обрати тур у це місто", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_game_quiz")
async def process_quiz_start(callback: CallbackQuery):
    """Старт квізу Правда чи Неправда"""
    await callback.answer()
    q = random.choice(QUIZ_QUESTIONS)
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [
                InlineKeyboardButton(text="👍 ПРАВДА", callback_data=f"cb_qcheck_{q['id']}_1"),
                InlineKeyboardButton(text="👎 НЕПРАВДА", callback_data=f"cb_qcheck_{q['id']}_0")
            ],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(
            text=f"{q['question']}\n\n<i>Як ви вважаєте?</i>",
            reply_markup=kb,
            parse_mode="HTML"
        )

@router.callback_query(F.data.startswith("cb_qcheck_"))
async def process_quiz_check(callback: CallbackQuery):
    """Перевірка відповіді у квізі"""
    await callback.answer()
    parts = callback.data.split("_")
    q_id = parts[2]
    user_choice = parts[3] == "1"
    
    q = next((item for item in QUIZ_QUESTIONS if item["id"] == q_id), QUIZ_QUESTIONS[0])
    correct = (user_choice == q["answer"])
    
    result_title = "🎉 <b>У яблучко! Ви абсолютно праві!</b>" if correct else "😮 <b>Несподівано! Ви здивуєтеся:</b>"
    text = (
        f"{result_title}\n\n"
        f"{q['explanation']}\n\n"
        f"Такі дивовижні факти та історії ми розповідаємо під час наших поїздок! Приєднуйтесь!"
    )
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎲 Наступний факт", callback_data="cb_game_quiz")],
            [InlineKeyboardButton(text="🗺 Розклад турів", callback_data="cb_trips")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")

@router.callback_query(F.data == "cb_game_group_info")
async def process_group_games_info(callback: CallbackQuery):
    """Інформація про вікторини та розіграші у групі Telegram"""
    await callback.answer()
    text = (
        "📢 <b>Вікторини та розіграші квитків просто у групі Telegram!</b> 🎟✨\n\n"
        "<b>Чи може бот проводити квізи у групі?</b>\n"
        "👉 <b>ТАК!</b> Наш бот використовує офіційний механізм Telegram Quiz (<code>bot.send_poll(type='quiz')</code>).\n\n"
        "🔥 <b>Як це працює у нашій групі SVOI:</b>\n"
        "1. <b>Квізи раз на 2–3 дні:</b> Бот публікує опитування з 1 правильною відповіддю. При правильному виборі користувач бачить святкове конфеті!\n"
        "2. <b>Розіграші квитків та призів:</b> Бот запускає допис із кнопкою «Взяти участь у розіграші». У призначений час бот автоматично обирає випадкового переможця зі списку учасників!\n"
        "3. <b>Призи:</b> Безкоштовне місце в поїздці, безкоштовний вибір будь-якого місця в авто (+5€) або знижка 15% на наступний тур!\n\n"
        "Долучайтеся до нашої спільноти та не пропускайте активності:"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Перейти до групи мандрівників SVOI", url=settings.GROUP_URL)],
            [InlineKeyboardButton(text="📢 Наш офіційний канал", url=settings.CHANNEL_URL)],
            [InlineKeyboardButton(text="🔙 Назад до ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
