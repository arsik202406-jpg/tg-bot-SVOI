import React, { useState } from 'react';
import { 
  Compass, Sparkles, Trophy, HelpCircle, CheckCircle2, 
  XCircle, Send, Gift, Flame, Share2, ExternalLink, RefreshCw 
} from 'lucide-react';

interface GeoQuest {
  id: string;
  image: string;
  title: string;
  clue: string;
  options: { label: string; isCorrect: boolean }[];
  fact: string;
  secretGuide: string;
}

const GEO_QUESTS: GeoQuest[] = [
  {
    id: 'etretat',
    image: 'https://images.unsplash.com/photo-1589802829985-817e51171b92?auto=format&fit=crop&w=1200&q=80',
    title: 'Білосніжні алебастрові арки над бурхливою Атлантикою',
    clue: '«Природні крейдяні ворота Porte d\'Aval та гостра скеля-голка, що надихали Клода Моне та письменника Моріса Леблана на легенди про Арсена Люпена».',
    options: [
      { label: '🇫🇷 Скелі Етрета (Нормандія, Франція)', isCorrect: true },
      { label: '🇮🇹 Узбережжя Амальфі (Італія)', isCorrect: false },
      { label: '🇬🇧 Білі скелі Дувра (Англія)', isCorrect: false },
      { label: '🇵🇹 Мис Рока (Португалія)', isCorrect: false },
    ],
    fact: 'Це знамениті скелі Етрета в Нормандії! Ми відвідуємо цю локацію в нашому комбінованому турі «Етрета + Париж» (5 годин на скелях + 2–3 години в Парижі).',
    secretGuide: 'Секретний гайд SVOI: Найбільш приголомшливий панорамний вид відкривається зі стежки біля каплиці Notre-Dame de la Garde, а свіжі нормандські устриці з лимоном продаються прямо на набережній біля рибалок всього від 1.5€!'
  },
  {
    id: 'aare',
    image: 'https://images.unsplash.com/photo-1531210157546-0335e7d52ff8?auto=format&fit=crop&w=1200&q=80',
    title: 'Бірюзова льодовикова ущелина з дерев\'яними містками',
    clue: '«Глибокий каньйон завглибшки до 200 метрів з крижаною водою неймовірного лазурового кольору, пробитий річкою крізь скельний масив за тисячоліття».',
    options: [
      { label: '🇨🇭 Ущелина річки Ааре / Аарешлюхт (Швейцарія)', isCorrect: true },
      { label: '🇦🇹 Ліхтенштайнкламм (Австрія)', isCorrect: false },
      { label: '🇸🇮 Ущелина Вінтгар (Словенія)', isCorrect: false },
      { label: '🇩🇪 Бастай (Німеччина)', isCorrect: false },
    ],
    fact: 'Це знаменита ущелина Аарешлюхт (Aareschlucht) у Швейцарії! У нашому комбо-турі по Швейцарії ми проводимо тут 2 години серед прямовисних скель та кришталевої води.',
    secretGuide: 'Секретний гайд SVOI: В ущелині завжди приємна прохолода (+12°C навіть у спеку). Візьміть легку вітрівку, а на виході в Майрінгені обов\'язково скуштуйте швейцарську меренгу з густими альпійськими вершками!'
  },
  {
    id: 'lauterbrunnen',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80',
    title: 'Альпійська долина водоспадів та дерев\'яних шале',
    clue: '«Мальовнича долина 72 водоспадів, де 300-метровий водоспад Штауббах зривається просто за дахами старовинних дерев\'яних будиночків на тлі льодовиків».',
    options: [
      { label: '🇨🇭 Лаутербруннен (Бернські Альпи, Швейцарія)', isCorrect: true },
      { label: '🇦🇹 Гальштат (Австрія)', isCorrect: false },
      { label: '🇮🇹 Доломітові Альпи (Італія)', isCorrect: false },
      { label: '🇳🇴 Флом (Норвегія)', isCorrect: false },
    ],
    fact: 'Це легендарний Лаутербруннен! У нашому швейцарському турі ми виділяємо 3 години, щоб прогулятися під водоспадом та подихати найчистішим гірським повітрям.',
    secretGuide: 'Секретний гайд SVOI: Пройдіть стежкою просто за водяну завісу водоспаду Штауббах — звідти відкривається найкращий вид на всю долину та піки Ейгер, Менх та Юнгфрау!'
  },
  {
    id: 'bruges',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80',
    title: 'Старовинна набережна Троянд, канали та пряникові будинки',
    clue: '«Казкове середньовічне місто, де бруковані вулички обвивають тихі канали з білими лебедями, а в повітрі пахне шоколадом і гарячими вафлями».',
    options: [
      { label: '🇧🇪 Брюгге (Бельгія)', isCorrect: true },
      { label: '🇳🇱 Амстердам (Нідерланди)', isCorrect: false },
      { label: '🇫🇷 Кольмар (Франція)', isCorrect: false },
      { label: '🇩🇪 Ротенбург-об-дер-Таубер (Німеччина)', isCorrect: false },
    ],
    fact: 'Це всесвітньо відома набережна Rozenhoedkaai у Брюгге! Наш розмірений тур вихідного дня за 110€ дозволяє спокійно погуляти містом 6–7 годин.',
    secretGuide: 'Секретний гайд SVOI: У старовинній броварні De Halve Maan під бруківкою міста прокладено справжній підземний пивопровід завдовжки 3 км! А за найкращими шоколадними трюфелями ручної роботи завітайте до крамниці The Chocolate Line.'
  },
  {
    id: 'neuschwanstein',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80',
    title: 'Білокам\'яний замок-казка серед засніжених баварських піків',
    clue: '«Романтичний лицарський замок короля Людвіга II, що послужив прообразом замку Сплячої Красуні на логотипі кіностудії Walt Disney».',
    options: [
      { label: '🇩🇪 Замок Нойшванштайн (Баварія, Німеччина)', isCorrect: true },
      { label: '🇦🇹 Замок Хоензальцбург (Австрія)', isCorrect: false },
      { label: '🇨🇭 Замок Шильйон (Швейцарія)', isCorrect: false },
      { label: '🇫🇷 Замок Шамбор (Франція)', isCorrect: false },
    ],
    fact: 'Це замок Нойшванштайн у Баварських Альпах! Ми їдемо сюди в розміреному турі за 120€ з підйомом на оглядовий міст Марієнбрюке та прогулянкою біля озера Альпзее.',
    secretGuide: 'Секретний гайд SVOI: Найкращі фотографії виходять із підвісного моста Marienbrücke над ущелиною Поллат. Обов\'язково скуштуйте свіжий баварський брецель внизу біля озера!'
  }
];

