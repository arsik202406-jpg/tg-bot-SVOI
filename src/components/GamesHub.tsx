import React, { useState } from 'react';
import { 
  Compass, Sparkles, Trophy, HelpCircle, CheckCircle2, 
  XCircle, Send, Gift, Flame, Share2, ExternalLink, RefreshCw,
  BarChart3, Vote, Award, Utensils, Mountain, Zap, Check
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

interface TravelPoll {
  id: string;
  category: string;
  question: string;
  totalVotes: number;
  isAnonymous: boolean;
  options: {
    id: string;
    label: string;
    votes: number;
    badge?: string;
  }[];
}

interface InteractiveTriviaItem {
  id: string;
  category: 'gastro' | 'records' | 'routes';
  categoryLabel: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  rewardPoints: number;
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
  },
  {
    id: 'q5',
    country: '🇱🇺 Люксембург',
    question: 'Чи правда, що в усьому Люксембурзі проїзд у потягах, трамваях і автобусах на 100% безкоштовний навіть для туристів?',
    isTrue: true,
    explanation: 'Правда! Люксембург став першою країною у світі, яка скасувала оплату за громадський транспорт по всій території країни.'
  }
];

const INITIAL_TRAVEL_POLLS: TravelPoll[] = [
  {
    id: 'poll-weekend-dest',
    category: '🗺 Голосування за маршрут вікенду',
    question: 'Куди б ви найбільше хотіли вирушити з клубом SVOI у найближчі вихідні?',
    totalVotes: 148,
    isAnonymous: false,
    options: [
      { id: 'opt-1', label: '🇨🇭 Швейцарія: Лаутербруннен + ущелина Ааре (120€)', votes: 54, badge: '🔥 Лідер' },
      { id: 'opt-2', label: '🇫🇷 Скелі Етрета над Атлантикою + Париж (140€)', votes: 41 },
      { id: 'opt-3', label: '🇧🇪 Середньовічний Брюгге: канали та шоколад (110€)', votes: 32 },
      { id: 'opt-4', label: '🇮🇹 Озеро Комо + Мілан + Лугано на 2 дні (260€)', votes: 21 }
    ]
  },
  {
    id: 'poll-travel-style',
    category: '🚐 Комфорт та формат поїздки',
    question: 'Що для вас є найважливішим під час поїздки вихідного дня Європою?',
    totalVotes: 112,
    isAnonymous: false,
    options: [
      { id: 'st-1', label: '🏡 Адресний збір Door-to-Door прямо від дому', votes: 49, badge: 'Топ вибір' },
      { id: 'st-2', label: '👥 Маленька група до 8 осіб у комфортному Opel Vivaro', votes: 35 },
      { id: 'st-3', label: '💳 Бронювання з 0% передоплати (оплата при посадці)', votes: 18 },
      { id: 'st-4', label: '📸 Вільний час без біганини за прапорцем гіда', votes: 10 }
    ]
  },
  {
    id: 'poll-gastro',
    category: '🍽 Гастрономічне опитування',
    question: 'Який кулінарний спеціалітет ви обов’язково куштуєте в наших поїздках?',
    totalVotes: 96,
    isAnonymous: true,
    options: [
      { id: 'ga-1', label: '🧇 Гарячі бельгійські вафлі з полуницею у Брюгге', votes: 38 },
      { id: 'ga-2', label: '🦪 Свіжі нормандські устриці на березі в Етрета', votes: 26 },
      { id: 'ga-3', label: '🍕 Ельзаський пиріг Тарт Фламбе з печі у Страсбурзі', votes: 20 },
      { id: 'ga-4', label: '🧀 Швейцарське сирне фондю з видом на Альпи', votes: 12 }
    ]
  }
];

