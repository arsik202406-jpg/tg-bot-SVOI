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

# 1. База локацій для гри «Гео-Детектив» (6 напрямків)
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
        "fact": "Це знамениті скелі <b>Етрета</b> в Нормандії! Ми відвідуємо цю локацію в турі «Етрета + Париж» (140€).",
        "secret_guide": "🎁 <b>Секретний гайд по Етрета:</b> Найкращий вид на захід сонця відкривається зі стежки біля каплиці Notre-Dame de la Garde, а найсвіжіші устриці подають прямо внизу біля човнових доків!"
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
        "fact": "Це чарівна <b>ущелина річки Ааре</b> в Бернських Альпах! Ми відвідуємо її в турі «Ааре + Лаутербруннен + Берн» (120€).",
        "secret_guide": "🎁 <b>Секретний гайд:</b> В ущелині завжди приємна прохолода (+12°C). Не забудьте легку вітрівку! А в містечку Майрінген поруч винайшли знаменитий десерт безе (меренгу)."
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
        "secret_guide": "🎁 <b>Секретний гайд:</b> Скуштуйте бельгійське пиво 'Brugse Zot' в історичній броварні De Halve Maan — під містом прокладено справжній підземний пивопровід завдовжки 3,2 км!"
    },
    {
        "id": "neuschwanstein",
        "question": "🕵️ <b>Гео-Детектив #4: Який замок став емблемою студії Волта Діснея?</b>\n\n"
                    "«Білосніжний палац баварського короля-мрійника Людвіга II, що височіє на скелі над альпійським озером Альпзее та підвісним мостом Марієнбрюке».",
        "options": [
            ("🇩🇪 Замок Нойшванштайн (Баварія)", True),
            ("🇫🇷 Замок Шамбор (Долина Луари)", False),
            ("🇨🇭 Шийонський замок (Женевське озеро)", False),
            ("🇦🇹 Фортеця Гоензальцбург (Австрія)", False),
        ],
        "fact": "Це казковий <b>Замок Нойшванштайн</b> у Баварських Альпах! Наш одноденний тур туди коштує 120€.",
        "secret_guide": "🎁 <b>Секретний гайд:</b> Найкращий кадр замку робиться з мосту Марієнбрюке зранку, а після прогулянки обов'язково спустіться до кришталевого озера Альпзее!"
    },
    {
        "id": "como",
        "question": "🕵️ <b>Гео-Детектив #5: Де знімали «Зоряні війни» та «Казино Рояль»?</b>\n\n"
                    "«Глибоке альпійське озеро у формі перевернутої літери Y, оточене розкішними італійськими віллами, кипарисами та засніженими вершинами».",
        "options": [
            ("🇮🇹 Озеро Комо (Белладжо та Варенна)", True),
            ("🇮🇹 Озеро Гарда (Сірміоне)", False),
            ("🇨🇭 Озеро Лугано (Швейцарія)", False),
            ("🇦🇹 Озеро Гальштат (Австрія)", False),
        ],
        "fact": "Це аристократичне <b>Озеро Комо</b> в Італії! Ми вирушаємо туди у дводенний тур «Мілан + Озеро Комо + Лугано» (260€).",
        "secret_guide": "🎁 <b>Секретний гайд:</b> Обов'язково пропливіть на кораблику між містечками Варенна та Белладжо та скуштуйте фісташкове джелато на набережній!"
    },
    {
        "id": "colmar",
        "question": "🕵️ <b>Гео-Детектив #6: Яке містечко надихнуло Міядзакі на аніме «Мандрівний замок Хаула»?</b>\n\n"
                    "«Різнокольорові фахверкові будиночки з геранню на вікнах, канали кварталу Маленька Венеція та лелеки на дахах».",
        "options": [
            ("🇫🇷 Кольмар та Страсбург (Ельзас)", True),
            ("🇩🇪 Ротенбург-об-дер-Таубер", False),
            ("🇧🇪 Гент (Бельгія)", False),
            ("🇱🇺 Віанден (Люксембург)", False),
        ],
        "fact": "Це казковий <b>Ельзас (Кольмар та Страсбург)</b>! Наш найближчий та найбюджетніший тур вихідного дня — всього 80€.",
        "secret_guide": "🎁 <b>Секретний гайд:</b> Обов'язково спробуйте гарячий ельзаський пиріг Тарт Фламбе з печі та келих білого вина Gewürztraminer!"
    }
]