const QUIZ_ITEMS = [
  {
    id: 'q1',
    country: '🇨🇭 Швейцарія',
    question: 'Чи правда, що у Швейцарії законом заборонено володіти лише однією морською свинкою?',
    isTrue: true,
    explanation: 'Це чиста правда! Закон про захист тварин визнає морських свинок соціальними істотами, які страждають від самотності. Їх дозволено тримати лише парами.'
  },
  {
    id: 'q2',
    country: '🇫🇷 Франція (Париж & Етрета)',
    question: 'Чи правда, що у скелях Етрета письменник Моріс Леблан сховав скарби королів Франції?',
    isTrue: true,
    explanation: 'Правда! За сюжетом всесвітньо відомого роману про Арсена Люпена, всередині порожнистої скелі-голки (L\'Aiguille Creuse) в Етрета знаходилася таємна схованка скарбів французької корони.'
  },
  {
    id: 'q3',
    country: '🇱🇮 Ліхтенштейн (3 країни за 1 день)',
    question: 'Чи правда, що всю державу Ліхтенштейн із княжим замком одного разу можна було орендувати на добу?',
    isTrue: true,
    explanation: 'Правда! У 2011 році князівство Ліхтенштейн запустило акцію: за $70,000 на добу компанія до 150 осіб могла символічно орендувати всю державу з ключами від міста та дегустацією вин.'
  },
  {
    id: 'q4',
    country: '🇧🇪 Бельгія (Брюгге)',
    question: 'Чи правда, що у Брюгге під середньовічною бруківкою прокладено діючий підземний пивопровід?',
    isTrue: true,
    explanation: 'Правда! У 2016 році броварня De Halve Maan проклала під землею понад 3 кілометри поліетиленових труб, щоб доставляти до 4000 літрів пінного напою на годину просто на завод розливу без вантажівок!'
  }
];

