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
    title: 'Белоснежные алебастровые арки над бурлящей Атлантикой',
    clue: '«Природные меловые ворота Porte d\'Aval и острая скала-игла, вдохновлявшие Клода Моне и писателя Мориса Леблана на легенды об Арсене Люпене».',
    options: [
      { label: '🇫🇷 Скалы Этрета (Нормандия, Франция)', isCorrect: true },
      { label: '🇮🇹 Побережье Амальфи (Италия)', isCorrect: false },
      { label: '🇬🇧 Белые скалы Дувра (Англия)', isCorrect: false },
      { label: '🇵🇹 Мыс Рока (Португалия)', isCorrect: false },
    ],
    fact: 'Это подлинные скалы Этрета в Нормандии! Мы посещаем эту локацию в нашем комбинированном туре «Этрета + Париж» (5 часов на скалах + 2–3 часа в Париже).',
    secretGuide: 'Секретный гайд SVOI: Самый потрясающий панорамный вид открывается с тропы у часовни Notre-Dame de la Garde, а свежие нормандские устрицы с лимоном продаются прямо на набережной у рыбаков!'
  },
  {
    id: 'aare',
    image: 'https://images.unsplash.com/photo-1531210157546-0335e7d52ff8?auto=format&fit=crop&w=1200&q=80',
    title: 'Бирюзовое ледниковое ущелье с деревянными мостками',
    clue: '«Глубокий каньон глубиной до 200 метров с ледяной водой нереального лазурного цвета, пробитый рекой сквозь скальный массив за тысячи лет».',
    options: [
      { label: '🇨🇭 Ущелье реки Ааре / Аарешлюхт (Швейцария)', isCorrect: true },
      { label: '🇦🇹 Лихтенштейнкламм (Австрия)', isCorrect: false },
      { label: '🇸🇮 Ущелье Винтгар (Словения)', isCorrect: false },
      { label: '🇩🇪 Бастай (Германия)', isCorrect: false },
    ],
    fact: 'Это знаменитое ущелье Аарешлюхт (Aareschlucht) в Швейцарии! В нашем комбо-туре по Швейцарии мы проводим здесь 2 часа среди отвесных скал и кристальной воды.',
    secretGuide: 'Секретный гайд SVOI: В ущелье всегда прохладно (+12°C даже в жаркий июль). Возьмите легкую кофту, а на выходе в Майрингене обязательно попробуйте швейцарскую меренгу с густыми альпийскими сливками!'
  },
  {
    id: 'lauterbrunnen',
    image: 'https://images.unsplash.com/photo-1573843981267-be1999ff37cd?auto=format&fit=crop&w=1200&q=80',
    title: 'Альпийская долина водопадов и деревянных шале',
    clue: '«Живописная долина 72 водопадов, где 300-метровый водопад Штауббах срывается прямо за крышами старинных деревянных домиков на фоне ледников».',
    options: [
      { label: '🇨🇭 Лаутербруннен (Бернские Альпы, Швейцария)', isCorrect: true },
      { label: '🇦🇹 Гальштат (Австрия)', isCorrect: false },
      { label: '🇮🇹 Доломитовые Альпы (Италия)', isCorrect: false },
      { label: '🇳🇴 Флом (Норвегия)', isCorrect: false },
    ],
    fact: 'Это легендарный Лаутербруннен! В нашем швейцарском туре мы выделяем целых 3 часа, чтобы прогуляться под водопадом и надышаться чистейшим горным воздухом.',
    secretGuide: 'Секретный гайд SVOI: Зайдите на тропу, ведущую прямо за водяную завесу водопада Штауббах — оттуда открывается лучший вид на всю долину и альпийские пики Эйгер, Мёнх и Юнгфрау!'
  },
  {
    id: 'bruges',
    image: 'https://images.unsplash.com/photo-1558642452-9d2a7deb7f62?auto=format&fit=crop&w=1200&q=80',
    title: 'Старинная набережная Роз, каналы и пряничные дома',
    clue: '«Сказочный средневековый город, где мощеные улочки обвивают тихие каналы с белыми лебедями, а в воздухе пахнет шоколадом и горячими вафлями».',
    options: [
      { label: '🇧🇪 Брюгге (Бельгия)', isCorrect: true },
      { label: '🇳🇱 Амстердам (Нидерланды)', isCorrect: false },
      { label: '🇫🇷 Кольмар (Франция)', isCorrect: false },
      { label: '🇩🇪 Ротенбург-об-дер-Таубер (Германия)', isCorrect: false },
    ],
    fact: 'Это всемирно известная набережная Rozenhoedkaai в Брюгге! Наш размеренный тур выходного дня за 110€ позволяет спокойно погулять по городу 6–7 часов.',
    secretGuide: 'Секретный гайд SVOI: В старинной пивоварне De Halve Maan под мостовыми города проложен настоящий подземный пивопровод! А за лучшими шоколадными трюфелями ручной работы загляните в лавку The Chocolate Line.'
  },
  {
    id: 'neuschwanstein',
    image: 'https://images.unsplash.com/photo-1534351590666-13e3e96b5017?auto=format&fit=crop&w=1200&q=80',
    title: 'Белокаменный замок-сказка среди заснеженных баварских пиков',
    clue: '«Романтический рыцарский замок короля Людвига II, послуживший прообразом замка Спящей Красавицы на логотипе студии Walt Disney».',
    options: [
      { label: '🇩🇪 Замок Нойшванштайн (Бавария, Германия)', isCorrect: true },
      { label: '🇦🇹 Замок Хоэнзальцбург (Австрия)', isCorrect: false },
      { label: '🇨🇭 Замок Шильон (Швейцария)', isCorrect: false },
      { label: '🇫🇷 Замок Шамбор (Франция)', isCorrect: false },
    ],
    fact: 'Это замок Нойшванштайн в Баварских Альпах! Мы едем сюда в размеренном туре за 120€ с подъемом на смотровой мост Мариенбрюке и прогулкой у озера Альпзее.',
    secretGuide: 'Секретный гайд SVOI: Лучшие фотографии получаются с подвесного моста Marienbrücke над ущельем Поллат. Обязательно захватите свежий баварский брецель внизу у озера!'
  }
];