# 2. Квіз: Правда чи Неправда (6 фактів)
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
        "explanation": "<b>Це ПРАВДА!</b> 🏰 У 2011 році князівство Ліхтенштейн спільно з Airbnb запустило акцію: за $70,000 на добу компанія до 150 осіб могла 'орендувати країну' та дегустувати вино в погребі правлячого князя!"
    },
    {
        "id": "q4",
        "question": "🧠 <b>Правда чи Неправда #4 (Люксембург):</b>\n\n"
                    "Чи правда, що в усьому герцогстві Люксембург проїзд у потягах, трамваях та автобусах є абсолютно безкоштовним для всіх (навіть для туристів)?",
        "answer": True,
        "explanation": "<b>Це ПРАВДА!</b> 🇱🇺 З 2020 року Люксембург став першою країною у світі, де весь громадський транспорт (окрім 1-го класу в потягах) став на 100% безкоштовним!"
    },
    {
        "id": "q5",
        "question": "🧠 <b>Правда чи Неправда #5 (Амстердам, Нідерланди):</b>\n\n"
                    "Чи правда, що в Амстердамі кількість мостів менша, ніж у Венеції?",
        "answer": False,
        "explanation": "<b>Це НЕПРАВДА!</b> 🚲 В Амстердамі налічується понад <b>1 280 мостів</b> — це втричі більше, ніж у Венеції (де їх близько 400)! А ще в Амстердамі більше велосипедів, ніж жителів."
    },
    {
        "id": "q6",
        "question": "🧠 <b>Правда чи Неправда #6 (Шамоні — Монблан):</b>\n\n"
                    "Чи правда, що на вершину Егюій-дю-Міді (3842 м) біля Монблану можна піднятися без альпіністського спорядження всього за 20 хвилин?",
        "answer": True,
        "explanation": "<b>Це ПРАВДА!</b> 🏔 Найвища канатна дорога Європи піднімає туристів із центру Шамоні (1035 м) на висоту 3842 м за 20 хвилин прямо до скляної кабіни «Крок у порожнечу»!"
    }
]

# 3. Гастро-Квіз «Смаки Європи»
GASTRO_QUESTS = [
    {
        "id": "g1",
        "question": "🍽 <b>Гастро-Квіз #1: Звідки походить страва «Тарт Фламбе» (Flammkuchen)?</b>\n\n"
                    "Тонке хрустке тісто з дров'яної печі, змащене вершковим крем-фрешем, цибулею та копченим беконом.",
        "options": [
            ("🇫🇷 Ельзас (Страсбург та Кольмар)", True),
            ("🇮🇹 Ломбардія (Мілан)", False),
            ("🇧🇪 Фландрія (Брюгге)", False)
        ],
        "fact": "Це головний кулінарний символ <b>Ельзасу (Страсбург та Кольмар)</b>! У нашому турі ви дізнаєтеся, де його готують за старовинним рецептом."
    },
    {
        "id": "g2",
        "question": "🍽 <b>Гастро-Квіз #2: У якій країні подають легендарний бутерброд Broodje Haring з малосольним оселедцем та огірком?</b>",
        "options": [
            ("🇳🇱 Нідерланди (Амстердам, Заансе-Сханс)", True),
            ("🇩🇪 Баварія (Німеччина)", False),
            ("🇫🇷 Лазурове узбережжя (Ніцца)", False)
        ],
        "fact": "Це <b>Нідерланди</b>! В Амстердамі та біля вітряків Заансе-Сханс оселедець їдять просто на набережних у спеціальних кіосках Vishandel."
    },
    {
        "id": "g3",
        "question": "🍽 <b>Гастро-Квіз #3: Яке місто славиться гарячими гофрованими вафлями з полуницею та розтопленим праліне прямо біля каналів?</b>",
        "options": [
            ("🇧🇪 Брюгге та Брюссель (Бельгія)", True),
            ("🇨🇭 Цюрих (Швейцарія)", False),
            ("🇦🇹 Зальцбург (Австрія)", False)
        ],
        "fact": "Звісно, це <b>Бельгія (Брюгге)</b>! Аромат свіжоспечених льєзьких та брюссельських вафель веде мандрівників через усе середньовічне місто."
    }
]