const INTERACTIVE_TRIVIA: InteractiveTriviaItem[] = [
  {
    id: 'tr-1',
    category: 'gastro',
    categoryLabel: '🍽 Гастро-Європа',
    question: 'З якого французького регіону походить хрусткий пиріг «Тарт Фламбе» (Flammkuchen) з вершковим крем-фрешем, цибулею та беконом?',
    options: [
      '🇫🇷 Ельзас (Страсбург та Кольмар)',
      '🇫🇷 Прованс (Ніцца та Канни)',
      '🇫🇷 Нормандія (Руан та Етрета)',
      '🇧🇪 Фландрія (Брюгге та Гент)'
    ],
    correctIndex: 0,
    explanation: 'Тарт Фламбе — кулінарна візитівка Ельзасу! У нашому турі до Страсбурга та Кольмара (80€) ми показуємо автентичні заклади Winstub, де його випікають у дров’яній печі.',
    rewardPoints: 25
  },
  {
    id: 'tr-2',
    category: 'records',
    categoryLabel: '🏔 Альпійські рекорди',
    question: 'Скільки водоспадів спадає зі скель у знаменитій швейцарській долині Лаутербруннен, яку ми відвідуємо в турі?',
    options: [
      '🌊 Рівно 72 водоспади',
      '🌊 15 водоспадів',
      '🌊 105 водоспадів',
      '🌊 32 водоспади'
    ],
    correctIndex: 0,
    explanation: 'Долина Лаутербруннен офіційно відома як «Долина 72 водоспадів», а найвищий із них — Штауббах — падає з висоти майже 300 метрів!',
    rewardPoints: 25
  },
  {
    id: 'tr-3',
    category: 'routes',
    categoryLabel: '🌍 3 країни за 1 день',
    question: 'Які 3 країни (окрім Німеччини на старті) ми відвідуємо за 1 день у нашому альпійському комбо-турі до Вадуца?',
    options: [
      '🇨🇭 Швейцарія + 🇱🇮 Ліхтенштейн + 🇦🇹 Австрія',
      '🇫🇷 Франція + 🇧🇪 Бельгія + 🇳🇱 Нідерланди',
      '🇮🇹 Італія + 🇨🇭 Швейцарія + 🇫🇷 Франція',
      '🇱🇺 Люксембург + 🇧🇪 Бельгія + 🇫🇷 Франція'
    ],
    correctIndex: 0,
    explanation: 'У турі «Ліхтенштейн: 3 країни за 1 день» (120€) ми гуляємо столицею Ліхтенштейну Вадуцом, швейцарськими Альпами та австрійським Брегенцом на Боденському озері!',
    rewardPoints: 25
  },
  {
    id: 'tr-4',
    category: 'records',
    categoryLabel: '🚠 Вершини Європи',
    question: 'На яку висоту піднімає канатна дорога Егюій-дю-Міді в нашому турі «Шамоні — Монблан» всього за 20 хвилин?',
    options: [
      '🏔 3 842 метри над рівнем моря',
      '🏔 1 950 метрів над рівнем моря',
      '🏔 2 500 метрів над рівнем моря',
      '🏔 4 810 метрів над рівнем моря'
    ],
    correctIndex: 0,
    explanation: 'Вершина Егюій-дю-Міді розташована на висоті 3 842 м! Там знаходиться знаменитий скляний куб «Крок у порожнечу» прямо навпроти піку Монблан.',
    rewardPoints: 25
  },
  {
    id: 'tr-5',
    category: 'gastro',
    categoryLabel: '🇳🇱 Смаки Голландії',
    question: 'Як називається традиційний голландський десерт із двох тонких вафель, з’єднаних гарячим карамельним сиропом?',
    options: [
      '🍪 Стропвафлі (Stroopwafel)',
      '🥐 Круасан із мигдалем',
      '🥨 Баварський брецель',
      '🍰 Шварцвальдський торт'
    ],
    correctIndex: 0,
    explanation: 'Гарячі стропвафлі (Stroopwafels) печуть просто перед вами на ринках Амстердама та в селі вітряків Заансе-Сханс!',
    rewardPoints: 25
  }
];