export const GamesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'geo' | 'quiz' | 'giveaways'>('geo');

  // Geo-Detective State
  const [geoIndex, setGeoIndex] = useState(0);
  const [selectedGeoOption, setSelectedGeoOption] = useState<number | null>(null);
  const [geoResult, setGeoResult] = useState<'correct' | 'wrong' | null>(null);

  // Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [userQuizAnswer, setUserQuizAnswer] = useState<boolean | null>(null);

  // Group Giveaway Simulator
  const [raffleParticipants, setRaffleParticipants] = useState([
    { name: 'Олена К.', handle: '@elena_de' },
    { name: 'Михайло В.', handle: '@mike_travel' },
    { name: 'Ольга С.', handle: '@olga_st' },
    { name: 'Дмитро Р.', handle: '@dima_de' },
    { name: 'Анна М.', handle: '@anna_travel' },
  ]);
  const [raffleWinner, setRaffleWinner] = useState<string | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  const currentGeo = GEO_QUESTS[geoIndex];
  const currentQuiz = QUIZ_ITEMS[quizIndex];

  const handleGeoAnswer = (idx: number, isCorrect: boolean) => {
    setSelectedGeoOption(idx);
    setGeoResult(isCorrect ? 'correct' : 'wrong');
  };

  const handleNextGeo = () => {
    setSelectedGeoOption(null);
    setGeoResult(null);
    setGeoIndex((prev) => (prev + 1) % GEO_QUESTS.length);
  };

  const handleQuizAnswer = (answer: boolean) => {
    setUserQuizAnswer(answer);
  };

  const handleNextQuiz = () => {
    setUserQuizAnswer(null);
    setQuizIndex((prev) => (prev + 1) % QUIZ_ITEMS.length);
  };

  const runRaffle = () => {
    setIsDrawing(true);
    setRaffleWinner(null);
    setTimeout(() => {
      const winner = raffleParticipants[Math.floor(Math.random() * raffleParticipants.length)];
      setRaffleWinner(`${winner.name} (${winner.handle})`);
      setIsDrawing(false);
    }, 1200);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Ігри & Гейміфікація в чаті
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Актуальні фото маршрутів: Етрета, ущелина Ааре, Лаутербруннен, Брюгге та Нойшванштайн
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('geo')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'geo'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            Гео-Детектив ({GEO_QUESTS.length})
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'quiz'
                ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            Правда чи Неправда ({QUIZ_ITEMS.length})
          </button>

          <button
            onClick={() => setActiveTab('giveaways')}
            className={`px-3.5 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
              activeTab === 'giveaways'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            Розіграші в групі
          </button>
        </div>
      </div>

      {/* TAB 1: ГЕО-ДЕТЕКТИВ */}
      {activeTab === 'geo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Photo & Clue */}
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl flex flex-col">
            <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-950">
              <img
                src={currentGeo.image}
                alt={currentGeo.title}
                className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5" />
                Локація #{geoIndex + 1} з {GEO_QUESTS.length}
              </div>

              {/* Quick Carousel Thumbnails */}
              <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg border border-white/10">
                {GEO_QUESTS.map((q, idx) => (
                  <button
                    key={q.id}
                    onClick={() => {
                      setGeoIndex(idx);
                      setSelectedGeoOption(null);
                      setGeoResult(null);
                    }}
                    className={`w-2.5 h-2.5 rounded-full transition-all ${
                      idx === geoIndex ? 'bg-amber-400 scale-125' : 'bg-white/40 hover:bg-white/80'
                    }`}
                    title={q.title}
                  />
                ))}
              </div>
            </div>

            <div className="p-5 space-y-3">
              <h3 className="text-base font-bold text-white">{currentGeo.title}</h3>
              <p className="text-xs text-slate-300 italic bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 leading-relaxed">
                {currentGeo.clue}
              </p>

              <div className="pt-2">
                <div className="text-xs font-semibold text-slate-400 mb-2">
                  Хто перший вгадає, де зроблено цей знімок?
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentGeo.options.map((opt, idx) => {
                    const isSelected = selectedGeoOption === idx;
                    let btnStyle = 'bg-slate-950 hover:bg-slate-850 border-slate-800 text-slate-200';
                    if (selectedGeoOption !== null) {
                      if (opt.isCorrect) btnStyle = 'bg-emerald-950/80 border-emerald-500 text-emerald-300 font-bold';
                      else if (isSelected) btnStyle = 'bg-red-950/80 border-red-500 text-red-300';
                      else btnStyle = 'opacity-40 bg-slate-950 border-slate-800 text-slate-500';
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedGeoOption !== null}
                        onClick={() => handleGeoAnswer(idx, opt.isCorrect)}
                        className={`p-3 rounded-xl text-xs font-medium border text-left transition-all ${btnStyle}`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Prizes & Strategy */}
          <div className="lg:col-span-5 space-y-4">
            {/* Success Reward Card */}
            {geoResult === 'correct' && (
              <div className="p-5 bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-950 border border-amber-500/40 rounded-2xl space-y-3 shadow-xl animate-fade-in">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <Trophy className="w-5 h-5 text-amber-400" />
                  <span>У яблучко! Ви виграли Картку Пріоритету!</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{currentGeo.fact}</p>
                <div className="p-3 bg-black/40 rounded-xl text-xs text-amber-200 border border-amber-500/20 leading-relaxed">
                  {currentGeo.secretGuide}
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Бонусний промокод (+5€ до вибору місця):</span>
                    <span className="font-mono text-xs font-bold text-amber-300">PRIORITY-SVOI5</span>
                  </div>
                  <a
                    href="https://t.me/SVOI_travel_admin?text=Вітаю! Я відгадав локацію в Гео-Детективі. Мій промокод PRIORITY-SVOI5 на безкоштовний вибір місця!"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                  >
                    Активувати
                  </a>
                </div>

                <button
                  onClick={handleNextGeo}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Наступна загадка
                </button>
              </div>
            )}

            {geoResult === 'wrong' && (
              <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl text-xs text-red-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Не зовсім так, але ви були дуже близькі!
                </p>
                <p className="text-slate-300">{currentGeo.fact}</p>
                <button
                  onClick={handleNextGeo}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  Спробувати іншу локацію
                </button>
              </div>
            )}

            {/* How to use this in chat */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Навіщо ця гра вашому клубу?</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                У Європі люди часто їдуть в електричках або відпочивають вечорами. Красиве фото затишної вулички, каньйону або замку із запитанням <b>«Хто перший вгадає?»</b> миттєво підіймає активність у коментарях!
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-semibold text-white">Приз без фінансових втрат:</div>
                <div className="text-slate-400 leading-relaxed">
                  • <b>«Картка Пріоритету»</b>: безкоштовний вибір будь-якого місця в авто (+5€ цінності).<br />
                  • <b>Секретний гайд</b> містом в особисті повідомлення.<br />
                  • Знижка 10% на першу поїздку.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ПРАВДА ЧИ НЕПРАВДА */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {currentQuiz.country}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Запитання #{quizIndex + 1} з {QUIZ_ITEMS.length}
              </span>
            </div>

            <div className="text-lg font-bold text-white leading-relaxed">
              {currentQuiz.question}
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                disabled={userQuizAnswer !== null}
                onClick={() => handleQuizAnswer(true)}
                className={`py-3.5 px-4 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                  userQuizAnswer !== null
                    ? currentQuiz.isTrue
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'opacity-40 bg-slate-950 border-slate-800 text-slate-500'
                    : 'bg-slate-950 hover:bg-slate-850 border-slate-700 text-white'
                }`}
              >
                👍 ПРАВДА
              </button>

              <button
                disabled={userQuizAnswer !== null}
                onClick={() => handleQuizAnswer(false)}
                className={`py-3.5 px-4 rounded-xl text-sm font-bold border transition-all flex items-center justify-center gap-2 ${
                  userQuizAnswer !== null
                    ? !currentQuiz.isTrue
                      ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                      : 'opacity-40 bg-slate-950 border-slate-800 text-slate-500'
                    : 'bg-slate-950 hover:bg-slate-850 border-slate-700 text-white'
                }`}
              >
                👎 НЕПРАВДА
              </button>
            </div>

            {userQuizAnswer !== null && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in text-xs">
                <div className="flex items-center gap-2">
                  {userQuizAnswer === currentQuiz.isTrue ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Ви абсолютно праві!
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-sm">
                      <Sparkles className="w-4 h-4" /> Дивовижний факт, але це так!
                    </span>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed">{currentQuiz.explanation}</p>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Оригінальні факти в поїздках SVOI</span>
                  <button
                    onClick={handleNextQuiz}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                  >
                    Наступний факт
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs space-y-3 text-slate-300">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-blue-400" />
              Як публікувати вікторину в групі?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              У Telegram є вбудований режим опитувань <b>«Вікторина» (Quiz Poll)</b>:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px] text-blue-300">
              <code>bot.send_poll(</code><br />
              <code>  chat_id='@group',</code><br />
              <code>  question='Чи правда, що...',</code><br />
              <code>  options=['👍 Правда', '👎 Неправда'],</code><br />
              <code>  type='quiz', correct_option_id=0</code><br />
              <code>)</code>
            </div>
            <p className="text-slate-400">
              При правильній відповіді у підписника прямо в Telegram вибухає святкове конфеті!
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: РОЗІГРАШІ В ГРУПІ */}
      {activeTab === 'giveaways' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                Чи може бот проводити вікторини та розіграші квитків у групі?
              </h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                👉 ТАК! Бот офіційно підтримує запуск вікторин та автоматичний вибір переможців
              </p>
            </div>

            <button
              onClick={runRaffle}
              disabled={isDrawing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              <Gift className="w-4 h-4" />
              {isDrawing ? 'Вибір переможця...' : 'Запустити демо-розіграш'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Simulation of Telegram Group Post */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Вигляд допису в групі @SVOI:</span>
                <span className="text-emerald-400 text-[10px]">Кнопка інлайн</span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-white">🎟 РОЗІГРАШ БЕЗКОШТОВНОГО МІСЦЯ НА ТУР ДО ПАРИЖА!</div>
                <p className="text-slate-300">
                  Друзі! На честь 500 учасників клубу SVOI ми розігруємо безкоштовний вибір місця (+5€) та знижку 15% на тур!
                </p>
                <div className="text-slate-400 text-[11px]">
                  Учасників: <b>{raffleParticipants.length}</b> осіб
                </div>

                <div className="pt-2">
                  <button className="w-full py-2 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold text-center">
                    ✅ Я беру участь у розіграші!
                  </button>
                </div>
              </div>

              {raffleWinner && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 animate-fade-in flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Переможця визначено:</span> {raffleWinner}! Вітаємо!
                  </div>
                </div>
              )}
            </div>

            {/* Step by step logic for production */}
            <div className="space-y-3 text-xs text-slate-300">
              <h4 className="font-bold text-white text-sm">Як бот проводить розіграші на сервері:</h4>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>1. Створення розіграшу:</b> Бот публікує повідомлення з кнопкою <code>callback_data="participate_raffle"</code>.
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>2. Збір учасників:</b> При натисканні бот зберігає ID та @username користувача у список без повторів.
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>3. Автоматичний вибір:</b> Модуль випадкового вибору (<code>random.choice</code>) у призначений час визначає переможця та публікує допис із відміткою переможця!
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href="https://t.me/+J50liyDUHPgzYTQy"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  <span>Перейти до групи SVOI</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