# 4. Гра «Інтуїція Мандрівника: Цифри та рекорди»
PRICE_QUESTS = [
    {
        "id": "p1",
        "question": "💶 <b>Інтуїція Мандрівника #1:</b>\n\n"
                    "Скільки водоспадів спадає зі скель в одній лише швейцарській долині <b>Лаутербруннен</b>, яку ми відвідуємо в турі?",
        "options": [
            ("🌊 Рівно 72 водоспади", True),
            ("🌊 Близько 12 водоспадів", False),
            ("🌊 Понад 300 водоспадів", False)
        ],
        "fact": "У долині Лаутербруннен спадає <b>72 водоспади</b>, включно зі знаменитим Штауббахським водоспадом заввишки майже 300 метрів!"
    },
    {
        "id": "p2",
        "question": "💶 <b>Інтуїція Мандрівника #2:</b>\n\n"
                    "Який розмір передоплати потрібен у клубі <b>SVOI Travel</b> для бронювання будь-якого одноденного туру (Париж, Амстердам, Брюгге, Швейцарія)?",
        "options": [
            ("💚 0€ (Працюємо БЕЗ передоплати!)", True),
            ("💵 50% від вартості", False),
            ("💵 100% наперед", False)
        ],
        "fact": "Ми довіряємо нашим туристам! На всі одноденні поїздки діє <b>0% передоплати</b> — ви сплачуєте вже при посадці в мінівен Opel Vivaro."
    },
    {
        "id": "p3",
        "question": "💶 <b>Інтуїція Мандрівника #3:</b>\n\n"
                    "Скільки країн ми проїжджаємо та відвідуємо за 1 день у нашому альпійському комбо-турі до князівства <b>Ліхтенштейн</b>?",
        "options": [
            ("🌍 Одразу 3 країни + Німеччина на старті!", True),
            ("🌍 Лише 1 країну", False),
            ("🌍 2 країни", False)
        ],
        "fact": "За один день ви бачите <b>Швейцарію, Князівство Ліхтенштейн та Австрію (Брегенц на Боденському озері)</b>!"
    }
]