export const GamesHub: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'polls' | 'geo' | 'quiz' | 'giveaways'>('polls');

  // Interactive Polls & Multi-Quiz State
  const [polls, setPolls] = useState<TravelPoll[]>(INITIAL_TRAVEL_POLLS);
  const [votedPolls, setVotedPolls] = useState<Record<string, string>>({});
  const [triviaIndex, setTriviaIndex] = useState(0);
  const [selectedTriviaOption, setSelectedTriviaOption] = useState<number | null>(null);
  const [triviaScore, setTriviaScore] = useState(0);
  const [answeredTriviaIds, setAnsweredTriviaIds] = useState<Record<string, boolean>>({});
  const [triviaCategoryFilter, setTriviaCategoryFilter] = useState<'all' | 'gastro' | 'records' | 'routes'>('all');
  const [pollToast, setPollToast] = useState<string | null>(null);

  // Geo-Detective State
  const [geoIndex, setGeoIndex] = useState(0);
  const [selectedGeoOption, setSelectedGeoOption] = useState<number | null>(null);
  const [geoResult, setGeoResult] = useState<'correct' | 'wrong' | null>(null);

  // True/False Quiz State
  const [quizIndex, setQuizIndex] = useState(0);
  const [userQuizAnswer, setUserQuizAnswer] = useState<boolean | null>(null);

  // Group Giveaway Simulator
  const [raffleParticipants] = useState([
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

  const filteredTrivia = INTERACTIVE_TRIVIA.filter(
    (item) => triviaCategoryFilter === 'all' || item.category === triviaCategoryFilter
  );
  const currentTrivia = filteredTrivia[triviaIndex % filteredTrivia.length] || INTERACTIVE_TRIVIA[0];

  const triggerToast = (msg: string) => {
    setPollToast(msg);
    setTimeout(() => setPollToast(null), 3200);
  };

  const handleVotePoll = (pollId: string, optionId: string) => {
    if (votedPolls[pollId]) return;
    setVotedPolls((prev) => ({ ...prev, [pollId]: optionId }));
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          totalVotes: p.totalVotes + 1,
          options: p.options.map((o) => (o.id === optionId ? { ...o, votes: o.votes + 1 } : o))
        };
      })
    );
    triggerToast('✅ Ваш голос враховано в опитуванні мандрівників SVOI!');
  };

  const handleResetPollVote = (pollId: string) => {
    const chosenOptionId = votedPolls[pollId];
    if (!chosenOptionId) return;
    const nextVoted = { ...votedPolls };
    delete nextVoted[pollId];
    setVotedPolls(nextVoted);
    setPolls((prev) =>
      prev.map((p) => {
        if (p.id !== pollId) return p;
        return {
          ...p,
          totalVotes: Math.max(1, p.totalVotes - 1),
          options: p.options.map((o) =>
            o.id === chosenOptionId ? { ...o, votes: Math.max(0, o.votes - 1) } : o
          )
        };
      })
    );
  };

  const handleSelectTriviaAnswer = (optionIdx: number) => {
    if (selectedTriviaOption !== null) return;
    setSelectedTriviaOption(optionIdx);
    const isCorrect = optionIdx === currentTrivia.correctIndex;
    if (isCorrect && !answeredTriviaIds[currentTrivia.id]) {
      setTriviaScore((prev) => prev + currentTrivia.rewardPoints);
      setAnsweredTriviaIds((prev) => ({ ...prev, [currentTrivia.id]: true }));
      triggerToast(`🎉 Правильно! +${currentTrivia.rewardPoints} балів до вашого рейтингу мандрівника!`);
    }
  };

  const handleNextTrivia = () => {
    setSelectedTriviaOption(null);
    setTriviaIndex((prev) => (prev + 1) % filteredTrivia.length);
  };

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
      {/* Toast Notification */}
      {pollToast && (
        <div className="fixed bottom-5 right-5 z-50 px-4 py-3 rounded-2xl bg-slate-900/95 border border-cyan-400/50 text-cyan-200 text-xs font-bold shadow-[0_0_25px_rgba(34,211,238,0.3)] flex items-center gap-2 animate-fade-in">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>{pollToast}</span>
        </div>
      )}

      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-bold text-white tracking-wide">
                  Ігри, Вікторини та Опитування в Telegram-боті
                </h2>
                <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 text-[11px] font-bold">
                  Бали гравця: {triviaScore} XP
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Інтерактивні вікторини з конфеті, живі опитування про маршрути, Гео-Детектив та розіграші місць
              </p>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1.5 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('polls')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeTab === 'polls'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            Вікторини & Опитування ({INTERACTIVE_TRIVIA.length + polls.length})
          </button>

          <button
            onClick={() => setActiveTab('geo')}
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
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
            className={`px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1.5 ${
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

      {/* ================= TAB 0: ВІКТОРИНИ ТА ОПИТУВАННЯ ПРО ПОДОРОЖІ (NEW) ================= */}
      {activeTab === 'polls' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Multi-Option Travel Trivia Quiz */}
          <div className="lg:col-span-7 space-y-5">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    <Award className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Інтерактивна бліц-вікторина мандрівника
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Відповідайте на запитання про Європу та заробляйте бали на знижку й безкоштовний вибір місця
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="px-3 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-extrabold flex items-center gap-1">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    <span>{triviaScore} XP</span>
                  </span>
                </div>
              </div>

              {/* Category Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                {[
                  { id: 'all', label: '🌍 Усі теми (5)' },
                  { id: 'gastro', label: '🍽 Гастро-Європа' },
                  { id: 'records', label: '🏔 Альпійські рекорди' },
                  { id: 'routes', label: '🚐 Маршрути SVOI' }
                ].map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => {
                      setTriviaCategoryFilter(cat.id as any);
                      setTriviaIndex(0);
                      setSelectedTriviaOption(null);
                    }}
                    className={`px-3 py-1 rounded-xl font-medium transition-all border ${
                      triviaCategoryFilter === cat.id
                        ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>

              {/* Active Trivia Question Card */}
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-4">
                <div className="flex items-center justify-between text-xs">
                  <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                    {currentTrivia.categoryLabel}
                  </span>
                  <span className="text-slate-500 font-mono">
                    Питання #{(triviaIndex % filteredTrivia.length) + 1} із {filteredTrivia.length} • +{currentTrivia.rewardPoints} XP
                  </span>
                </div>

                <h4 className="text-sm sm:text-base font-bold text-white leading-relaxed">
                  {currentTrivia.question}
                </h4>

                <div className="space-y-2">
                  {currentTrivia.options.map((optText, idx) => {
                    const isPicked = selectedTriviaOption === idx;
                    const isRight = idx === currentTrivia.correctIndex;
                    let optionClass =
                      'bg-slate-900/90 hover:bg-slate-800 border-slate-800 text-slate-200 hover:border-cyan-500/40';
                    if (selectedTriviaOption !== null) {
                      if (isRight) {
                        optionClass =
                          'bg-emerald-950/80 border-emerald-400 text-emerald-200 font-bold shadow-[0_0_15px_rgba(52,211,153,0.25)]';
                      } else if (isPicked) {
                        optionClass = 'bg-rose-950/80 border-rose-500 text-rose-200';
                      } else {
                        optionClass = 'opacity-45 bg-slate-900/40 border-slate-800 text-slate-500';
                      }
                    }

                    return (
                      <button
                        key={idx}
                        disabled={selectedTriviaOption !== null}
                        onClick={() => handleSelectTriviaAnswer(idx)}
                        className={`w-full p-3 rounded-xl border text-xs sm:text-sm text-left transition-all flex items-center justify-between gap-2 ${optionClass}`}
                      >
                        <span>{optText}</span>
                        {selectedTriviaOption !== null && isRight && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        )}
                        {selectedTriviaOption !== null && isPicked && !isRight && (
                          <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation & Next Button */}
                {selectedTriviaOption !== null && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-cyan-500/30 space-y-2.5 animate-fade-in text-xs">
                    <div className="flex items-center justify-between">
                      <span
                        className={`font-bold flex items-center gap-1.5 ${
                          selectedTriviaOption === currentTrivia.correctIndex
                            ? 'text-emerald-400'
                            : 'text-amber-300'
                        }`}
                      >
                        {selectedTriviaOption === currentTrivia.correctIndex
                          ? '🎉 Правильна відповідь! Конфеті у вашому чаті!'
                          : '💡 Цікавий факт про цю локацію:'}
                      </span>
                      <span className="text-[10px] font-mono text-cyan-300">
                        Telegram Quiz Mode
                      </span>
                    </div>
                    <p className="text-slate-300 leading-relaxed">{currentTrivia.explanation}</p>
                    <div className="pt-1 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400">
                        Промокод активності: <code className="text-amber-300 font-bold">QUIZ-SVOI5</code>
                      </span>
                      <button
                        onClick={handleNextTrivia}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Наступне питання</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Reward Progress Bar */}
              <div className="p-3.5 rounded-xl bg-gradient-to-r from-cyan-950/50 via-slate-950 to-indigo-950/50 border border-cyan-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-1 flex-1 w-full">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400" />
                      <span>Прогрес до VIP-бонусу мандрівника:</span>
                    </span>
                    <span className="font-mono text-amber-300 font-bold">
                      {Math.min(triviaScore, 50)} / 50 XP
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.min(100, (triviaScore / 50) * 100)}%` }}
                    />
                  </div>
                </div>
                <a
                  href="https://t.me/SVOI_travel_admin?text=Вітаю! Я пройшов вікторину мандрівника SVOI та отримав промокод QUIZ-SVOI5 на безкоштовний вибір місця!"
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 transition-all"
                >
                  Забрати бонус (+5€ місце)
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Live Interactive Travel Polls */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="p-2 rounded-xl bg-purple-500/15 text-purple-300 border border-purple-500/30">
                    <BarChart3 className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-white">
                      Опитування спільноти про подорожі
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Голосуйте за напрямки — бачите миттєвий розподіл голосів як у Telegram Polls
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                {polls.map((poll) => {
                  const userVotedOptionId = votedPolls[poll.id];
                  return (
                    <div
                      key={poll.id}
                      className="p-4 rounded-2xl bg-slate-950/90 border border-slate-800/90 space-y-3"
                    >
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-purple-300">{poll.category}</span>
                        <span className="text-slate-500">
                          {poll.isAnonymous ? 'Анонімне опитування' : 'Публічне опитування'} • {poll.totalVotes} голосів
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-white leading-snug">
                        {poll.question}
                      </h4>

                      <div className="space-y-2">
                        {poll.options.map((opt) => {
                          const percent =
                            poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
                          const isChosen = userVotedOptionId === opt.id;

                          return (
                            <button
                              key={opt.id}
                              type="button"
                              onClick={() => handleVotePoll(poll.id, opt.id)}
                              className={`w-full p-2.5 rounded-xl border text-left transition-all relative overflow-hidden ${
                                userVotedOptionId
                                  ? isChosen
                                    ? 'bg-slate-900 border-cyan-400/70 text-white'
                                    : 'bg-slate-900/50 border-slate-800/80 text-slate-300'
                                  : 'bg-slate-900 hover:bg-slate-800/90 border-slate-800 hover:border-purple-400/50 text-slate-200'
                              }`}
                            >
                              {userVotedOptionId && (
                                <div
                                  className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                                    isChosen ? 'bg-cyan-500/20' : 'bg-purple-500/10'
                                  }`}
                                  style={{ width: `${percent}%` }}
                                />
                              )}

                              <div className="relative flex items-center justify-between gap-2 text-xs">
                                <span className="font-medium flex items-center gap-1.5">
                                  {isChosen && <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                                  <span>{opt.label}</span>
                                  {opt.badge && (
                                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold">
                                      {opt.badge}
                                    </span>
                                  )}
                                </span>
                                {userVotedOptionId && (
                                  <span className="font-mono font-bold text-cyan-300 shrink-0">
                                    {percent}% ({opt.votes})
                                  </span>
                                )}
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500">
                        <span>
                          {userVotedOptionId
                            ? '✓ Ви проголосували'
                            : 'Натисніть на варіант, щоб проголосувати'}
                        </span>
                        {userVotedOptionId && (
                          <button
                            type="button"
                            onClick={() => handleResetPollVote(poll.id)}
                            className="text-cyan-400 hover:underline"
                          >
                            Переголосувати
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

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