const QUIZ_ITEMS = [
  {
    id: 'q1',
    country: '🇨🇭 Швейцария',
    question: 'Правда ли, что в Швейцарии законом запрещено иметь только одну морскую свинку?',
    isTrue: true,
    explanation: 'Это чистая правда! Закон о защите животных признает морских свинок социальными существами, страдающими в одиночестве. Их разрешено заводить только парами.'
  },
  {
    id: 'q2',
    country: '🇫🇷 Франция (Париж & Этрета)',
    question: 'Правда ли, что в скалах Этрета писатель Морис Леблан спрятал сокровища королей Франции?',
    isTrue: true,
    explanation: 'Правда! По сюжету всемирно известного романа об Арсене Люпене, внутри полой скалы-иглы (L\'Aiguille Creuse) в Этрета находилось тайное хранилище сокровищ французской короны.'
  },
  {
    id: 'q3',
    country: '🇱🇮 Лихтенштейн (3 страны за 1 день)',
    question: 'Правда ли, что целое государство Лихтенштейн с княжеским замком однажды можно было арендовать на сутки?',
    isTrue: true,
    explanation: 'Правда! В 2011 году княжество Лихтенштейн запустило акцию: за $70,000 в сутки компания до 150 человек могла символически арендовать всё государство с ключами от города.'
  },
  {
    id: 'q4',
    country: '🇧🇪 Бельгия (Брюгге)',
    question: 'Правда ли, что в Брюгге под средневековыми мостовыми проложен действующий подземный пивопровод?',
    isTrue: true,
    explanation: 'Правда! В 2016 году пивоварня De Halve Maan проложила под землей более 3 километров полиэтиленовых труб, чтобы доставлять до 4000 литров пенного напитка в час прямо на завод розлива без грузовиков!'
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
    { name: 'Елена К.', handle: '@elena_de' },
    { name: 'Михаил В.', handle: '@mike_travel' },
    { name: 'Ольга С.', handle: '@olga_st' },
    { name: 'Дмитрий Р.', handle: '@dima_de' },
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
                Игры & Геймификация в чате
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Актуальные фото маршрутов: Этрета, ущелье Ааре, Лаутербруннен, Брюгге и Нойшванштайн
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
            Правда или Ложь ({QUIZ_ITEMS.length})
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
            Розыгрыши в группе
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
                Локация #{geoIndex + 1} из {GEO_QUESTS.length}
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
                  Кто первый угадает, где сделан этот снимок?
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
                  <span>В точку! Вы выиграли Карту Приоритета!</span>
                </div>

                <p className="text-xs text-slate-300 leading-relaxed">{currentGeo.fact}</p>
                <div className="p-3 bg-black/40 rounded-xl text-xs text-amber-200 border border-amber-500/20 leading-relaxed">
                  {currentGeo.secretGuide}
                </div>

                <div className="p-3 bg-amber-500/10 rounded-xl border border-amber-500/30 flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Бонусный промокод (+5€ к месту):</span>
                    <span className="font-mono text-xs font-bold text-amber-300">PRIORITY-SVOI5</span>
                  </div>
                  <a
                    href="https://t.me/SVOI_travel_admin?text=Здравствуйте! Я отгадал локацию в Гео-Детективе. Мой промокод PRIORITY-SVOI5 на бесплатный выбор места!"
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                  >
                    Активировать
                  </a>
                </div>

                <button
                  onClick={handleNextGeo}
                  className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Следующая загадка
                </button>
              </div>
            )}

            {geoResult === 'wrong' && (
              <div className="p-4 bg-red-950/30 border border-red-500/30 rounded-2xl text-xs text-red-200 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <XCircle className="w-4 h-4 text-red-400" />
                  Не совсем так, но вы были близки!
                </p>
                <p className="text-slate-300">{currentGeo.fact}</p>
                <button
                  onClick={handleNextGeo}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200"
                >
                  Попробовать другую локацию
                </button>
              </div>
            )}

            {/* How to use this in chat */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 sm:p-5 text-xs text-slate-300 space-y-3 shadow-xl">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Flame className="w-4 h-4 text-orange-400" />
                <span>Зачем эта игра вашему клубу?</span>
              </div>
              <p className="text-slate-400 leading-relaxed">
                В Европе люди часто едут в электричках или отдыхают вечерами. Актуальное красивое фото улочки, ущелья или замка с вопросом <b>«Кто первый угадает?»</b> мгновенно поднимает активность в комментариях!
              </p>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
                <div className="font-semibold text-white">Приз без потери денег:</div>
                <div className="text-slate-400 leading-relaxed">
                  • <b>«Карта Приоритета»</b>: бесплатный выбор любого места в минивэне (+5€ ценности).<br />
                  • <b>Секретный гайд</b> по городу в личные сообщения.<br />
                  • Скидка 10% на первую поездку.
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: ПРАВДА ИЛИ ЛОЖЬ */}
      {activeTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                {currentQuiz.country}
              </span>
              <span className="text-xs text-slate-500 font-mono">
                Вопрос #{quizIndex + 1} из {QUIZ_ITEMS.length}
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
                👎 ЛОЖЬ
              </button>
            </div>

            {userQuizAnswer !== null && (
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl space-y-3 animate-fade-in text-xs">
                <div className="flex items-center gap-2">
                  {userQuizAnswer === currentQuiz.isTrue ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1.5 text-sm">
                      <CheckCircle2 className="w-4 h-4" /> Вы абсолютно правы!
                    </span>
                  ) : (
                    <span className="text-amber-400 font-bold flex items-center gap-1.5 text-sm">
                      <Sparkles className="w-4 h-4" /> Удивительный факт, но это так!
                    </span>
                  )}
                </div>
                <p className="text-slate-300 leading-relaxed">{currentQuiz.explanation}</p>

                <div className="pt-2 flex items-center justify-between">
                  <span className="text-slate-500 text-[11px]">Оригинальные факты в поездках SVOI</span>
                  <button
                    onClick={handleNextQuiz}
                    className="px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all"
                  >
                    Следующий факт
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl text-xs space-y-3 text-slate-300">
            <h4 className="font-bold text-white text-sm flex items-center gap-1.5">
              <Share2 className="w-4 h-4 text-blue-400" />
              Как публиковать викторину в группе?
            </h4>
            <p className="text-slate-400 leading-relaxed">
              В Telegram есть встроенный режим опросов <b>«Викторина» (Quiz Poll)</b>:
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono text-[11px] text-blue-300">
              <code>bot.send_poll(</code><br />
              <code>  chat_id='@group',</code><br />
              <code>  question='Правда ли, что...',</code><br />
              <code>  options=['👍 Правда', '👎 Ложь'],</code><br />
              <code>  type='quiz', correct_option_id=0</code><br />
              <code>)</code>
            </div>
            <p className="text-slate-400">
              При правильном ответе у участника прямо в Telegram взрывается праздничное конфетти!
            </p>
          </div>
        </div>
      )}

      {/* TAB 3: РОЗЫГРЫШИ В ГРУППЕ */}
      {activeTab === 'giveaways' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Gift className="w-5 h-5 text-emerald-400" />
                Может ли бот проводить викторины и розыгрыши билетов в группе?
              </h3>
              <p className="text-xs text-emerald-400 font-semibold mt-1">
                👉 ДА! Бот официально поддерживает запуск викторин и автоматический выбор победителей
              </p>
            </div>

            <button
              onClick={runRaffle}
              disabled={isDrawing}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2 disabled:opacity-50"
            >
              <Gift className="w-4 h-4" />
              {isDrawing ? 'Выбор победителя...' : 'Запустить демо-розыгрыш'}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Simulation of Telegram Group Post */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="text-xs font-semibold text-slate-400 flex items-center justify-between">
                <span>Вид поста в группе @SVOI:</span>
                <span className="text-emerald-400 text-[10px]">Кнопка инлайн</span>
              </div>

              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="font-bold text-white">🎟 РОЗЫГРЫШ БЕСПЛАТНОГО МЕСТА НА ТУР В ПАРИЖ!</div>
                <p className="text-slate-300">
                  Друзья! В честь 500 участников клуба SVOI мы разыгрываем бесплатный выбор места (+5€) и скидку 15% на тур!
                </p>
                <div className="text-slate-400 text-[11px]">
                  Участников: <b>{raffleParticipants.length}</b> человек
                </div>

                <div className="pt-2">
                  <button className="w-full py-2 bg-blue-600/30 text-blue-300 border border-blue-500/40 rounded-lg text-xs font-bold text-center">
                    ✅ Я участвую в розыгрыше!
                  </button>
                </div>
              </div>

              {raffleWinner && (
                <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-200 animate-fade-in flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-amber-400 shrink-0" />
                  <div>
                    <span className="font-bold">Победитель определен:</span> {raffleWinner}! Поздравляем!
                  </div>
                </div>
              )}
            </div>

            {/* Step by step logic for production */}
            <div className="space-y-3 text-xs text-slate-300">
              <h4 className="font-bold text-white text-sm">Как бот проводит розыгрыши на сервере:</h4>
              <div className="space-y-2">
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>1. Создание розыгрыша:</b> Бот публикует сообщение с кнопкой <code>callback_data="participate_raffle"</code>.
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>2. Сбор участников:</b> При нажатии бот сохраняет ID и @username нажавшего в список без повторов.
                </div>
                <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800">
                  <b>3. Автоматический выбор:</b> Модуль случайного выбора (<code>random.choice</code>) в назначенное время определяет победителя и публикует пост с отметкой победителя!
                </div>
              </div>

              <div className="pt-2 flex items-center gap-2">
                <a
                  href="https://t.me/+J50liyDUHPgzYTQy"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs flex items-center gap-1.5"
                >
                  <span>Перейти в группу SVOI</span>
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