@router.callback_query(F.data == "cb_games")
async def process_games_main(callback: CallbackQuery):
    """Головний екран розділу ігор та вікторин (6 ігор)"""
    await callback.answer()
    text = (
        "🎮 <b>Ігровий клуб та вікторини SVOI Travel (6 інтерактивних ігор)</b> 🏆\n\n"
        "Відпочивайте з користю, перевіряйте свої знання про Європу та вигравайте приємні бонуси для поїздок!\n\n"
        "✨ <b>Оберіть гру або вікторину:</b>\n"
        "• 🕵️ <b>«Гео-Детектив» (6 локацій):</b> вгадайте місце за описом і виграйте безкоштовний вибір крісла (+5€)!\n"
        "• 🧠 <b>«Правда чи Неправда» (6 фактів):</b> неймовірні закони та рекорди Європи.\n"
        "• 🍽 <b>Гастро-Квіз «Смаки Європи»:</b> кулінарна подорож нашими маршрутами.\n"
        "• 💶 <b>«Інтуїція Мандрівника»:</b> вгадайте цифри, висоти та рекорди.\n"
        "• 🎒 <b>Тест «Ідеальний тур»:</b> підбір поїздки за вашим настроєм за 10 секунд.\n"
        "• 🎰 <b>Колесо Фортуни SVOI:</b> випробуйте удачу та заберіть миттєвий приз!\n\n"
        "👇 <i>Натискайте на гру нижче:</i>"
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
    buttons.append([InlineKeyboardButton(text="🔙 До списку ігор", callback_data="cb_games")])
    
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
            f"Дає право <b>безкоштовно обрати будь-яке місце в мінівені (економія 5€)</b>!\n"
            f"<i>Надішліть промокод менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} при бронюванні.</i>"
        )
    else:
        text = (
            "Ой, майже вгадали! 🔍\n\n"
            f"Правильна відповідь: {quest['fact']}\n\n"
            f"{quest['secret_guide']}"
        )
    
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🔄 Наступна загадка Гео-Детектива", callback_data="cb_game_geo")],
            [InlineKeyboardButton(text="🗺 Переглянути розклад турів", callback_data="cb_trips")],
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
    
    result_title = "🎉 <b>У яблучко! Ви абсолютно праві!</b>" if correct else "😮 <b>Несподіваний поворот!</b>"
    text = (
        f"{result_title}\n\n"
        f"{q['explanation']}\n\n"
        f"Ще більше цікавих історій ми розповідаємо під час наших поїздок!"
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


@router.callback_query(F.data == "cb_game_gastro")
async def process_gastro_start(callback: CallbackQuery):
    """Старт Гастро-Квізу"""
    await callback.answer()
    g = random.choice(GASTRO_QUESTS)
    buttons = []
    for opt_title, is_correct in g["options"]:
        buttons.append([InlineKeyboardButton(text=opt_title, callback_data=f"cb_gastrocheck_{g['id']}_{1 if is_correct else 0}")])
    buttons.append([InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")])
    if callback.message:
        await callback.message.edit_text(
            text=f"{g['question']}\n\n<i>Оберіть регіон:</i>",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            parse_mode="HTML"
        )


@router.callback_query(F.data.startswith("cb_gastrocheck_"))
async def process_gastro_check(callback: CallbackQuery):
    await callback.answer()
    parts = callback.data.split("_")
    g_id = parts[2]
    is_correct = parts[3] == "1"
    g = next((item for item in GASTRO_QUESTS if item["id"] == g_id), GASTRO_QUESTS[0])
    header = "🍽 <b>Смачно і правильно! Ви справжній гурман!</b> 🎉" if is_correct else "🥐 <b>Цікава гастро-знахідка:</b>"
    text = f"{header}\n\n{g['fact']}\n\n🎁 Бонус: у кожному турі ми ділимося точками на карті, де їдять місцеві жителі без туристичних націнок!"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🍽 Ще одне гастро-питання", callback_data="cb_game_gastro")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "cb_game_price")
async def process_price_start(callback: CallbackQuery):
    """Старт гри Інтуїція Мандрівника"""
    await callback.answer()
    p = random.choice(PRICE_QUESTS)
    buttons = []
    for opt_title, is_correct in p["options"]:
        buttons.append([InlineKeyboardButton(text=opt_title, callback_data=f"cb_pricecheck_{p['id']}_{1 if is_correct else 0}")])
    buttons.append([InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")])
    if callback.message:
        await callback.message.edit_text(
            text=p["question"],
            reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
            parse_mode="HTML"
        )


@router.callback_query(F.data.startswith("cb_pricecheck_"))
async def process_price_check(callback: CallbackQuery):
    await callback.answer()
    parts = callback.data.split("_")
    p_id = parts[2]
    is_correct = parts[3] == "1"
    p = next((item for item in PRICE_QUESTS if item["id"] == p_id), PRICE_QUESTS[0])
    header = "🎯 <b>Точно в ціль! Ваша інтуїція на висоті!</b>" if is_correct else "📊 <b>Правильна відповідь:</b>"
    text = f"{header}\n\n{p['fact']}"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💶 Наступне питання інтуїції", callback_data="cb_game_price")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "cb_game_match")
async def process_match_start(callback: CallbackQuery):
    """Тест: Який тур SVOI ідеальний для тебе?"""
    await callback.answer()
    text = (
        "🎒 <b>Тест: Який ідеальний тур SVOI підходить саме вам?</b> ✨\n\n"
        "Оберіть, який формат вихідного дня приносить вам найбільше задоволення:"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🏔 Гори, водоспади та альпійська природа", callback_data="cb_match_alps")],
            [InlineKeyboardButton(text="🥐 Романтика, світові столиці та круїзи", callback_data="cb_match_romance")],
            [InlineKeyboardButton(text="🏰 Середньовічні замки, шоколад та затишок", callback_data="cb_match_castles")],
            [InlineKeyboardButton(text="🌊 Море, пальми та релакс на 2–3 дні", callback_data="cb_match_sea")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data.startswith("cb_match_"))
async def process_match_result(callback: CallbackQuery):
    await callback.answer()
    style = callback.data.replace("cb_match_", "")
    results = {
        "alps": (
            "🏔 <b>Ваш ідеальний вибір: Швейцарські Альпи або Монблан!</b>\n\n"
            "Рекомендуємо:\n"
            "1️⃣ <b>Ущелина Ааре + Лаутербруннен + Берн (120€)</b> — долина 72 водоспадів та каньйон.\n"
            "2️⃣ <b>Шамоні — Монблан на 2 дні (260€)</b> — крижані печери та вершина 3842 м!"
        ),
        "romance": (
            "🥐 <b>Ваш ідеальний вибір: Париж або Етрета + Париж!</b>\n\n"
            "Рекомендуємо:\n"
            "1️⃣ <b>Париж: Версаль + круїз на яхті по Сені (120€)</b>\n"
            "2️⃣ <b>Скелі Етрета над океаном + вечірній Париж (140€)</b>"
        ),
        "castles": (
            "🏰 <b>Ваш ідеальний вибір: Брюгге, Ельзас або Нойшванштайн!</b>\n\n"
            "Рекомендуємо:\n"
            "1️⃣ <b>Казковий Брюгге, Бельгія (110€)</b> — канали з лебедями та бельгійський шоколад.\n"
            "2️⃣ <b>Ельзас + Страсбург (80€)</b> — пряникові будиночки.\n"
            "3️⃣ <b>Замок Нойшванштайн, Баварія (120€)</b>."
        ),
        "sea": (
            "🌊 <b>Ваш ідеальний вибір: Італія або Лазурове узбережжя!</b>\n\n"
            "Рекомендуємо:\n"
            "1️⃣ <b>Озеро Комо + Мілан + Лугано на 2 дні (260€)</b>\n"
            "2️⃣ <b>Лазурове узбережжя: Монако, Ніцца, Канни на 3 дні (440€)</b>"
        )
    }
    text = results.get(style, results["alps"]) + "\n\n🎁 <b>Бонус за проходження тесту:</b> безкоштовна фіксація улюбленого місця в салоні за промокодом <code>MATCH-SVOI</code>!"
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💺 Забронювати місце в турі", callback_data="cb_book")],
            [InlineKeyboardButton(text="🔄 Пройти тест ще раз", callback_data="cb_game_match")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "cb_game_wheel")
async def process_wheel_spin(callback: CallbackQuery):
    """Колесо Фортуни SVOI"""
    await callback.answer("🎰 Крутимо Колесо Фортуни SVOI...")
    prizes = [
        ("💺 Безкоштовний вибір будь-якого місця в 1-му або 2-му ряду (економія 5€)", "WHEEL-SEAT5"),
        ("☕ Кава та круасан на панорамній зупинці в подарунок від клубу", "WHEEL-COFFEE"),
        ("💎 Знижка -10€ на будь-який дво- або триденний тур (Комо, Шамоні, Ніцца)", "WHEEL-10EUR"),
        ("🌟 VIP-статус «Пріоритетна посадка» + місце біля панорамного вікна", "WHEEL-VIP")
    ]
    prize_desc, code = random.choice(prizes)
    text = (
        "🎰 <b>КОЛЕСО ФОРТУНИ SVOI ЗУПИНИЛОСЯ!</b> ✨🎉\n\n"
        f"🎁 <b>Ваш виграш:</b>\n{prize_desc}!\n\n"
        f"🔑 Ваш персональний промокод: <code>{code}</code>\n"
        f"<i>Просто вкажіть цей код менеджеру @{settings.MANAGER_USERNAME.lstrip('@')} під час бронювання поїздки!</i>"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="🎰 Крутити ще раз", callback_data="cb_game_wheel")],
            [InlineKeyboardButton(text="💺 Використати бонус і забронювати", callback_data="cb_book")],
            [InlineKeyboardButton(text="🔙 Меню ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")


@router.callback_query(F.data == "cb_game_group_info")
async def process_group_games_info(callback: CallbackQuery):
    """Інформація про вікторини та розіграші у групі та каналі Telegram"""
    await callback.answer()
    text = (
        "📢 <b>Вікторини та розіграші квитків у каналі та групі SVOI!</b> 🎟✨\n\n"
        "🔥 <b>Як працюють наші розіграші:</b>\n"
        "1. <b>Інтерактивні квізи з конфетті:</b> Бот публікує офіційні Telegram Quiz опитування у каналі та групі.\n"
        "2. <b>Розіграші безкоштовних місць:</b> Натискайте кнопку «🎉 Брати участь!» під постом у каналі — бот автоматично перевіряє підписку та обирає переможця!\n\n"
        "Долучайтеся до нашої спільноти:"
    )
    kb = InlineKeyboardMarkup(
        inline_keyboard=[
            [InlineKeyboardButton(text="💬 Група мандрівників SVOI", url=settings.GROUP_URL)],
            [InlineKeyboardButton(text="📢 Офіційний канал SVOI", url=settings.CHANNEL_URL)],
            [InlineKeyboardButton(text="🔙 Назад до ігор", callback_data="cb_games")]
        ]
    )
    if callback.message:
        await callback.message.edit_text(text=text, reply_markup=kb, parse_mode="HTML")
