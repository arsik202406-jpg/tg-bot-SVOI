import React, { useState } from 'react';
import { 
  Send, Gift, Trophy, HelpCircle, CheckCircle2, 
  AlertCircle, Users, ExternalLink, Sparkles, MessageSquare, 
  Flame, RefreshCw, Compass, Check, Copy, Armchair 
} from 'lucide-react';
import { TRIPS_LIST } from '../data/tripsData';

interface Participant {
  id: number;
  name: string;
  handle: string;
  time: string;
  isSubscribed: boolean;
}

export const ChannelAdminDesk: React.FC = () => {
  // Tab within Channel Admin
  const [activeChannelTab, setActiveChannelTab] = useState<'giveaway' | 'posts' | 'quiz'>('giveaway');

  // Giveaway state
  const [prizeText, setPrizeText] = useState('Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼');
  const [groupTargetInput, setGroupTargetInput] = useState('');
  const [boundGroupTitle, setBoundGroupTitle] = useState('Група SVOI Travel');
  const [publishStatus, setPublishStatus] = useState<{ ok: boolean; msg: string } | null>(null);
  const [isPublishingGroup, setIsPublishingGroup] = useState(false);
  const [isPublishingWinner, setIsPublishingWinner] = useState(false);

  const [participants, setParticipants] = useState<Participant[]>([
    { id: 101, name: 'Олександр М.', handle: '@alex_traveler', time: 'Сьогодні, 10:15', isSubscribed: true },
    { id: 102, name: 'Олена К.', handle: '@elena_voyage', time: 'Сьогодні, 10:42', isSubscribed: true },
    { id: 103, name: 'Михайло В.', handle: '@mike_trip', time: 'Сьогодні, 11:05', isSubscribed: true },
    { id: 104, name: 'Катерина С.', handle: '@katya_de', time: 'Сьогодні, 11:20', isSubscribed: true },
    { id: 105, name: 'Денис П.', handle: '@denis_travel', time: 'Сьогодні, 12:14', isSubscribed: true }
  ]);
  const [winner, setWinner] = useState<Participant | null>(null);
  const [isPickingWinner, setIsPickingWinner] = useState(false);
  const [copiedPost, setCopiedPost] = useState(false);

  // Sync with live backend giveaway state
  React.useEffect(() => {
    fetch('/api/telegram/giveaway/state')
      .then((r) => r.json())
      .then((data) => {
        if (data?.ok) {
          if (data.currentGroupTarget) setGroupTargetInput(data.currentGroupTarget);
          if (data.currentGroupTitle) setBoundGroupTitle(data.currentGroupTitle);
          if (data.giveaway?.prize) setPrizeText(data.giveaway.prize);
          if (Array.isArray(data.giveaway?.participants) && data.giveaway.participants.length > 0) {
            setParticipants(
              data.giveaway.participants.map((p: any, idx: number) => ({
                id: p.user_id || idx + 1,
                name: p.first_name || 'Мандрівник',
                handle: p.username || '@svoi_member',
                time: 'Зареєстровано в боті',
                isSubscribed: true,
              })),
            );
          }
        }
      })
      .catch(() => {});
  }, []);

  // Tour publishing state
  const [selectedTripId, setSelectedTripId] = useState(TRIPS_LIST[0].id);
  const [postPublishedToast, setPostPublishedToast] = useState<string | null>(null);

  // Quiz state
  const [quizQuestion, setQuizQuestion] = useState('У якому місті знаходиться відомий міст закоханих біля Озера Кохання (Minnewater)?');
  const [quizOptions, setQuizOptions] = useState([
    { text: 'Амстердам (Нідерланди) 🚲', isCorrect: false },
    { text: 'Брюгге (Бельгія) 🏰', isCorrect: true },
    { text: 'Страсбург (Франція) 🍷', isCorrect: false }
  ]);
  const [selectedQuizAnswer, setSelectedQuizAnswer] = useState<number | null>(null);

  // Simulated button click by a new channel user
  const handleSimulateJoin = () => {
    const randomId = Math.floor(100000000 + Math.random() * 900000000);
    const demoNames = ['Юлія Р.', 'Андрій Б.', 'Наталія М.', 'Сергій Т.', 'Вікторія Л.'];
    const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
    const randomHandle = `@${randomName.toLowerCase().replace(/[^a-z]/g, '')}_${Math.floor(10 + Math.random() * 89)}`;

    const newParticipant: Participant = {
      id: randomId,
      name: randomName,
      handle: randomHandle,
      time: 'Щойно',
      isSubscribed: true
    };

    setParticipants(prev => [newParticipant, ...prev]);
  };

  const handlePublishGiveawayDirect = async (targetType: 'group' | 'channel') => {
    setIsPublishingGroup(true);
    setPublishStatus(null);
    try {
      const resp = await fetch('/api/telegram/giveaway/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prize: prizeText,
          targetType,
          targetChatId: targetType === 'group' && groupTargetInput.trim() ? groupTargetInput.trim() : undefined,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        setPublishStatus({
          ok: true,
          msg: `✅ Розіграш успішно опубліковано напряму в ${targetType === 'group' ? `ГРУПУ (${data.targetId})` : `КАНАЛ (${data.targetId})`}!`,
        });
      } else {
        setPublishStatus({
          ok: false,
          msg: `⚠️ ${data.error || 'Не вдалося опублікувати. У боті натисніть «🎁 Розіграш туру (В Групу)» -> «👥 Обрати ГРУПУ зі списку Telegram (в 1 клік)».'}`,
        });
      }
    } catch (_e) {
      setPublishStatus({ ok: false, msg: '⚠️ Помилка з’єднання з сервером бота.' });
    } finally {
      setIsPublishingGroup(false);
    }
  };

  const handlePickAndPublishWinnerDirect = async (targetType: 'group' | 'channel' | 'both') => {
    setIsPublishingWinner(true);
    setPublishStatus(null);
    const chosen = winner || participants[Math.floor(Math.random() * participants.length)];
    if (chosen) setWinner(chosen);
    try {
      const resp = await fetch('/api/telegram/giveaway/publish-winner', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetChatId: groupTargetInput.trim() || undefined,
        }),
      });
      const data = await resp.json();
      if (data.ok) {
        if (data.winner) {
          setWinner({
            id: data.winner.user_id || 999,
            name: data.winner.first_name,
            handle: data.winner.username,
            time: 'Переможець',
            isSubscribed: true,
          });
        }
        setPublishStatus({
          ok: true,
          msg: `🏆 Результат розіграшу (${data.winner?.first_name || chosen?.name}) опубліковано напряму!`,
        });
      } else {
        setPublishStatus({
          ok: false,
          msg: `⚠️ ${data.error || 'Спочатку прив’яжіть групу в 1 клік у боті або вкажіть ID групи (-100...).'}`,
        });
      }
    } catch (_e) {
      setPublishStatus({ ok: false, msg: '⚠️ Помилка з’єднання з сервером бота.' });
    } finally {
      setIsPublishingWinner(false);
    }
  };

  const handlePickWinner = () => {
    if (participants.length === 0) return;
    setIsPickingWinner(true);
    setWinner(null);

    setTimeout(() => {
      const luckyOne = participants[Math.floor(Math.random() * participants.length)];
      setWinner(luckyOne);
      setIsPickingWinner(false);
    }, 800);
  };

  const selectedTrip = TRIPS_LIST.find(t => t.id === selectedTripId) || TRIPS_LIST[0];

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans">
      {/* Top Banner */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30">
              <Gift className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-xl font-bold text-white tracking-wide">
                Центр керування Групою, Каналом & Розіграші (/channel)
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Пряма публікація розіграшу та результатів розіграшу в Групу SVOI та Канал в 1 клік
              </p>
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveChannelTab('giveaway')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeChannelTab === 'giveaway'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" />
            <span>🎁 Розіграш у Групу ({participants.length})</span>
          </button>

          <button
            onClick={() => setActiveChannelTab('posts')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeChannelTab === 'posts'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>📢 Пости турів</span>
          </button>

          <button
            onClick={() => setActiveChannelTab('quiz')}
            className={`px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5 ${
              activeChannelTab === 'quiz'
                ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>🧠 Квізи / Вікторини</span>
          </button>
        </div>
      </div>

      {/* ================= TAB 1: GIVEAWAYS ENGINE ================= */}
      {activeChannelTab === 'giveaway' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Post preview in Telegram Group/Channel */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                  <h3 className="text-sm font-bold text-white">
                    Прев'ю публікації розіграшу в Групі та Каналі SVOI Travel
                  </h3>
                </div>
                <span className="text-[11px] text-emerald-400 font-semibold">
                  Бот є адміністратором
                </span>
              </div>

              {/* Telegram Group Post Mockup */}
              <div className="p-4 rounded-2xl bg-[#17212b] border border-slate-700/80 space-y-3.5 shadow-2xl">
                <div className="flex items-center gap-2.5 pb-2 border-b border-slate-700/40">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-indigo-600 flex items-center justify-center font-bold text-xs text-white">
                    SVOI
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">{boundGroupTitle}</span>
                    <span className="text-[10px] text-slate-400">Офіційна група та канал клубу</span>
                  </div>
                </div>

                {/* Post body */}
                <div className="text-xs sm:text-[13px] text-slate-200 leading-relaxed space-y-2">
                  <p className="font-bold text-white text-sm">
                    🎉🔥 ГРАНДІОЗНИЙ РОЗІГРАШ ВІД ТУРИСТИЧНОГО КЛУБУ SVOI! 🌍✨
                  </p>
                  <p>
                    Ми розігруємо неймовірний подарунок серед наших учасників:
                    <br />
                    🎁 <b className="text-amber-300">{prizeText}</b>
                  </p>
                  <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs space-y-1">
                    <p className="font-semibold text-cyan-300">Умови участі прості:</p>
                    <p>1️⃣ Бути учасником нашої групи та каналу SVOI</p>
                    <p>2️⃣ Натиснути кнопку <b>«🎉 Брати участь!»</b> прямо під цим постом</p>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Бот автоматично реєструє ваш Telegram-акаунт у базі учасників. Переможця обере генератор випадкових чисел і опублікує результат прямо в групі!
                  </p>
                </div>

                {/* The Interactive Giveaway Button */}
                <div className="pt-2 space-y-2">
                  <button
                    onClick={handleSimulateJoin}
                    className="w-full py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 active:bg-purple-700 text-white font-extrabold text-xs shadow-lg shadow-purple-600/30 border border-purple-400/50 flex items-center justify-center gap-2 transition-all active:scale-[0.99]"
                  >
                    <span>🎉 Брати участь! ({participants.length})</span>
                    <span className="text-[10px] opacity-75 font-normal">(Клікніть щоб протестувати)</span>
                  </button>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      disabled
                      className="py-1.5 px-3 rounded-xl bg-[#242f3d] text-blue-300 text-[11px] font-medium border border-slate-700/50"
                    >
                      🗺 Розклад турів
                    </button>
                    <button
                      disabled
                      className="py-1.5 px-3 rounded-xl bg-[#242f3d] text-cyan-300 text-[11px] font-medium border border-slate-700/50"
                    >
                      🚀 SVOI Mini App
                    </button>
                  </div>
                </div>
              </div>

              {/* Winner Announcement Card if picked */}
              {winner && (
                <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-purple-950/60 to-slate-900 border-2 border-amber-400 text-xs space-y-2.5 shadow-2xl animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-300 font-extrabold text-sm">
                      <Trophy className="w-5 h-5 text-amber-400" />
                      <span>ОФІЦІЙНИЙ РЕЗУЛЬТАТ РОЗІГРАШУ ДЛЯ ГРУПИ!</span>
                    </div>
                    <button
                      onClick={() => handlePickAndPublishWinnerDirect('group')}
                      disabled={isPublishingWinner}
                      className="px-3 py-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-[11px] shadow-md transition-all"
                    >
                      {isPublishingWinner ? 'Публікація...' : '👥 Опублікувати результат у ГРУПІ'}
                    </button>
                  </div>
                  <p className="text-slate-200 leading-relaxed">
                    🎊🏆 <b>УВАГА! ОФІЦІЙНІ ПІДСУМКИ РОЗІГРАШУ SVOI TRAVEL!</b> 🏆🎊
                    <br /><br />
                    Приз: 🎁 <b>{prizeText}</b>
                    <br />
                    Усього брало участь: <b>{participants.length} учасників</b>
                    <br /><br />
                    Генератор випадкових чисел обрав переможця:
                    <br />
                    🥳 <b>ПЕРЕМОЖЕЦЬ: {winner.name} ({winner.handle})</b>! 🎉🎉🎉
                    <br /><br />
                    Вітаємо! Напишіть організатору @SVOI_travel_admin для отримання сертифікату!
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Controls & Participants List */}
          <div className="lg:col-span-5 space-y-4">
            {/* Prize editor & Direct Group Publishing Actions */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gift className="w-4 h-4 text-purple-400" />
                <span>Пряма публікація розіграшу та результатів у Групу</span>
              </h3>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Приз розіграшу:
                </label>
                <textarea
                  rows={2}
                  value={prizeText}
                  onChange={(e) => setPrizeText(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none focus:border-purple-500"
                  placeholder="Вкажіть приз..."
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 block">
                  Цільова Група (ID <code>-100...</code> або <code>@username</code>, якщо вже прив'язана в боті — підтягується автоматично):
                </label>
                <input
                  type="text"
                  value={groupTargetInput}
                  onChange={(e) => setGroupTargetInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-cyan-300 font-mono outline-none focus:border-cyan-500"
                  placeholder="Напр. -100219837465 або прив'яжіть у боті в 1 клік"
                />
              </div>

              {publishStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold border ${
                    publishStatus.ok
                      ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                      : 'bg-amber-950/60 border-amber-500/50 text-amber-200'
                  }`}
                >
                  {publishStatus.msg}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={() => handlePublishGiveawayDirect('group')}
                  disabled={isPublishingGroup}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-xs shadow-lg shadow-purple-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isPublishingGroup ? 'Публікація в групу...' : '👥 1. Опублікувати РОЗІГРАШ у ГРУПІ напряму'}</span>
                </button>

                <button
                  onClick={() => handlePickAndPublishWinnerDirect('group')}
                  disabled={isPublishingWinner}
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
                >
                  <Trophy className="w-4 h-4 text-slate-950" />
                  <span>{isPublishingWinner ? 'Публікація результату...' : '🏆 2. Обрати переможця та опублікувати РЕЗУЛЬТАТ у ГРУПІ'}</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handlePickWinner}
                    disabled={isPickingWinner || participants.length === 0}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>🎲 Тест вибору переможця</span>
                  </button>

                  <button
                    onClick={handleSimulateJoin}
                    className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    <span>+1 Учасник (Тест)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Live Participants List */}
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-cyan-400" />
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                    Учасники в базі ({participants.length})
                  </h4>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Підписка перевірена
                </span>
              </div>

              <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                {participants.map((p, idx) => {
                  const isCurrentWinner = winner?.id === p.id;
                  return (
                    <div
                      key={p.id}
                      className={`p-2 rounded-xl text-xs flex items-center justify-between border transition-all ${
                        isCurrentWinner
                          ? 'bg-amber-500/20 border-amber-400 text-white shadow-md'
                          : 'bg-slate-950/70 border-slate-800/80 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-slate-500">#{idx + 1}</span>
                        <div>
                          <span className="font-bold text-white block">{p.name}</span>
                          <span className="text-[10px] text-cyan-400 font-mono">{p.handle}</span>
                        </div>
                      </div>

                      {isCurrentWinner ? (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 flex items-center gap-1">
                          👑 Переможець
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-500">{p.time}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 2: POSTS WITH BOOKING BUTTON ================= */}
      {activeChannelTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Send className="w-4 h-4 text-cyan-400" />
                <span>Генератор посту для каналу з кнопкою «Забронювати»</span>
              </h3>
            </div>

            {/* Post Card Preview */}
            <div className="rounded-2xl overflow-hidden bg-[#17212b] border border-slate-700/80 shadow-2xl">
              <div className="h-52 w-full overflow-hidden relative">
                <img
                  src={selectedTrip.image}
                  alt={selectedTrip.title}
                  className="w-full h-full object-cover"
                />
                <span className="absolute top-3 right-3 px-3 py-1 rounded-xl bg-emerald-600 text-xs font-black text-white shadow-lg border border-emerald-400/40">
                  {selectedTrip.price}€
                </span>
              </div>

              <div className="p-4 space-y-3 text-xs sm:text-[13px] leading-relaxed text-slate-200">
                <h4 className="font-bold text-white text-base">
                  🌟 Ексклюзивний виїзд: {selectedTrip.title}! 🌍✨
                </h4>
                <p>
                  💰 <b>Ціна: {selectedTrip.price}€</b> | Тривалість: <b>{selectedTrip.duration}</b>
                  <br />
                  🚐 Комфортний трансфер Opel Vivaro (дводіапазонний клімат, відкидні крісла, USB)
                  <br />
                  📍 Адресний збір: Саарланд, Трір, Люксембург (Door-to-Door)!
                </p>

                <div className="space-y-1">
                  <p className="font-semibold text-cyan-300">У програмі поїздки:</p>
                  {selectedTrip.highlights.map((h, i) => (
                    <p key={i}>• {h}</p>
                  ))}
                </div>

                <p className="text-[11px] text-slate-400">
                  {selectedTrip.description}
                </p>

                {/* Post Buttons */}
                <div className="pt-2 space-y-2">
                  <a
                    href="https://t.me/Svoi_TravelEU_bot"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-cyan-600/30"
                  >
                    <span>💺 Забронювати поїздку в боті</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <a
                      href="https://t.me/Svoi_TravelEU_bot"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-[#242f3d] hover:bg-[#2e3b4d] text-cyan-300 text-center font-medium"
                    >
                      🚀 Відкрити Mini App
                    </a>
                    <a
                      href="https://t.me/SVOI_travel_admin"
                      target="_blank"
                      rel="noreferrer"
                      className="py-1.5 px-3 rounded-xl bg-[#242f3d] hover:bg-[#2e3b4d] text-emerald-300 text-center font-medium"
                    >
                      💬 Написати менеджеру
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Select Trip dropdown */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-white">Оберіть напрямок для публікації:</h3>
            <div className="space-y-1.5 max-h-[500px] overflow-y-auto pr-1">
              {TRIPS_LIST.map((trip) => {
                const isSelected = selectedTripId === trip.id;
                return (
                  <button
                    key={trip.id}
                    onClick={() => setSelectedTripId(trip.id)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs font-medium transition-all flex items-center justify-between border ${
                      isSelected
                        ? 'bg-cyan-500/20 text-cyan-200 border-cyan-400 shadow-sm'
                        : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border-slate-800'
                    }`}
                  >
                    <span className="truncate pr-2">{trip.shortTitle}</span>
                    <span className="font-bold text-emerald-400 shrink-0">{trip.price}€</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ================= TAB 3: TELEGRAM QUIZ ENGINE ================= */}
      {activeChannelTab === 'quiz' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                <span>Офіційна вікторина (Quiz) з кнопкою бронювання</span>
              </h3>
            </div>

            {/* Telegram Quiz Mockup */}
            <div className="p-5 rounded-2xl bg-[#17212b] border border-slate-700/80 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
                <span>🧠 Вікторина • Анонімне опитування</span>
              </div>

              <h4 className="text-sm font-bold text-white">
                {quizQuestion}
              </h4>

              {/* Quiz Answer Options */}
              <div className="space-y-2">
                {quizOptions.map((opt, idx) => {
                  const isChosen = selectedQuizAnswer === idx;
                  return (
                    <button
                      key={idx}
                      onClick={() => setSelectedQuizAnswer(idx)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition-all border flex items-center justify-between ${
                        isChosen
                          ? opt.isCorrect
                            ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_12px_rgba(52,211,153,0.3)]'
                            : 'bg-red-950/60 border-red-400 text-red-200'
                          : 'bg-[#242f3d] hover:bg-[#2c394a] text-slate-200 border-slate-700'
                      }`}
                    >
                      <span>{opt.text}</span>
                      {isChosen && (
                        <span>{opt.isCorrect ? '🎉 Правильно!' : '❌ Невірно'}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Direct Booking Button attached to the quiz */}
              <div className="pt-3 border-t border-slate-700/60 space-y-2">
                <a
                  href="https://t.me/Svoi_TravelEU_bot"
                  target="_blank"
                  rel="noreferrer"
                  className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30"
                >
                  <Armchair className="w-4 h-4" />
                  <span>💺 Забронювати поїздку до Брюгге (110€)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quiz description info */}
          <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-3 text-xs leading-relaxed">
            <h3 className="text-sm font-bold text-white">Як працює квіз у каналі:</h3>
            <p className="text-slate-300">
              Бот викликає нативний метод Telegram Bot API <code>bot.send_poll(type='quiz')</code>. Коли підписник обирає правильну відповідь, Telegram автоматично запускає анімацію конфетті на екрані його смартфона!
            </p>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="font-bold text-cyan-300 block">Пряма конверсія в заявку:</span>
              <p className="text-slate-400">
                Одразу під питанням прикріплюється кнопка швидкого бронювання туру в те місто, про яке йшлося у питанні.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
