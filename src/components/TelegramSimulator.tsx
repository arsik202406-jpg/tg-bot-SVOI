import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, RefreshCw, Smartphone, Monitor, ExternalLink, 
  Check, CheckCheck, Sparkles, MapPin, Bus, ShieldAlert,
  Compass, UserCheck, MessageSquareHeart, ChevronLeft, ArrowRight,
  Palette, Info, Gift, Trophy 
} from 'lucide-react';
import { TRIPS_LIST, MEETING_STOPS } from '../data/tripsData';
import { SimMessage, InlineBtn, LeadItem } from '../types';
import { SvoiMiniApp } from './SvoiMiniApp';

export type ButtonBorderStyle = 'neon' | 'subtle' | 'classic';

interface TelegramSimulatorProps {
  onNewLead: (lead: LeadItem) => void;
  onOpenCarModal?: () => void;
  leads?: LeadItem[];
}

const BOT_TOKEN = "8969834514:AAHl3mDZU00jncjJ52TyGTHmcs_-l5CBjPM";
const MANAGER_URL = "https://t.me/SVOI_travel_admin";
const CHANNEL_URL = "https://t.me/+Flt_2r6vi3U4ZDg6";
const GROUP_URL = "https://t.me/+J50liyDUHPgzYTQy";

export const TelegramSimulator: React.FC<TelegramSimulatorProps> = ({ onNewLead, onOpenCarModal, leads = [] }) => {
  const [viewMode, setViewMode] = useState<'mobile' | 'desktop'>('mobile');
  const [buttonBorderStyle, setButtonBorderStyle] = useState<ButtonBorderStyle>('neon');
  const [inputText, setInputText] = useState('');
  const [fsmState, setFsmState] = useState<'idle' | 'feedback_waiting' | 'booking_waiting'>('idle');
  const [pendingBookingTrip, setPendingBookingTrip] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [showMiniAppModal, setShowMiniAppModal] = useState(false);
  const [giveawayParticipantsCount, setGiveawayParticipantsCount] = useState(14);
  const [freeSeatsMap, setFreeSeatsMap] = useState<Record<string, number>>({
    paris: 8,
    amsterdam: 6,
    brugge: 5,
    strasbourg_colmar: 7,
    etretat_paris: 6,
    neuschwanstein: 4,
    disneyland: 8,
    normandy: 5,
    switzerland_combo: 6,
    luxembourg_vianden: 7,
    reims_champagne: 6,
    prague: 5,
    alsace_strasbourg: 6,
    como_milan: 3
  });
  const [waitlist, setWaitlist] = useState<Array<{ id: string; name: string; handle: string; trip: string; seats: number; date: string }>>([
    { id: 'wl-101', name: 'Олександр Т.', handle: '@alex_traveler', trip: 'Париж', seats: 2, date: 'Найближча субота' },
    { id: 'wl-102', name: 'Катерина М.', handle: '@kate_munich', trip: 'Озеро Комо + Мілан', seats: 3, date: 'Наступні вихідні' }
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Helper to apply dynamic colored borders and glow based on button type
  const getInlineButtonStyle = (btn: InlineBtn, styleMode: ButtonBorderStyle): string => {
    if (styleMode === 'classic') {
      return 'bg-[#242f3d] hover:bg-[#2e3b4d] active:bg-[#344257] text-blue-300 hover:text-white border border-slate-700/40 hover:border-blue-500/40 shadow-sm';
    }

    const data = btn.callbackData || '';
    const text = btn.text || '';
    const isUrl = Boolean(btn.url);

    // 0. Mini App Button
    if (data === 'cb_open_miniapp' || text.includes('Mini App')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-cyan-950 via-purple-950 to-cyan-950 hover:from-cyan-900 hover:to-purple-900 text-cyan-100 hover:text-white border-2 border-cyan-400 hover:border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.6),inset_0_0_10px_rgba(34,211,238,0.25)] font-bold ring-1 ring-cyan-400/50'
        : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 border border-cyan-400 font-bold';
    }

    // 0.5. Primary Manager Button (Vibrant neon color & font-black like РЕЗЕРВ)
    if (text.includes("ЗВ'ЯЗОК З МЕНЕДЖЕРОМ") || text.includes("МЕНЕДЖЕР") || text.includes("Менеджер")) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-fuchsia-950 via-pink-950 to-rose-950 hover:from-fuchsia-900 hover:to-pink-900 active:bg-fuchsia-800 text-white border-2 border-fuchsia-400 hover:border-fuchsia-300 shadow-[0_0_18px_rgba(217,70,239,0.7),inset_0_0_10px_rgba(217,70,239,0.3)] font-black ring-1 ring-fuchsia-400/60'
        : 'bg-fuchsia-950/50 hover:bg-fuchsia-900/70 text-fuchsia-100 hover:text-white border border-fuchsia-400 font-bold shadow-sm';
    }

    // 0.6. Channel Button (Vibrant neon color & font-black like РЕЗЕРВ)
    if (text.includes("КАНАЛ") || text.includes("Канал")) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-sky-950 via-blue-950 to-cyan-950 hover:from-sky-900 hover:to-blue-900 active:bg-sky-800 text-white border-2 border-sky-400 hover:border-sky-300 shadow-[0_0_18px_rgba(56,189,248,0.7),inset_0_0_10px_rgba(56,189,248,0.3)] font-black ring-1 ring-sky-400/60'
        : 'bg-sky-950/50 hover:bg-sky-900/70 text-sky-100 hover:text-white border border-sky-400 font-bold shadow-sm';
    }

    // 0.7. Channel Admin Button
    if (data.startsWith('cb_adm_') || text.includes('Керування каналом')) {
      return styleMode === 'neon'
        ? 'bg-purple-950/60 hover:bg-purple-900/80 text-purple-100 hover:text-white border-2 border-purple-400 hover:border-purple-300 shadow-[0_0_15px_rgba(192,132,252,0.4)] font-semibold'
        : 'bg-purple-950/40 hover:bg-purple-900/60 text-purple-200 border border-purple-500/70 font-semibold';
    }

    // 1. Navigation / Back to Menu
    if (data === 'cb_menu' || data.includes('back') || text.includes('Назад') || text.includes('Головне меню')) {
      return styleMode === 'neon'
        ? 'bg-slate-900/95 hover:bg-slate-800 text-slate-300 hover:text-white border-2 border-slate-500/80 hover:border-slate-300 shadow-[0_0_10px_rgba(148,163,184,0.2)]'
        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-600/70 shadow-sm';
    }

    // 2. Booking / Confirm Reservation / Seat selection / РЕЗЕРВ (Vibrant emerald neon & font-black)
    if (data === 'cb_book' || data.startsWith('cb_select_seat') || data.startsWith('cb_confirm_') || text.includes('РЕЗЕРВ') || text.includes('Забронювати') || text.includes('Підтвердити')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-emerald-950 via-teal-950 to-green-950 hover:from-emerald-900 hover:to-teal-900 active:bg-emerald-800 text-white border-2 border-emerald-400 hover:border-emerald-300 shadow-[0_0_18px_rgba(52,211,153,0.7),inset_0_0_10px_rgba(52,211,153,0.3)] font-black ring-1 ring-emerald-400/60'
        : 'bg-emerald-950/50 hover:bg-emerald-900/70 text-emerald-100 hover:text-white border border-emerald-400 font-bold shadow-sm';
    }

    // 3. Trips / Schedule / Tours catalog (Vibrant cyan neon)
    if (data === 'cb_trips' || data.startsWith('cb_trip_') || text.includes('Поїздки') || text.includes('Напрямки') || text.includes('Розклад') || text.includes('тур')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-cyan-950 via-blue-950 to-teal-950 hover:from-cyan-900 hover:to-blue-900 active:bg-cyan-800 text-white border-2 border-cyan-400 hover:border-cyan-300 shadow-[0_0_18px_rgba(34,211,238,0.65),inset_0_0_10px_rgba(34,211,238,0.25)] font-bold ring-1 ring-cyan-400/50'
        : 'bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 hover:text-white border border-cyan-400 font-semibold shadow-sm';
    }

    // 4. Partner / Стати партнером (Vibrant gold neon)
    if (data === 'cb_partner' || text.includes('партнер')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-amber-950 via-yellow-950 to-orange-950 hover:from-amber-900 hover:to-yellow-900 active:bg-amber-800 text-amber-100 hover:text-white border-2 border-amber-400 hover:border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.65),inset_0_0_10px_rgba(251,191,36,0.25)] font-bold ring-1 ring-amber-400/50'
        : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-400 font-semibold shadow-sm';
    }

    // 5. Meeting Stops / Pickup points
    if (data === 'cb_meeting' || data.startsWith('cb_pickup') || text.includes('Точки збору')) {
      return styleMode === 'neon'
        ? 'bg-teal-950/50 hover:bg-teal-900/70 active:bg-teal-800/80 text-teal-100 hover:text-white border-2 border-teal-400 hover:border-teal-300 shadow-[0_0_14px_rgba(45,212,191,0.4)] font-medium'
        : 'bg-teal-950/35 hover:bg-teal-900/50 text-teal-200 hover:text-white border border-teal-500/70 hover:border-teal-400 font-medium shadow-sm';
    }

    // 6. Minivan / Car Fleet / Photos
    if (data === 'cb_car' || text.includes('авто') || text.includes('Автопарк')) {
      return styleMode === 'neon'
        ? 'bg-amber-950/50 hover:bg-amber-900/70 active:bg-amber-800/80 text-amber-100 hover:text-white border-2 border-amber-400 hover:border-amber-300 shadow-[0_0_14px_rgba(251,191,36,0.4)] font-medium'
        : 'bg-amber-950/35 hover:bg-amber-900/50 text-amber-200 hover:text-white border border-amber-500/70 hover:border-amber-400 font-medium shadow-sm';
    }

    // 7. Games & Quizzes
    if (data === 'cb_games' || data.startsWith('cb_game') || text.includes('Ігри') || text.includes('вікторин')) {
      return styleMode === 'neon'
        ? 'bg-purple-950/50 hover:bg-purple-900/70 active:bg-purple-800/80 text-purple-100 hover:text-white border-2 border-purple-400 hover:border-purple-300 shadow-[0_0_14px_rgba(192,132,252,0.4)] font-medium'
        : 'bg-purple-950/35 hover:bg-purple-900/50 text-purple-200 hover:text-white border border-purple-500/70 hover:border-purple-400 font-medium shadow-sm';
    }

    // 8. Reviews (Warm Amber)
    if (data === 'cb_reviews' || text.includes('Відгуки')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-orange-950 via-amber-950 to-yellow-950 hover:from-orange-900 hover:to-amber-900 active:bg-orange-800 text-amber-100 hover:text-white border-2 border-amber-400 hover:border-amber-300 shadow-[0_0_16px_rgba(245,158,11,0.6),inset_0_0_8px_rgba(245,158,11,0.25)] font-bold ring-1 ring-amber-400/50'
        : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border border-amber-500/70 font-semibold shadow-sm';
    }

    // 8.5. Custom individual trip
    if (data === 'cb_custom_trip' || text.includes('Індивідуальний')) {
      return styleMode === 'neon'
        ? 'bg-indigo-950/50 hover:bg-indigo-900/70 active:bg-indigo-800/80 text-indigo-100 hover:text-white border-2 border-indigo-400 hover:border-indigo-300 shadow-[0_0_14px_rgba(129,140,248,0.4)] font-semibold'
        : 'bg-indigo-950/35 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-500/70 font-semibold shadow-sm';
    }

    // 9. Feedback / Wishes
    if (data === 'cb_feedback' || data.includes('feedback') || text.includes('відгук') || text.includes('побажання')) {
      return styleMode === 'neon'
        ? 'bg-rose-950/50 hover:bg-rose-900/70 active:bg-rose-800/80 text-rose-100 hover:text-white border-2 border-rose-400 hover:border-rose-300 shadow-[0_0_14px_rgba(251,113,133,0.4)] font-medium'
        : 'bg-rose-950/35 hover:bg-rose-900/50 text-rose-200 hover:text-white border border-rose-500/70 hover:border-rose-400 font-medium shadow-sm';
    }

    // 10. FAQ / Questions (Royal Blue)
    if (data === 'cb_faq' || data.startsWith('cb_faq_') || text.includes('FAQ') || text.includes('питання')) {
      return styleMode === 'neon'
        ? 'bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 hover:from-blue-900 hover:to-indigo-900 active:bg-blue-800 text-blue-100 hover:text-white border-2 border-blue-400 hover:border-blue-300 shadow-[0_0_16px_rgba(96,165,250,0.6),inset_0_0_8px_rgba(96,165,250,0.25)] font-bold ring-1 ring-blue-400/50'
        : 'bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 hover:text-white border border-blue-500/70 hover:border-blue-400 font-medium shadow-sm';
    }

    // 10. Seat rows in minivan
    if (data.startsWith('cb_seat_')) {
      if (data.includes('cb_seat_1') || data.includes('cb_seat_2')) {
        // Row 1 - Front near driver
        return styleMode === 'neon'
          ? 'bg-amber-950/50 hover:bg-amber-900/70 text-amber-100 hover:text-white border-2 border-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.35)] font-medium'
          : 'bg-amber-950/30 hover:bg-amber-900/50 text-amber-200 border border-amber-500/70 font-medium';
      }
      if (data.includes('cb_seat_3') || data.includes('cb_seat_4') || data.includes('cb_seat_5')) {
        // Row 2
        return styleMode === 'neon'
          ? 'bg-sky-950/50 hover:bg-sky-900/70 text-sky-100 hover:text-white border-2 border-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.35)] font-medium'
          : 'bg-sky-950/30 hover:bg-sky-900/50 text-sky-200 border border-sky-500/70 font-medium';
      }
      if (data.includes('cb_seat_6') || data.includes('cb_seat_7') || data.includes('cb_seat_8')) {
        // Row 3
        return styleMode === 'neon'
          ? 'bg-indigo-950/50 hover:bg-indigo-900/70 text-indigo-100 hover:text-white border-2 border-indigo-400 shadow-[0_0_12px_rgba(129,140,248,0.35)] font-medium'
          : 'bg-indigo-950/30 hover:bg-indigo-900/50 text-indigo-200 border border-indigo-500/70 font-medium';
      }
      if (data.includes('none')) {
        // Free seating
        return styleMode === 'neon'
          ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-100 hover:text-white border-2 border-emerald-400/80 shadow-[0_0_12px_rgba(52,211,153,0.3)] font-medium'
          : 'bg-emerald-950/25 hover:bg-emerald-900/40 text-emerald-200 border border-emerald-500/60 font-medium';
      }
    }

    // 11. External link / Manager / Channel
    if (isUrl || text.includes('Підтримка') || text.includes('Канал')) {
      return styleMode === 'neon'
        ? 'bg-violet-950/50 hover:bg-violet-900/70 text-violet-100 hover:text-white border-2 border-violet-400 hover:border-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.4)] font-medium'
        : 'bg-violet-950/35 hover:bg-violet-900/50 text-violet-200 hover:text-white border border-violet-500/70 hover:border-violet-400 font-medium shadow-sm';
    }

    // Default fallback button
    return styleMode === 'neon'
      ? 'bg-slate-900/95 hover:bg-slate-800 text-blue-200 hover:text-white border-2 border-blue-400 hover:border-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.3)]'
      : 'bg-slate-900/80 hover:bg-slate-800 text-blue-200 hover:text-white border border-blue-500/60 shadow-sm';
  };

  const getCurrentTime = () => {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getMainKeyboard = (): InlineBtn[][] => [
    [
      { text: '🌌 SVOI Mini App (3D Салон & 14 турів) ✨', callbackData: 'cb_open_miniapp' }
    ],
    [
      { text: '🔵 🗺 Напрямки та дати', callbackData: 'cb_trips' },
      { text: '🟢 ⚡️ РЕЗЕРВ МІСЦЯ', callbackData: 'cb_book' }
    ],
    [
      { text: '🟠 ⭐ Відгуки туристів', callbackData: 'cb_reviews' },
      { text: '🔷 ❓ Часті питання (FAQ)', callbackData: 'cb_faq' }
    ],
    [
      { text: '🟡 🤝 Стати партнером клубу', callbackData: 'cb_partner' }
    ],
    [
      { text: "🟣 💬 ЗВ'ЯЗОК З МЕНЕДЖЕРОМ", url: MANAGER_URL },
      { text: '💎 📢 НАШ КАНАЛ', url: CHANNEL_URL }
    ],
    [
      { text: '👑 Керування каналом (/channel)', callbackData: 'cb_adm_channel_menu' },
      { text: '📋 Лист очікування', callbackData: 'cb_adm_waitlist' }
    ]
  ];

  const getMainWelcomeText = () => (
    `🌟 <b>Ласкаво просимо до туристичного клубу SVOI!</b> 🌍✨\n\n` +
    `Ми організовуємо душевні та продумані поїздки найкрасивішими куточками Європи ` +
    `на комфортабельному мінівені Opel Vivaro без стресу, поспіху та мовних бар'єрів!\n\n` +
    `✨ <b>Чому обирають SVOI:</b>\n` +
    `• 🚐 <i>Комфорт у дорозі:</i> просторий 8-місний мінівен (2 місця поруч з водієм, 3 у 2-му та 3 у 3-му ряду)\n` +
    `• 💳 <i>Чесні умови:</i> працюємо <b>без передоплати</b> на одноденні поїздки!\n` +
    `• 📍 <i>Зручний старт:</i> адресний збір (Door-to-Door) по Саарланду, Люксембургу та Тріру\n` +
    `• 👥 <i>Маленькі душевні групи</i> (до 8 осіб)\n\n` +
    `👇 <b>Оберіть потрібний розділ у меню:</b>`
  );

  const [messages, setMessages] = useState<SimMessage[]>([
    {
      id: 'msg-start',
      sender: 'bot',
      text: getMainWelcomeText(),
      time: getCurrentTime(),
      inlineKeyboard: getMainKeyboard()
    }
  ]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const showToast = (text: string) => {
    setToastMessage(text);
    setTimeout(() => {
      setToastMessage(null);
    }, 2200);
  };

  // Reusable callback handler simulating edit_text
  const handleCallbackClick = (btn: InlineBtn) => {
    if (btn.url) {
      window.open(btn.url, '_blank');
      return;
    }

    const data = btn.callbackData;
    if (!data) return;

    // Simulate await callback.answer()
    showToast(`Натиснуто: ${btn.text}`);

    if (data === 'cb_back') {
      setFsmState('idle');
      setPendingBookingTrip(null);
      editLastBotMessage(getMainWelcomeText(), getMainKeyboard());
      return;
    }

    // Mini App Launcher
    if (data === 'cb_open_miniapp') {
      setShowMiniAppModal(true);
      return;
    }

    // Channel Admin Menu (/channel)
    if (data === 'cb_adm_channel_menu') {
      showChannelMenuMessage();
      return;
    }

    if (data === 'cb_adm_gw_new') {
      const gwText = 
        `🎁 <b>Запуск нового РОЗІГРАШУ в каналі</b>\n\n` +
        `Ми розігруємо:\n` +
        `🏆 <b>Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼</b>\n\n` +
        `<b>Умови участі для підписників:</b>\n` +
        `1️⃣ Бути підписаним на офіційний канал SVOI\n` +
        `2️⃣ Бути учасником групи клубу\n` +
        `3️⃣ Натиснути кнопку «🎉 Брати участь!»\n\n` +
        `<i>Бот автоматично перевіряє підписку через get_chat_member та рахує учасників у реальному часі!</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: `🎉 Брати участь! (${giveawayParticipantsCount})`, callbackData: 'cb_sim_join_gw' }
        ],
        [
          { text: '🏆 4. Вибрати переможця розіграшу', callbackData: 'cb_adm_gw_pick' }
        ],
        [
          { text: '🔙 Назад до керування каналом', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(gwText, keyboard);
      return;
    }

    if (data === 'cb_sim_join_gw') {
      const newCount = giveawayParticipantsCount + 1;
      setGiveawayParticipantsCount(newCount);
      showToast("🎉 Ви успішно зареєстровані в розіграші! Підписка: OK ✅");

      const gwText = 
        `🎁 <b>Запуск нового РОЗІГРАШУ в каналі</b>\n\n` +
        `Ми розігруємо:\n` +
        `🏆 <b>Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼</b>\n\n` +
        `<b>Умови участі для підписників:</b>\n` +
        `1️⃣ Бути підписаним на офіційний канал SVOI\n` +
        `2️⃣ Бути учасником групи клубу\n` +
        `3️⃣ Натиснути кнопку «🎉 Брати участь!»\n\n` +
        `<i>Бот автоматично перевіряє підписку через get_chat_member та рахує учасників у реальному часі!</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: `🎉 Брати участь! (${newCount})`, callbackData: 'cb_sim_join_gw' }
        ],
        [
          { text: '🏆 4. Вибрати переможця розіграшу', callbackData: 'cb_adm_gw_pick' }
        ],
        [
          { text: '🔙 Назад до керування каналом', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(gwText, keyboard);
      return;
    }

    if (data === 'cb_adm_gw_pick') {
      const candidates = ['@alex_traveler (Олександр М.)', '@elena_voyage (Олена К.)', '@mike_trip (Михайло В.)', '@katya_de (Катерина С.)'];
      const luckyWinner = candidates[Math.floor(Math.random() * candidates.length)];

      const winnerPost = 
        `🎊🏆 <b>УВАГА! ПІДСУМКИ ГРАНДІОЗНОГО РОЗІГРАШУ!</b> 🏆🎊\n\n` +
        `Приз: 🎁 <b>Безкоштовна поїздка до Парижа на 1 день (Версаль + яхта) 🥐🗼</b>\n` +
        `Усього брало участь: <b>${giveawayParticipantsCount} підписників</b>\n\n` +
        `✨ Генератор випадкових чисел обрав нашого переможця: ✨\n` +
        `🥳 <b>ПЕРЕМОЖЕЦЬ: ${luckyWinner}</b>! 🎉🎉🎉\n\n` +
        `Щиро вітаємо з перемогою! Менеджер клубу @SVOI_travel_admin уже зв'язується для вручення призу.\n\n` +
        `<i>Дякуємо всім за участь! Слідкуйте за анонсами нових поїздок!</i> 🚐✨`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Забронювати поїздку', callbackData: 'cb_trips' },
          { text: '💬 Менеджер', url: MANAGER_URL }
        ],
        [
          { text: '🔙 Назад до каналу', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(winnerPost, keyboard);
      return;
    }

    if (data === 'cb_adm_post_tour') {
      const tour = TRIPS_LIST[0];
      const postText = 
        `🌟 <b>Ексклюзивний виїзд: ${tour.title}!</b> 🌍✨\n\n` +
        `💰 <b>Ціна: ${tour.price}€</b> | Тривалість: <b>${tour.duration}</b>\n` +
        `🚐 Комфортний трансфер Opel Vivaro (дводіапазонний клімат, відкидні крісла, USB)\n` +
        `📍 Адресний збір: Саарланд, Трір, Люксембург (Door-to-Door)!\n\n` +
        `<b>У програмі поїздки:</b>\n` +
        tour.highlights.map(h => `• ${h}`).join('\n') + `\n\n` +
        `<i>${tour.description}</i>\n\n` +
        `👉 Натисніть кнопку нижче, щоб забронювати або обрати місце у салоні:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Забронювати цей тур', callbackData: `cb_book_target_${tour.id}` }
        ],
        [
          { text: '🚀 Відкрити Mini App (3D салон)', callbackData: 'cb_open_miniapp' },
          { text: '💬 Менеджер', url: MANAGER_URL }
        ],
        [
          { text: '🔙 Назад до панелі каналу', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(postText, keyboard, tour.image);
      return;
    }

    if (data === 'cb_adm_send_quiz') {
      const quizText = 
        `🧠 <b>ВІКТОРИНА ВІД SVOI TRAVEL У КАНАЛІ!</b> 🌍✨\n\n` +
        `<b>Запитання:</b> У якому місті знаходиться відомий міст закоханих біля Озера Кохання (Minnewater)?\n\n` +
        `1️⃣ Амстердам (Нідерланди)\n` +
        `2️⃣ Брюгге (Бельгія) 🇧🇪\n` +
        `3️⃣ Страсбург (Франція)\n\n` +
        `<i>Натисніть варіант відповіді: правильний варіант супроводжується конфетті 🎉!</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '1. Амстердам 🚲', callbackData: 'cb_quiz_ans_wrong' },
          { text: '2. Брюгге 🏰 (Вірно)', callbackData: 'cb_quiz_ans_correct' },
          { text: '3. Страсбург 🍷', callbackData: 'cb_quiz_ans_wrong' }
        ],
        [
          { text: '💺 Забронювати поїздку до Брюгге (110€)', callbackData: 'cb_book_target_bruges' }
        ],
        [
          { text: '🔙 Назад до панелі каналу', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(quizText, keyboard);
      return;
    }

    if (data === 'cb_quiz_ans_correct') {
      showToast("🎉 Блискуче! Правильна відповідь: Брюгге (Бельгія) 🇧🇪 Конфетті!");
      return;
    }

    if (data === 'cb_quiz_ans_wrong') {
      showToast("❌ Невірно! Спробуйте варіант Брюгге 😉");
      return;
    }

    if (data === 'cb_adm_post_miniapp') {
      const miniappText = 
        `🚀✨ <b>ЗУСТРІЧАЙТЕ НОВИЙ SVOI MINI APP «ЗОРЯНЕ НЕБО»!</b> 🌌🚐\n\n` +
        `Тепер обрати тур та конкретне крісло в салоні можна у фірмовому 3D додатку прямо всередині Telegram!\n\n` +
        `✨ <b>Можливості Mini App:</b>\n` +
        `• Інтерактивний вибір крісла у салоні Opel Vivaro\n` +
        `• Стеля з оптоволоконним «Зоряним небом»\n` +
        `• Вітрина всіх 14 турів з яскравими фото\n` +
        `• Миттєве оформлення без передоплати!\n\n` +
        `Натискайте кнопку нижче для запуску:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🚀 Відкрити Mini App (Зоряне небо)', callbackData: 'cb_open_miniapp' }
        ],
        [
          { text: '🔙 Назад до каналу', callbackData: 'cb_adm_channel_menu' }
        ]
      ];

      editLastBotMessage(miniappText, keyboard);
      return;
    }

    if (data === 'cb_trips') {
      const tripsKeyboard: InlineBtn[][] = TRIPS_LIST.map((trip, idx) => {
        const free = freeSeatsMap[trip.id] ?? 5;
        const seatsLabel = free > 0 ? `${free} м.` : 'Аншлаг';
        const cleanTitle = (trip.shortTitle || trip.title).split('(')[0].trim();
        return [
          {
            text: `${idx + 1}. ${cleanTitle} — ${trip.price}€ [${seatsLabel}]`,
            callbackData: `cb_trip_${trip.id}`
          }
        ];
      });
      tripsKeyboard.push([
        { text: '🔙 Назад до меню', callbackData: 'cb_back' }
      ]);

      const headerText = 
        `🗺 <b>Актуальні напрямки та розклад турів SVOI</b> 🇪🇺✨\n\n` +
        `Усі поїздки здійснюються з <b>Саарланду, Люксембургу та Тріра</b> (зі збором прямо за адресою пасажира та підсадкою по дорозі) ` +
        `на комфортабельному мінівені Opel Vivaro.\n\n` +
        `👇 <i>Натисніть на напрямок для перегляду програми, лічильника місць та бронювання:</i>`;

      editLastBotMessage(headerText, tripsKeyboard);
      return;
    }

    if (data.startsWith('cb_trip_')) {
      const tripId = data.replace('cb_trip_', '');
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      if (!trip) return;

      const freeSeats = freeSeatsMap[trip.id] ?? 5;
      const seatsBadge = freeSeats > 4 
        ? `🟢 <b>Вільних місць: ${freeSeats} із 8</b>`
        : freeSeats > 0 
          ? `🟡 <b>Залишилося лише ${freeSeats} місця!</b>`
          : `🔴 <b>Усі 8 місць зайняті (доступний лист очікування)</b>`;

      const detailText = 
        `✨ <b>${trip.title}</b> (${trip.duration})\n` +
        `🏷 <b>Статус:</b> ${trip.badge}\n` +
        `💵 <b>Вартість:</b> ${trip.price}€\n\n` +
        `📍 <b>Програма та головні враження:</b>\n` +
        `${trip.description}\n\n` +
        `📊 <b>Статус заповнення рейсу:</b>\n• ${seatsBadge}\n\n` +
        `🚩 <b>Збір пасажирів:</b> За адресою (Саарланд, Трір, Люксембург) + підсадка по дорозі\n` +
        `🚐 <b>Трансфер:</b> Opel Vivaro комфортне авто з усіма зручностями.\n\n` +
        `👑 <i>(Панель адміна: ви можете змінювати лічильник вільних місць кнопкою нижче)</i>`;

      const keyboard: InlineBtn[][] = [];
      if (freeSeats > 0) {
        keyboard.push([
          { text: `💺 Забронювати (${freeSeats} вільних місць)`, callbackData: `cb_book_target_${trip.id}` }
        ]);
      } else {
        keyboard.push([
          { text: `📋 Лист очікування (місць немає)`, callbackData: `cb_waitlist_add_${trip.id}` }
        ]);
      }

      keyboard.push([
        { text: '📋 Лист очікування', callbackData: `cb_waitlist_add_${trip.id}` },
        { text: '🚐 5-8 осіб', callbackData: 'cb_custom_trip' }
      ]);

      keyboard.push([
        { text: `⚙️ Змінити місця (${freeSeats}/8) [Адмін]`, callbackData: `cb_adm_seats_${trip.id}` }
      ]);

      keyboard.push([
        { text: '🗺 Інші тури', callbackData: 'cb_trips' },
        { text: '🔙 Меню', callbackData: 'cb_back' }
      ]);

      editLastBotMessage(detailText, keyboard, trip.image);
      return;
    }

    if (data.startsWith('cb_adm_seats_')) {
      const tripId = data.replace('cb_adm_seats_', '');
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const currentFree = freeSeatsMap[tripId] ?? 5;
      const text = 
        `⚙️ <b>Керування місцями: ${trip?.shortTitle || tripId}</b>\n\n` +
        `Поточна кількість вільних місць: <b>${currentFree} із 8</b>\n\n` +
        `Оберіть нове значення (від 0 до 8):`;

      const keyboard: InlineBtn[][] = [
        [0, 1, 2, 3, 4].map(n => ({ text: `${n}`, callbackData: `cb_set_seats_${tripId}_${n}` })),
        [5, 6, 7, 8].map(n => ({ text: `${n}`, callbackData: `cb_set_seats_${tripId}_${n}` })),
        [{ text: '🔙 Повернутися до туру', callbackData: `cb_trip_${tripId}` }]
      ];

      editLastBotMessage(text, keyboard);
      return;
    }

    if (data.startsWith('cb_set_seats_')) {
      const parts = data.split('_');
      const tripId = parts[3];
      const count = parseInt(parts[4], 10);
      setFreeSeatsMap(prev => ({ ...prev, [tripId]: count }));
      showToast(`✅ Встановлено ${count} вільних місць!`);
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      if (trip) {
        const fakeBtn: InlineBtn = { text: 'Тур', callbackData: `cb_trip_${tripId}` };
        handleCallbackClick(fakeBtn);
      }
      return;
    }

    if (data.startsWith('cb_waitlist_add_')) {
      const tripId = data.replace('cb_waitlist_add_', '');
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const newEntry = {
        id: `wl-${Date.now()}`,
        name: 'Ви (Тестовий турист)',
        handle: '@guest_user',
        trip: trip?.shortTitle || tripId,
        seats: 1,
        date: 'Найближчий рейс'
      };
      setWaitlist(prev => [newEntry, ...prev]);
      showToast('📋 Заявку додано до листа очікування!');
      const confirmText = 
        `✅ <b>Ви успішно додані до листа очікування!</b> 📋✨\n\n` +
        `Тур: <b>${trip?.title || 'Обраний тур'}</b>\n` +
        `Як тільки звільниться місце або відкриється додатковий рейс — менеджер клубу SVOI миттєво напише вам!`;
      const keyboard: InlineBtn[][] = [
        [{ text: '🗺 Інші напрямки', callbackData: 'cb_trips' }],
        [{ text: '🔙 Головне меню', callbackData: 'cb_back' }]
      ];
      editLastBotMessage(confirmText, keyboard);
      return;
    }

    if (data === 'cb_reviews') {
      const reviewsText = 
        `⭐ <b>Відгуки туристів клубу SVOI Travel</b> 💬✨\n\n` +
        `Реальні відгуки наших мандрівників про поїздки, атмосферу та комфорт Opel Vivaro:\n\n` +
        `<b>Олена К.</b> (Саарбрюккен) — <i>Париж (Версаль + яхта)</i>\n` +
        `⭐⭐⭐⭐⭐ <b>5/5</b> (12.10.2026)\n` +
        `«Неймовірна поїздка! Організація на висоті: забрали прямо біля будинку, мінівен дуже м'який і зручний, зоряне небо в салоні створило казку!»\n\n` +
        `───────────────\n\n` +
        `<b>Михайло В.</b> (Трір) — <i>Брюгге (Бельгія)</i>\n` +
        `⭐⭐⭐⭐⭐ <b>5/5</b> (05.10.2026)\n` +
        `«Найкращий формат подорожей: маленька група, без метушні великих автобусів. Вільного часу було достатньо!»\n\n` +
        `───────────────\n\n` +
        `<b>Ірина М.</b> (Люксембург) — <i>Озеро Комо + Мілан</i>\n` +
        `⭐⭐⭐⭐⭐ <b>5/5</b> (28.09.2026)\n` +
        `«Два дні італійського щастя! Дуже сподобалося місце біля водія — панорамний огляд просто вражаючий!»\n\n` +
        `👇 <i>Ви також можете поділитися своїми враженнями від минулих турів:</i>`;

      const keyboard: InlineBtn[][] = [
        [{ text: '✍️ Залишити свій відгук', callbackData: 'cb_feedback' }],
        [{ text: '🔙 Головне меню', callbackData: 'cb_back' }]
      ];
      editLastBotMessage(reviewsText, keyboard);
      return;
    }

    if (data === 'cb_custom_trip') {
      const customText = 
        `👑 <b>Ексклюзивна поїздка лише для вашої родини чи друзів!</b> 🚐✨\n\n` +
        `Повний комфортабельний мінівен Opel Vivaro (до 8 пасажирів) з персональним водієм у вашому повному розпорядженні.\n\n` +
        `✨ <b>Переваги індивідуального виїзду:</b>\n` +
        `• 📅 <b>Будь-яка зручна дата</b> на ваш вибір (будні або вихідні)\n` +
        `• 📍 <b>Адресний збір від вашого під'їзду</b> (Door-to-Door)\n` +
        `• 🗺 <b>Гнучкий маршрут:</b> можливість змінити зупинки, заїхати у бажаний ресторан або виноробню\n` +
        `• 👥 Тільки ви та ваші близькі — жодних сторонніх попутників!\n` +
        `• 💶 Фіксована вартість за все авто (від 550€ за весь бус на день залежно від кілометражу)\n\n` +
        `👇 <i>Натисніть кнопку нижче, щоб обговорити ваш напрямок та зручну дату з менеджером:</i>`;

      const keyboard: InlineBtn[][] = [
        [{ text: '💬 Обговорити індивідуальний виїзд', url: `${MANAGER_URL}?text=Доброго+дня!+Цікавить+індивідуальний+виїзд` }],
        [{ text: '🗺 Обрати тур з розкладу', callbackData: 'cb_trips' }],
        [{ text: '🔙 Головне меню', callbackData: 'cb_back' }]
      ];
      editLastBotMessage(customText, keyboard);
      return;
    }

    if (data === 'cb_adm_waitlist') {
      const lines = waitlist.map((item, idx) => 
        `<b>#${idx + 1} | ${item.trip}</b>\n` +
        `👤 Клієнт: <b>${item.name}</b> (${item.handle})\n` +
        `💺 Місць: <b>${item.seats}</b> | Бажана дата: <i>${item.date}</i>\n` +
        `Статус: 🟡 <b>очікує</b>`
      );
      const waitlistText = 
        `📋 <b>Лист очікування пасажирів (SVOI Waitlist)</b>\n\n` +
        (lines.length > 0 ? lines.join('\n\n────────────────\n\n') : '<i>Лист очікування порожній.</i>') +
        `\n\n💡 <i>Коли звільняється місце або відкриється додатковий рейс — зв\'яжіться з туристом для підтвердження броні!</i>`;

      const keyboard: InlineBtn[][] = [
        [{ text: '💬 Написати клієнту', url: MANAGER_URL }],
        [{ text: '🔙 До панелі каналу', callbackData: 'cb_adm_channel_menu' }],
        [{ text: '🏠 Головне меню', callbackData: 'cb_back' }]
      ];
      editLastBotMessage(waitlistText, keyboard);
      return;
    }

    if (data === 'cb_car') {
      const carText = 
        `🚐 <b>Наш мінівен: Opel Vivaro (8 пасажирських місць)</b> 🚗\n\n` +
        `Ми дбаємо про те, щоб дорога була легкою та приємною!\n\n` +
        `💺 <b>Схема місць у салоні (всього 8 місць):</b>\n` +
        `• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\n` +
        `• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\n` +
        `• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\n\n` +
        `🌟 <b>Оснащення та зручності:</b>\n` +
        `• 💺 <b>Зручні сидіння:</b> індивідуальні ремені, відкидні спинки для сну в дорозі\n` +
        `• 📏 <b>Простір для ніг:</b> вільно навіть для високих пасажирів\n` +
        `• ❄️🔥 <b>Кондиціонер та опалення салону</b>\n` +
        `• ⚡️ <b>Зарядка телефонів:</b> USB-порти для ваших смартфонів\n` +
        `• 🧳 <b>Багажне відділення:</b> 10 кг при далеких поїздках + ручна поклажа в салон\n` +
        `• 🧼 <b>Чистота:</b> регулярне вологе прибирання перед кожним рейсом\n\n` +
        `<i>Ви можете обрати конкретне місце під час бронювання (+5€) або зайняти вільне при посадці (0€).</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Відкрити схему місць у салоні', callbackData: 'cb_open_car_visualizer' }
        ],
        [
          { text: '💺 Обрати місце (+5€)', callbackData: 'cb_book' },
          { text: '🔙 Назад до меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(carText, keyboard);
      return;
    }

    if (data === 'cb_open_car_visualizer') {
      onOpenCarModal?.();
      return;
    }

    if (data === 'cb_meeting') {
      const meetingText = 
        `📍 <b>Точки збору пасажирів & Логістика клубу SVOI</b> 🗺\n\n` +
        `🏡 <b>Збір та розвезення за адресою (Door-to-Door):</b>\n` +
        `• <b>Забираємо всіх за адресою</b> по землі <b>Саарланд (Saarland)</b>, у <b>Трірі (Trier)</b> та <b>Люксембурзі (Luxembourg)</b>!\n` +
        `• Розвеземо також назад прямо за адресою.\n\n` +
        `🛣 <b>Збір в інших землях та можливість підсадки:</b>\n` +
        `Можемо забрати й в інших землях — це залежить від маршруту (по дорозі чи ні) або якщо тур не одноденний.\n` +
        `👉 <b>За наявності від 4-х осіб можемо забрати з інших земель!</b>\n\n` +
        `Міста та умови підсадки:\n` +
        `• <b>Хомбург (Homburg Saar)</b> — уточнюйте\n` +
        `• <b>Кайзерслаутерн (Kaiserslautern)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n` +
        `• <b>Мангейм / Людвігсхафен (Mannheim)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n` +
        `• <b>Франкфурт-на-Майні (Frankfurt am Main)</b> — можливий якщо більше 4-х осіб і не одноденний тур\n` +
        `• <b>Карлсруе (Karlsruhe)</b> — для південних напрямків по дорозі\n` +
        `• <b>Страсбург (Strasbourg)</b> — по Франції та Швейцарії\n` +
        `• <b>Бельгія</b> — при поїздках до Нормандії, Голландії та Парижа\n\n` +
        `💬 <i>Напишіть менеджеру для уточнення — можливість підсадки уточнюйте!</i>\n\n` +
        `⏰ <b>Точний час виїзду:</b>\n` +
        `Точний час, о котрій за вами заїдуть, надсилається <b>в особистий чат за день увечері перед поїздкою</b>.\n\n` +
        `👥 <b>Чат поїздки з водієм:</b>\n` +
        `Основні питання водієві та щодо поїздки ви зможете поставити у новоствореній одноденній групі для комунікації. <b>Через день група видаляється.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Уточнити підсадку у менеджера', url: MANAGER_URL }
        ],
        [
          { text: '🗺 Обрати напрямок туру', callbackData: 'cb_trips' },
          { text: '🔙 Назад до меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(meetingText, keyboard);
      return;
    }


    if (data === 'cb_terms') {
      const termsText = 
        `📜 <b>Умови поїздок туристичного клубу SVOI</b> 📌\n\n` +
        `🛂 <b>Необхідні документи:</b>\n` +
        `• Дійсний закордонний паспорт\n` +
        `• Дійсний ВНЖ (Aufenthaltstitel), ПМЖ або шенгенська віза\n` +
        `• 🏥 <b>Медична туристична страховка:</b> Обов'язкова для людей без ВНЖ в Європі\n\n` +
        `🧳 <b>Багаж:</b>\n` +
        `• <b>10 кг при далеких поїздках</b> у багажний відсік\n` +
        `• 1 невелика <b>ручна поклажа</b> з особистими речами в салон авто\n\n` +
        `💳 <b>Бронювання та оплата:</b>\n` +
        `• 🔥 <b>Бронь у нас БЕЗ ПЕРЕДОПЛАТИ!</b> Оплата туру відбувається при посадці в день поїздки\n` +
        `• Передоплата потрібна <b>ТІЛЬКИ при поїздках на кілька днів</b> для бронювання готелів\n\n` +
        `🔄 <b>Правила скасування та повернення:</b>\n` +
        `• Скасування за 72+ години — перенесення дати або скасування без утримань\n` +
        `• Менше 24 годин — бронь можна передати другу\n\n` +
        `🚭 <b>Куріння та алкоголь у салоні суворо заборонені.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 Назад до меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(termsText, keyboard);
      return;
    }

    if (data === 'cb_partner') {
      const partnerText = 
        `🤝 <b>Партнерська програма & Співпраця</b> 💼\n\n` +
        `Клуб SVOI відкритий для друзів, блогерів, гідів та активних мандрівників!\n\n` +
        `🌟 <b>Формати співпраці:</b>\n` +
        `1. <b>Приведи друзів:</b> зберіть компанію від 4 осіб та отримайте знижку 15% на всю поїздку!\n` +
        `2. <b>Індивідуальний чартер:</b> оренда всього мінівена з водієм під ключ.\n` +
        `3. <b>Для блогерів:</b> бартерні поїздки за чесні відмітки та рілси.\n` +
        `4. <b>Локальні гіди:</b> пропонуйте авторські маршрути.\n\n` +
        `📩 <i>Зв'яжіться напряму із засновником клубу:</i> @SVOI_travel_admin`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Написати засновнику', url: MANAGER_URL },
          { text: '🔙 Назад до меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(partnerText, keyboard);
      return;
    }

    if (data === 'cb_feedback') {
      setFsmState('feedback_waiting');
      const feedbackText = 
        `✍️ <b>Залишити відгук або побажання</b> 💌\n\n` +
        `Ми постійно покращуємо наші маршрути та сервіс. Напишіть у відповідному повідомленні:\n` +
        `• Ваші враження від минулої поїздки\n` +
        `• Куди б ви хотіли поїхати наступного разу\n` +
        `• Будь-які пропозиції щодо розвитку клубу SVOI\n\n` +
        `<i>Надішліть ваш текст прямо в рядок введення повідомлення нижче:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '❌ Скасувати введення', callbackData: 'cb_cancel_feedback' }
        ]
      ];

      editLastBotMessage(feedbackText, keyboard);
      return;
    }

    if (data === 'cb_cancel_feedback') {
      setFsmState('idle');
      editLastBotMessage(getMainWelcomeText(), getMainKeyboard());
      return;
    }

    if (data === 'cb_faq') {
      const faqText = 
        `❓ <b>Часті питання про поїздки клубу SVOI (FAQ)</b> 💡\n\n` +
        `Зібрали для вас детальні відповіді на найважливіші питання:\n\n` +
        `• 📍 <b>Точки збору:</b> адресний збір (Door-to-Door) по Саарланду, Тріру та Люксембургу!\n` +
        `• 💳 <b>Оплата:</b> працюємо БЕЗ ПЕРЕДОПЛАТИ на всі одноденні поїздки!\n` +
        `• 🚐 <b>Комфорт буса:</b> Opel Vivaro з кліматом, USB та зоряним LED-небом\n` +
        `• ⏱ <b>Таймінг:</b> від 5 до 8 годин вільного часу на локаціях без поспіху!\n\n` +
        `👇 <i>Оберіть потрібну тему нижче:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '📍 Точки збору (Door-to-Door)', callbackData: 'cb_meeting' },
          { text: '📜 Умови поїздок & 0% передоплати', callbackData: 'cb_terms' }
        ],
        [
          { text: '🚐 Фото та комфорт Opel Vivaro', callbackData: 'cb_car' },
          { text: '🤝 Стати партнером клубу', callbackData: 'cb_partner' }
        ],
        [
          { text: '⏱ Скільки часу на локаціях?', callbackData: 'cb_faq_time' },
          { text: '🚶 Як гуляємо на екскурсіях?', callbackData: 'cb_faq_walking' }
        ],
        [
          { text: '🎮 Ігри та гео-вікторини', callbackData: 'cb_games' },
          { text: '✍️ Залишити побажання', callbackData: 'cb_feedback' }
        ],
        [
          { text: '🔙 Повернутися в головне меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(faqText, keyboard);
      return;
    }

    if (data === 'cb_faq_pickup') {
      const text = 
        `📍 <b>Точки збору пасажирів: звідки забираємо та куди привозимо?</b> 🗺\n\n` +
        `🏡 <b>Земля Саарланд, Трір та Люксембург:</b>\n` +
        `• <b>Забираємо всіх за адресою</b> і розвозимо також за адресою!\n\n` +
        `🛣 <b>Збір в інших землях:</b>\n` +
        `Можемо забрати й в інших землях — залежить від маршруту (по дорозі чи ні) або якщо тур не одноденний.\n` +
        `👉 <b>За наявності від 4х осіб можемо забрати з інших земель:</b>\n` +
        `• <b>Хомбург (Homburg Saar)</b> — уточнюйте\n` +
        `• <b>Кайзерслаутерн (Kaiserslautern)</b> — можливий якщо більше 4х осіб і не одноденний тур\n` +
        `• <b>Мангейм / Людвігсхафен (Mannheim)</b> — можливий якщо більше 4х осіб і не одноденний тур\n` +
        `• <b>Франкфурт-на-Майні (Frankfurt am Main)</b> — можливий якщо більше 4х осіб і не одноденний тур\n` +
        `• <b>Карлсруе (Karlsruhe)</b> — для південних напрямків по дорозі\n` +
        `• <b>Страсбург (Strasbourg)</b> — по Франції та Швейцарії\n` +
        `• <b>Бельгія</b> — при поїздках до Нормандії, Голландії та Парижа\n\n` +
        `💬 <i>Напишіть менеджеру для уточнення — можливість підсадки уточнюйте!</i>\n\n` +
        `⏰ <b>Точний час подачі:</b>\n` +
        `Точний час, о котрій за вами заїдуть, надсилається <b>в особистий чат за день увечері перед поїздкою</b>.\n\n` +
        `👥 <b>Чат поїздки з водієм:</b>\n` +
        `Основні питання водієві та щодо поїздки ви зможете поставити у новоствореній одноденній групі для комунікації. <b>Через день група видаляється.</b>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Уточнити підсадку у менеджера', url: MANAGER_URL },
          { text: '🔙 До списку питань', callbackData: 'cb_faq' }
        ],
        [
          { text: '🏠 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }


    if (data === 'cb_faq_walking') {
      const text = 
        `🚶 <b>Як ми гуляємо на локаціях?</b>\n\n` +
        `1. <b>Вступна прогулянка:</b> Після прибуття ми разом знайомимося з ключовими пам'ятками та видовими точками.\n\n` +
        `2. <b>Вільний час:</b> Ви не прив'язані до групи з прапорцем! Гуляйте у власному темпі, відвідуйте музеї, відпочивайте в затишних кафе або влаштовуйте шопінг.\n\n` +
        `3. <b>Підтримка:</b> Організатор завжди на зв'язку в чаті поїздки та ділиться точними локаціями найкращих закладів.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 До списку питань', callbackData: 'cb_faq' },
          { text: '🏠 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_time') {
      const text = 
        `⏱ <b>Скільки часу на локаціях?</b>\n\n` +
        `Ми розраховуємо маршрут так, щоб не було відчуття поспіху:\n\n` +
        `• <b>Одноденні тури (Париж, Амстердам, Брюгге):</b> від 5 до 8 годин чистого часу в місті!\n\n` +
        `• <b>Комбіновані маршрути:</b>\n` +
        `  — 🌊 <b>Етрета + Париж:</b> наприклад, <b>5 годин на скелях Етрета</b> та океані + <b>2–3 години</b> у вечірньому Парижі!\n` +
        `  — 🇨🇭 <b>Швейцарія комбо:</b> <b>3 години Лаутербруннен</b> (долина 72 водоспадів), <b>2 години ущелина Ааре</b>, <b>2 години Берн</b>!\n\n` +
        `• <b>Тури на вихідні (2–3 дні):</b> розмірена програма з ночівлею в комфортабельному готелі.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 До списку питань', callbackData: 'cb_faq' },
          { text: '🏠 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_payment') {
      const text = 
        `💳 <b>Коли та як оплата поїздки?</b>\n\n` +
        `🔥 <b>Ми працюємо БЕЗ ПЕРЕДОПЛАТИ на всі одноденні поїздки!</b>\n\n` +
        `• <b>Одноденні тури:</b> Ви бронюєте місце, а оплачуєте поїздку безпосередньо при посадці в мінівен!\n` +
        `• <b>Багатоденні поїздки (2–3 дні):</b> Передоплата потрібна <b>ТІЛЬКИ для багатоденних турів</b> (для бронювання номерів у готелях).\n` +
        `• <b>Способи оплати:</b> Готівка при посадці (в євро), банківський переказ SEPA / IBAN (Німеччина/ЄС), PayPal.\n` +
        `• <b>Скасування:</b> При попередженні за 72+ години — перенесення або скасування без утримань.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 До списку питань', callbackData: 'cb_faq' },
          { text: '🏠 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_seats') {
      const text = 
        `💺 <b>Як розташовані та регулюються сидіння?</b>\n\n` +
        `У нашому 8-місному мінівені Opel Vivaro сидіння розташовані за схемою 2+3+3:\n\n` +
        `• <b>1-й ряд (поруч із водієм):</b> 2 місця (Місце 1 — центр, Місце 2 — панорамне вікно)\n` +
        `• <b>2-й ряд:</b> 3 місця (Місце 3 — вікно, Місце 4 — центр, Місце 5 — вікно)\n` +
        `• <b>3-й ряд:</b> 3 місця (Місце 6 — вікно, Місце 7 — центр, Місце 8 — вікно)\n\n` +
        `🛋 <b>Комфорт:</b> Регульований нахил спинки для сну, USB-зарядки для смартфонів, кондиціонер.\n` +
        `💵 <b>Вибір місця:</b> Фіксація конкретного місця по порядку — <b>5€</b>. Без вибору (вільна посадка) — <b>0€</b>.`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 До списку питань', callbackData: 'cb_faq' },
          { text: '🏠 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_faq_choose') {
      const text = 
        `🎯 <b>Як обрати тур новачку?</b>\n\n` +
        `🌿 <b>Розмірені тури (для спокійних прогулянок та релаксу):</b>\n` +
        `• <b>Брюгге (110€)</b> — канали, лебеді, шоколад, затишні тераси\n` +
        `• <b>Ельзас + Страсбург (80€)</b> — пряникові фахверкові вулички\n` +
        `• <b>Замок Нойшванштайн (120€)</b> — прогулянка до озера Альпзее та замку\n` +
        `• <b>Лазурове узбережжя (3 дні, 440€)</b> — курортний відпочинок біля моря з готелем\n\n` +
        `⚡️ <b>Тури в темпі (активно, «галопом по Європах»):</b>\n` +
        `• <b>Ліхтенштейн (3 країни за 1 день, 120€)</b> — Ліхтенштейн + Австрія + Швейцарія\n` +
        `• <b>Етрета + Париж (140€)</b> — 5 год скелі Нормандії + 2–3 год Париж\n` +
        `• <b>Швейцарія комбо (120€)</b> — 3 год Лаутербруннен + 2 год ущелина Ааре + 2 год Берн\n` +
        `• <b>Париж чи Амстердам (120€)</b> — максимум вражень за 1 день\n\n` +
        `Напишіть менеджеру @SVOI_travel_admin — ми з радістю допоможемо підібрати тур!`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔙 До списку питань', callbackData: 'cb_faq' },
          { text: '🗺 Каталог турів', callbackData: 'cb_trips' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_games') {
      const gamesText = 
        `🎮 <b>Ігри та вікторини клубу SVOI</b> 🏆\n\n` +
        `Любите подорожі та загадки? Беріть участь в іграх, вигравайте бонуси та Картку Пріоритету!\n\n` +
        `👇 <i>Оберіть активність:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🕵️ Гра «Гео-Детектив»', callbackData: 'cb_game_geo' }
        ],
        [
          { text: '🧠 Вікторина «Правда чи Неправда»', callbackData: 'cb_game_quiz' }
        ],
        [
          { text: '🎁 Розіграші у групі SVOI', callbackData: 'cb_game_group_info' }
        ],
        [
          { text: '🔙 Головне меню', callbackData: 'cb_back' }
        ]
      ];
      editLastBotMessage(gamesText, keyboard);
      return;
    }

    if (data === 'cb_game_geo') {
      const geoText = 
        `🕵️ <b>Гео-Детектив: Вгадайте локацію за описом!</b>\n\n` +
        `«Білосніжні алебастрові скелі та природні арки над Атлантикою, що надихали Клода Моне на шедеври імпресіонізму».\n\n` +
        `<i>Хто перший вгадає, де зроблено цей знімок?</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🇫🇷 Етрета (Нормандія, Франція)', callbackData: 'cb_geocheck_correct' }
        ],
        [
          { text: '🇮🇹 Узбережжя Амальфі', callbackData: 'cb_geocheck_wrong' },
          { text: '🇬🇧 Скелі Дувра', callbackData: 'cb_geocheck_wrong' }
        ],
        [
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(geoText, keyboard, 'https://images.unsplash.com/photo-1549144511-f099e773c147?auto=format&fit=crop&w=1000&q=80');
      return;
    }

    if (data === 'cb_geocheck_correct') {
      const text = 
        `🎉 <b>БРАВО! ВИ СПРАВЖНІЙ ГЕО-ДЕТЕКТИВ!</b> 🏆\n\n` +
        `Це знамениті скелі <b>Етрета</b> в Нормандії! Ми їдемо сюди в турі «Етрета + Париж» (140€).\n\n` +
        `🎁 <b>Ваш приз: КАРТКА ПРІОРИТЕТУ</b>\n` +
        `Промокод: <code>PRIORITY-SVOI5</code>\n` +
        `Дає право <b>безкоштовно обрати будь-яке місце в мінівені (економія 5€)</b> або знижку 10% на першу поїздку!\n\n` +
        `<i>Надішліть промокод менеджеру @SVOI_travel_admin при бронюванні!</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Надіслати менеджеру', url: 'https://t.me/SVOI_travel_admin?text=Вітаю! Я відгадав локацію в Гео-Детективі. Мій промокод PRIORITY-SVOI5.' }
        ],
        [
          { text: '🗺 Обрати тур', callbackData: 'cb_trips' },
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_geocheck_wrong') {
      const text = 
        `🔍 <b>Не зовсім так!</b>\n\n` +
        `Правильна відповідь — легендарні скелі <b>Етрета у Франції</b> на березі Атлантики.\n\n` +
        `Спробуйте ще раз або оберіть іншу гру!`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '🔄 Спробувати знову', callbackData: 'cb_game_geo' },
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_game_quiz') {
      const text = 
        `🧠 <b>Квіз «Правда чи Неправда» (Швейцарія):</b>\n\n` +
        `Чи правда, що у Швейцарії законом заборонено мати лише одну морську свинку?`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '👍 ПРАВДА', callbackData: 'cb_qcheck_1' },
          { text: '👎 НЕПРАВДА', callbackData: 'cb_qcheck_0' }
        ],
        [
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_qcheck_1' || data === 'cb_qcheck_0') {
      const isTrue = data === 'cb_qcheck_1';
      const text = (
        (isTrue ? '🎉 <b>У яблучко! Це чиста правда!</b> 🐹\n\n' : '😮 <b>Сюрприз! Це насправді ПРАВДА!</b> 🐹\n\n') +
        `У Швейцарії закон про захист тварин визнає морських свинок соціальними істотами, які страждають на самоті. Їх дозволено заводити лише парами!\n\n` +
        `Такі незвичайні факти ми розповідаємо в наших турах!`
      );

      const keyboard: InlineBtn[][] = [
        [
          { text: '🗺 Подивитися тури до Швейцарії', callbackData: 'cb_trip_swiss_rhine_zurich' },
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_game_group_info') {
      const text = 
        `📢 <b>Розіграші та вікторини у групі Telegram!</b> 🎟✨\n\n` +
        `<b>Чи може бот проводити вікторини у групі?</b>\n` +
        `👉 <b>ТАК!</b> Бот публікує вікторини через механізм <code>Telegram Quiz</code> із конфеті при правильній відповіді.\n\n` +
        `🔥 <b>Розіграші квитків:</b>\n` +
        `Бот публікує допис із кнопкою участі та в призначений час автоматично обирає випадкового переможця серед підписників групи!\n\n` +
        `Долучайтеся до нашої групи мандрівників:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Перейти до групи SVOI', url: GROUP_URL }
        ],
        [
          { text: '🔙 Меню ігор', callbackData: 'cb_games' }
        ]
      ];
      editLastBotMessage(text, keyboard);
      return;
    }

    if (data === 'cb_book') {
      const bookText = 
        `💺 <b>Вибір місця в мінівені Opel Vivaro (8 пасажирських місць)</b>\n\n` +
        `Схема розсадки:\n` +
        `• <b>1-й ряд:</b> 2 місця поруч із водієм\n` +
        `• <b>2-й ряд:</b> 3 місця (вікно / центр / вікно)\n` +
        `• <b>3-й ряд:</b> 3 місця (вікно / центр / вікно)\n\n` +
        `💵 <b>Умови:</b>\n` +
        `• Фіксація конкретного місця по порядку: <b>+5€</b>\n` +
        `• Без вибору місця (вільна посадка): <b>0€</b>\n\n` +
        `👇 <i>Оберіть місце по порядку:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Місце 1 (поруч з водієм) — 5€', callbackData: 'cb_seat_1_general' },
          { text: '💺 Місце 2 (водій, вікно) — 5€', callbackData: 'cb_seat_2_general' }
        ],
        [
          { text: '💺 Місце 3 (2-й ряд, вікно) — 5€', callbackData: 'cb_seat_3_general' },
          { text: '💺 Місце 4 (2-й ряд, центр) — 5€', callbackData: 'cb_seat_4_general' },
          { text: '💺 Місце 5 (2-й ряд, вікно) — 5€', callbackData: 'cb_seat_5_general' }
        ],
        [
          { text: '💺 Місце 6 (3-й ряд, вікно) — 5€', callbackData: 'cb_seat_6_general' },
          { text: '💺 Місце 7 (3-й ряд, центр) — 5€', callbackData: 'cb_seat_7_general' },
          { text: '💺 Місце 8 (3-й ряд, вікно) — 5€', callbackData: 'cb_seat_8_general' }
        ],
        [
          { text: '🎲 Без вибору місця (вільна посадка) — 0€', callbackData: 'cb_seat_none_general' }
        ],
        [
          { text: '🗺 Обрати тур із каталогу', callbackData: 'cb_trips' },
          { text: '🔙 Назад до меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(bookText, keyboard);
      return;
    }

    if (data.startsWith('cb_book_target_')) {
      const tripId = data.replace('cb_book_target_', '');
      setPendingBookingTrip(tripId);
      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const title = trip ? trip.title : 'Обраний тур';

      const text = 
        `🎯 <b>Бронювання туру: ${title}</b>\n\n` +
        `Оберіть місце в мінівені Opel Vivaro:\n` +
        `• 1-й ряд (поруч із водієм): 2 місця\n` +
        `• 2-й ряд: 3 місця\n` +
        `• 3-й ряд: 3 місця\n\n` +
        `💵 <b>Вартість:</b>\n` +
        `• Конкретне місце: <b>+5€</b>\n` +
        `• Без вибору місця: <b>0€</b>\n\n` +
        `👇 <i>Натисніть плашку потрібного місця по порядку:</i>`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💺 Місце 1 (поруч з водієм) — 5€', callbackData: `cb_seat_1_${tripId}` },
          { text: '💺 Місце 2 (водій, вікно) — 5€', callbackData: `cb_seat_2_${tripId}` }
        ],
        [
          { text: '💺 Місце 3 (2-й ряд, вікно) — 5€', callbackData: `cb_seat_3_${tripId}` },
          { text: '💺 Місце 4 (2-й ряд, центр) — 5€', callbackData: `cb_seat_4_${tripId}` },
          { text: '💺 Місце 5 (2-й ряд, вікно) — 5€', callbackData: `cb_seat_5_${tripId}` }
        ],
        [
          { text: '💺 Місце 6 (3-й ряд, вікно) — 5€', callbackData: `cb_seat_6_${tripId}` },
          { text: '💺 Місце 7 (3-й ряд, центр) — 5€', callbackData: `cb_seat_7_${tripId}` },
          { text: '💺 Місце 8 (3-й ряд, вікно) — 5€', callbackData: `cb_seat_8_${tripId}` }
        ],
        [
          { text: '🎲 Без вибору місця (вільна посадка) — 0€', callbackData: `cb_seat_none_${tripId}` }
        ],
        [
          { text: '🔙 Назад до опису туру', callbackData: `cb_trip_${tripId}` }
        ]
      ];

      editLastBotMessage(text, keyboard);
      return;
    }

    if (data.startsWith('cb_seat_')) {
      const parts = data.split('_');
      const seatCode = parts[2]; // 1..8, none
      const tripId = parts[3];

      const SEAT_DESCRIPTIONS: Record<string, string> = {
        '1': '💺 Місце 1 (1-й ряд, поруч з водієм, центр)',
        '2': '💺 Місце 2 (1-й ряд, поруч з водієм, вікно)',
        '3': '💺 Місце 3 (2-й ряд, біля вікна ліворуч)',
        '4': '💺 Місце 4 (2-й ряд, по центру)',
        '5': '💺 Місце 5 (2-й ряд, біля вікна праворуч)',
        '6': '💺 Місце 6 (3-й ряд, біля вікна ліворуч)',
        '7': '💺 Місце 7 (3-й ряд, по центру)',
        '8': '💺 Місце 8 (3-й ряд, біля вікна праворуч)',
      };

      let seatName = '🎲 Без вибору місця (вільна посадка)';
      let seatFee = 0;
      if (seatCode !== 'none' && SEAT_DESCRIPTIONS[seatCode]) {
        seatName = SEAT_DESCRIPTIONS[seatCode];
        seatFee = 5;
      }

      const trip = TRIPS_LIST.find((t) => t.id === tripId);
      const tripTitle = trip ? trip.title : 'Індивідуальний маршрут';
      const duration = trip ? trip.duration : '1 день';
      const basePrice = trip ? trip.price : 120;
      const totalCost = basePrice + seatFee;
      const bookingCode = `SVOI-${Math.floor(1000 + Math.random() * 9000)}`;

      // Log detailed lead to CRM
      const newLead: LeadItem = {
        id: `lead-${Date.now()}`,
        type: 'booking',
        bookingCode: bookingCode,
        tripTitle: tripTitle,
        duration: duration,
        seatType: seatName,
        basePrice: basePrice,
        seatFee: seatFee,
        totalCost: totalCost,
        meetingPoint: 'Саарланд, Люксембург або Трір (збір за адресою)',
        userName: 'Олександр',
        userHandle: '@alex_travel_de',
        userId: 984128574,
        timestamp: new Date().toLocaleString('uk-UA'),
        status: 'new'
      };
      onNewLead(newLead);

      const managerUrlWithData = `https://t.me/SVOI_travel_admin?text=${encodeURIComponent(`Вітаю! Мій номер броні: #${bookingCode}. Тур: ${tripTitle}, ${seatName}, до оплати: ${totalCost}€.`)}`;

      const confirmText = 
        `🎉 <b>ПІДТВЕРДЖЕННЯ БРОНЮВАННЯ #{bookingCode}</b>\n\n` +
        `Вітаємо, <b>Олександр</b>! Вашу заявку в туристичний клуб <b>SVOI</b> успішно зафіксовано.\n\n` +
        `📋 <b>Деталі поїздки:</b>\n` +
        `• 🗺 <b>Напрямок:</b> ${tripTitle}\n` +
        `• ⏱ <b>Тривалість:</b> ${duration}\n` +
        `• 🚐 <b>Транспорт:</b> Комфортабельне авто Opel Vivaro (8 місць, кондиціонер)\n` +
        `• 💺 <b>Обране місце:</b> ${seatName}\n` +
        `• 📍 <b>Точка збору:</b> Саарланд, Люксембург або Трір (збір за адресою)\n\n` +
        `🧾 <b>Розрахунок вартості:</b>\n` +
        `• Базовий квиток туру: <b>${basePrice}€</b>\n` +
        `• Вибір місця: <b>+${seatFee}€</b>\n` +
        `━━━━━━━━━━━━━━━━━━\n` +
        `💳 <b>РАЗОМ ДО ОПЛАТИ: ${totalCost}€</b>\n` +
        (duration === '1 день' 
          ? `🔥 <b>Бронь БЕЗ ПЕРЕДОПЛАТИ!</b> Оплата здійснюється при посадці.\n\n` 
          : `🏨 <i>Передоплата потрібна лише для бронювання готелю.</i>\n\n`) +
        `👉 <b>Наступний крок:</b> Натисніть кнопку нижче для відправлення даних менеджеру @SVOI_travel_admin для зв'язку:`;

      const keyboard: InlineBtn[][] = [
        [
          { text: '💬 Надіслати бронь менеджеру в Telegram', url: managerUrlWithData }
        ],
        [
          { text: '❓ Часті питання (FAQ)', callbackData: 'cb_faq' },
          { text: '📍 Точки збору', callbackData: 'cb_meeting' }
        ],
        [
          { text: '🗺 Інші тури', callbackData: 'cb_trips' },
          { text: '🔙 Головне меню', callbackData: 'cb_back' }
        ]
      ];

      editLastBotMessage(confirmText, keyboard);
      return;
    }
  };

  const editLastBotMessage = (newText: string, newKeyboard: InlineBtn[][], photoUrl?: string) => {
    setMessages((prev) => {
      const copy = [...prev];
      let lastBotIndex = -1;
      for (let i = copy.length - 1; i >= 0; i--) {
        if (copy[i].sender === 'bot') {
          lastBotIndex = i;
          break;
        }
      }

      if (lastBotIndex !== -1) {
        copy[lastBotIndex] = {
          ...copy[lastBotIndex],
          text: newText,
          inlineKeyboard: newKeyboard,
          photoUrl: photoUrl || undefined,
          edited: true
        };
        return copy;
      }

      return [
        ...copy,
        {
          id: `msg-${Date.now()}`,
          sender: 'bot',
          text: newText,
          time: getCurrentTime(),
          inlineKeyboard: newKeyboard,
          photoUrl: photoUrl
        }
      ];
    });
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userText = inputText.trim();
    setInputText('');

    // Add user message to chat stream
    const userMsg: SimMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: userText,
      time: getCurrentTime()
    };

    setMessages((prev) => [...prev, userMsg]);

    // Handle FSM Feedback
    if (fsmState === 'feedback_waiting') {
      setFsmState('idle');

      // Create CRM lead
      const feedbackLead: LeadItem = {
        id: `fb-${Date.now()}`,
        type: 'feedback',
        userName: 'Олександр',
        userHandle: '@alex_travel_de',
        userId: 984128574,
        text: userText,
        timestamp: new Date().toLocaleString('uk-UA'),
        status: 'new'
      };
      onNewLead(feedbackLead);

      setTimeout(() => {
        const thanksText = 
          `❤️ <b>Дякуємо за ваше звернення!</b>\n\n` +
          `Ваш відгук/побажання успішно передано керівництву клубу SVOI. ` +
          `Ми уважно вивчаємо кожне повідомлення та робимо наші поїздки ще яскравішими!\n\n` +
          `До зустрічі на борту нашого комфортабельного авто Opel Vivaro! 🚐✨`;

        const keyboard: InlineBtn[][] = [
          [
            { text: '🔙 Назад до меню', callbackData: 'cb_back' }
          ]
        ];

        setMessages((prev) => [
          ...prev,
          {
            id: `bot-fb-${Date.now()}`,
            sender: 'bot',
            text: thanksText,
            time: getCurrentTime(),
            inlineKeyboard: keyboard
          }
        ]);
      }, 400);
      return;
    }

    // Handle /channel command or keywords
    if (userText === '/channel' || userText.toLowerCase().includes('канал') || userText.toLowerCase().includes('розіграш')) {
      setTimeout(() => {
        showChannelMenuMessage();
      }, 300);
      return;
    }

    // Default handling for /start or random text
    if (userText === '/start' || userText.toLowerCase().includes('старт') || userText.toLowerCase().includes('меню')) {
      setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `bot-start-${Date.now()}`,
            sender: 'bot',
            text: getMainWelcomeText(),
            time: getCurrentTime(),
            inlineKeyboard: getMainKeyboard()
          }
        ]);
      }, 350);
      return;
    }

    // Default bot reply
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-reply-${Date.now()}`,
          sender: 'bot',
          text: `👋 Вас зрозуміло! Для навігації скористайтеся кнопками меню або надішліть команду /start чи /channel.`,
          time: getCurrentTime(),
          inlineKeyboard: getMainKeyboard()
        }
      ]);
    }, 400);
  };

  const showChannelMenuMessage = () => {
    const text = 
      `📢 <b>Центр керування Telegram-каналом та групою SVOI Travel (/channel)</b>\n\n` +
      `👑 <b>Адміністратор ID:</b> <code>8450153980</code>\n` +
      `📢 <b>Канал:</b> SVOI Travel EU (@Svoi_TravelEU_bot)\n` +
      `💬 <b>Група:</b> Клуб мандрівників\n\n` +
      `<b>Поточний стан активностей:</b>\n` +
      `• 🎁 Активний розіграш: <i>Поїздка до Парижа на 1 день 🥐</i>\n` +
      `• 👥 Учасників у базі: <b>${giveawayParticipantsCount}</b>\n` +
      `• 🤖 Бот є адміністратором каналу та готовий до публікації турів, вікторин та розіграшів!\n\n` +
      `👇 <i>Оберіть дію для керування каналом:</i>`;

    const keyboard: InlineBtn[][] = [
      [
        { text: '🎁 Запустити новий РОЗІГРАШ', callbackData: 'cb_adm_gw_new' },
        { text: '🏆 Вибрати переможця', callbackData: 'cb_adm_gw_pick' }
      ],
      [
        { text: '📢 Опублікувати тур з кнопкою', callbackData: 'cb_adm_post_tour' },
        { text: '🧠 Надіслати вікторину (Квіз)', callbackData: 'cb_adm_send_quiz' }
      ],
      [
        { text: '🚀 Опублікувати Mini App у канал', callbackData: 'cb_adm_post_miniapp' }
      ],
      [
        { text: '🔙 Повернутися до меню', callbackData: 'cb_back' }
      ]
    ];

    editLastBotMessage(text, keyboard);
  };

  const handleReset = () => {
    setFsmState('idle');
    setPendingBookingTrip(null);
    setMessages([
      {
        id: `msg-${Date.now()}`,
        sender: 'bot',
        text: getMainWelcomeText(),
        time: getCurrentTime(),
        inlineKeyboard: getMainKeyboard()
      }
    ]);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Simulator View Controls & Button Border Switcher */}
      <div className="w-full max-w-4xl flex flex-col sm:flex-row items-center justify-between gap-3 mb-4 px-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Device View Mode */}
          <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
            <button
              onClick={() => setViewMode('mobile')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                viewMode === 'mobile'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Smartphone className="w-3.5 h-3.5" />
              Смартфон (Mobile)
            </button>
            <button
              onClick={() => setViewMode('desktop')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-medium transition-all ${
                viewMode === 'desktop'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Monitor className="w-3.5 h-3.5" />
              Telegram Desktop
            </button>
          </div>

          {/* Colored Button Border Style Switcher */}
          <div className="flex items-center gap-1 bg-slate-900/90 border border-slate-800 p-1 rounded-xl text-xs">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1 font-medium">
              <Palette className="w-3.5 h-3.5 text-pink-400" />
              <span className="hidden sm:inline">Обводки:</span>
            </span>
            <button
              onClick={() => setButtonBorderStyle('neon')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1.5 ${
                buttonBorderStyle === 'neon'
                  ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.35)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Яскраві неонові кольорові обводки для кожної категорії"
            >
              <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block animate-pulse" />
              Неон 🌈
            </button>
            <button
              onClick={() => setButtonBorderStyle('subtle')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                buttonBorderStyle === 'subtle'
                  ? 'bg-emerald-500/20 text-emerald-200 border border-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="М'які кольорові обводки"
            >
              Кольорові
            </button>
            <button
              onClick={() => setButtonBorderStyle('classic')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ${
                buttonBorderStyle === 'classic'
                  ? 'bg-slate-800 text-white border border-slate-600'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Стандартний вигляд темного Telegram"
            >
              Класичний
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl transition-all hover:bg-slate-800"
            title="Перезапустити бота (/start)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Скидання /start</span>
          </button>
        </div>
      </div>

      {/* Simulator Container */}
      <div
        className={`transition-all duration-300 w-full ${
          viewMode === 'mobile'
            ? 'max-w-[430px] rounded-2xl sm:rounded-[36px] p-1.5 sm:p-3 bg-slate-950 border-2 sm:border-[6px] border-slate-800 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8)]'
            : 'max-w-4xl rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl'
        }`}
      >
        {/* Telegram Header */}
        <div className="bg-[#17212b] text-white px-3 sm:px-4 py-3 rounded-t-2xl flex items-center justify-between border-b border-[#0e1621] select-none">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-md text-xs sm:text-sm ring-2 ring-blue-500/30">
                SVOI
              </div>
              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#17212b]" />
            </div>

            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-xs sm:text-sm text-white">SVOI Travel EU</span>
                <span className="bg-blue-500/20 text-blue-400 text-[9px] sm:text-[10px] font-bold px-1.5 py-0.2 rounded border border-blue-500/30">
                  bot
                </span>
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#708499]">@Svoi_TravelEU_bot</p>
            </div>
          </div>

          {/* Quick links dropdown / icons */}
          <div className="flex items-center gap-1 sm:gap-1.5">
            <button
              onClick={() => setShowMiniAppModal(true)}
              className="text-[10px] sm:text-[11px] bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-400/60 text-cyan-200 hover:text-white font-extrabold px-2 sm:px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 shadow-[0_0_10px_rgba(34,211,238,0.3)] animate-pulse"
              title="Відкрити SVOI Mini App"
            >
              <Sparkles className="w-3 h-3 text-cyan-300" />
              <span>Mini App</span>
            </button>
            <a
              href={CHANNEL_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] sm:text-[11px] bg-[#242f3d] hover:bg-[#2b394a] text-blue-400 px-2 sm:px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              Канал
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
            <a
              href={MANAGER_URL}
              target="_blank"
              rel="noreferrer"
              className="text-[10px] sm:text-[11px] bg-[#242f3d] hover:bg-[#2b394a] text-emerald-400 px-2 sm:px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
            >
              Менеджер
            </a>
          </div>
        </div>

        {/* Telegram Chat Message Stream */}
        <div className="bg-[#0e1621] p-3 sm:p-4 min-h-[460px] max-h-[580px] overflow-y-auto space-y-3 relative font-sans">
          {/* Subtle Telegram Wallpaper Pattern overlay */}
          <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:16px_16px]" />

          {/* Toast Notification (Simulating callback.answer() alert) */}
          {toastMessage && (
            <div className="sticky top-2 z-30 mx-auto w-max max-w-xs px-3 py-1.5 rounded-full bg-slate-900/95 text-slate-200 border border-slate-700/80 text-xs shadow-xl backdrop-blur-md text-center animate-fade-in flex items-center gap-1.5">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Messages */}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[92%] sm:max-w-[85%] rounded-2xl p-3 shadow-md relative ${
                  msg.sender === 'user'
                    ? 'bg-[#2b5278] text-white rounded-br-none'
                    : 'bg-[#182533] text-slate-100 rounded-bl-none border border-slate-800/80'
                }`}
              >
                {/* Photo preview if available */}
                {msg.photoUrl && (
                  <div className="mb-2.5 rounded-xl overflow-hidden border border-white/10 shadow-inner">
                    <img
                      src={msg.photoUrl}
                      alt="Travel destination"
                      className="w-full h-44 object-cover hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                )}

                {/* HTML content rendering */}
                <div
                  className="text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap select-text"
                  dangerouslySetInnerHTML={{ __html: msg.text }}
                />

                {/* Message Timestamp & Checkmarks */}
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-slate-400 select-none">
                  {msg.edited && <span className="text-[9px] text-slate-500">змінено</span>}
                  <span>{msg.time}</span>
                  {msg.sender === 'user' && <CheckCheck className="w-3 h-3 text-blue-300" />}
                </div>

                {/* Inline Keyboard Container */}
                {msg.inlineKeyboard && msg.inlineKeyboard.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-slate-700/50 space-y-1.5">
                    {msg.inlineKeyboard.map((row, rIdx) => (
                      <div key={rIdx} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}>
                        {row.map((btn, bIdx) => (
                          <button
                            key={bIdx}
                            onClick={() => handleCallbackClick(btn)}
                            className={`w-full text-center py-2 px-2.5 rounded-xl text-xs transition-all duration-200 flex items-center justify-center gap-1.5 select-none ${getInlineButtonStyle(btn, buttonBorderStyle)}`}
                          >
                            <span className="truncate">{btn.text}</span>
                            {btn.url && <ExternalLink className="w-2.5 h-2.5 opacity-70 shrink-0" />}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}

          <div ref={messagesEndRef} />
        </div>

        {/* FSM Notice Bar (Active when waiting for user input) */}
        {fsmState === 'feedback_waiting' && (
          <div className="bg-amber-950/60 border-t border-amber-500/30 px-3 py-1.5 text-xs text-amber-200 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <MessageSquareHeart className="w-3.5 h-3.5 text-amber-400" />
              <span>Режим FSM: <b>FeedbackState.waiting_for_text</b></span>
            </span>
            <button
              onClick={() => handleCallbackClick({ text: 'Скасувати', callbackData: 'cb_cancel_feedback' })}
              className="text-[11px] underline text-amber-300 hover:text-white"
            >
              Скасувати введення
            </button>
          </div>
        )}

        {/* Telegram Input Bar */}
        <form
          onSubmit={handleSendMessage}
          className="bg-[#17212b] p-2 sm:p-2.5 flex items-center gap-2 rounded-b-2xl border-t border-[#0e1621]"
        >
          {/* Telegram WebApp Menu Button with ionic neon glow */}
          <button
            type="button"
            onClick={() => setShowMiniAppModal(true)}
            className="h-10 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-cyan-950/90 to-blue-950/90 hover:from-cyan-900 hover:to-blue-900 text-cyan-300 hover:text-white border-2 border-cyan-400 hover:border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)] flex items-center gap-1.5 text-xs font-black transition-all shrink-0 active:scale-95"
            title="Відкрити SVOI Mini App (Календар та 3D салон)"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span className="font-bold">☰ Меню</span>
          </button>

          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder={
              fsmState === 'feedback_waiting'
                ? 'Напишіть ваш відгук або побажання...'
                : 'Напишіть повідомлення або /start...'
            }
            className={`flex-1 bg-[#242f3d] text-white text-xs sm:text-sm px-3.5 py-2.5 rounded-xl outline-none placeholder:text-[#708499] border transition-colors ${
              fsmState === 'feedback_waiting'
                ? 'border-amber-500/60 focus:border-amber-400 ring-1 ring-amber-500/30'
                : 'border-transparent focus:border-blue-500/60'
            }`}
          />

          <button
            type="submit"
            disabled={!inputText.trim()}
            className="w-10 h-10 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:hover:bg-blue-600 text-white flex items-center justify-center transition-all shadow-md shrink-0"
            title="Надіслати повідомлення"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
      </div>

      {/* Button Color Guide & Quick Command Launcher */}
      <div className="mt-4 w-full max-w-4xl bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Palette className="w-4 h-4" />
            </span>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Кольорові обводки кнопок (Швидкий запуск дій):
              </h4>
              <p className="text-[11px] text-slate-400">
                Кожна категорія дій має власну фірмову неонову обводку. Натисніть кнопку нижче, щоб відкрити її в боті:
              </p>
            </div>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 self-start sm:self-auto font-medium">
            Обводки: {buttonBorderStyle === 'neon' ? 'Яскравий Неон 🌈' : buttonBorderStyle === 'subtle' ? 'М\'який колір' : 'Класичний'}
          </span>
        </div>

        {/* Category Buttons with matching colored borders */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <button
            onClick={() => handleCallbackClick({ text: '🗺 Напрямки та дати', callbackData: 'cb_trips' })}
            className="p-2 rounded-xl bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-200 border-2 border-cyan-400 hover:border-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.3)] flex items-center justify-between transition-all group"
          >
            <span className="font-bold truncate">🗺 Каталог турів</span>
            <span className="text-[10px] text-cyan-400 font-mono">Cyan</span>
          </button>

          <button
            onClick={() => handleCallbackClick({ text: '⚡️ РЕЗЕРВ МІСЦЯ', callbackData: 'cb_book' })}
            className="p-2 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-100 border-2 border-emerald-400 hover:border-emerald-300 shadow-[0_0_14px_rgba(52,211,153,0.35)] flex items-center justify-between transition-all group font-black"
          >
            <span className="truncate">⚡️ РЕЗЕРВ</span>
            <span className="text-[10px] text-emerald-400 font-mono">Emerald</span>
          </button>

          <button
            onClick={() => handleCallbackClick({ text: '🤝 Стати партнером клубу', callbackData: 'cb_partner' })}
            className="p-2 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 text-amber-200 border-2 border-amber-400 hover:border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] flex items-center justify-between transition-all group font-bold"
          >
            <span className="truncate">🤝 Партнерство</span>
            <span className="text-[10px] text-amber-400 font-mono">Gold</span>
          </button>

          <a
            href={CHANNEL_URL}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-sky-950/40 hover:bg-sky-900/60 text-sky-100 border-2 border-sky-400 hover:border-sky-300 shadow-[0_0_14px_rgba(56,189,248,0.35)] flex items-center justify-between transition-all group font-black"
          >
            <span className="truncate">📢 НАШ КАНАЛ</span>
            <span className="text-[10px] text-sky-400 font-mono">Sky</span>
          </a>

          <a
            href={MANAGER_URL}
            target="_blank"
            rel="noreferrer"
            className="p-2 rounded-xl bg-fuchsia-950/40 hover:bg-fuchsia-900/60 text-fuchsia-100 border-2 border-fuchsia-400 hover:border-fuchsia-300 shadow-[0_0_14px_rgba(217,70,239,0.35)] flex items-center justify-between transition-all group font-black"
          >
            <span className="truncate">💬 Менеджер</span>
            <span className="text-[10px] text-fuchsia-400 font-mono">Fuchsia</span>
          </a>

          <button
            onClick={() => setShowMiniAppModal(true)}
            className="p-2 rounded-xl bg-cyan-950/50 hover:bg-cyan-900/70 text-cyan-100 border-2 border-cyan-400 hover:border-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.45)] flex items-center justify-between transition-all group font-black"
          >
            <span className="truncate">🌌 Mini App 3D</span>
            <span className="text-[10px] text-cyan-300 font-mono">Neon</span>
          </button>

          <button
            onClick={() => handleCallbackClick({ text: '⭐ Відгуки туристів', callbackData: 'cb_reviews' })}
            className="p-2 rounded-xl bg-orange-950/40 hover:bg-orange-900/60 text-orange-200 border-2 border-amber-400 hover:border-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] flex items-center justify-between transition-all group font-bold"
          >
            <span className="truncate">⭐ Відгуки</span>
            <span className="text-[10px] text-amber-400 font-mono">Amber</span>
          </button>

          <button
            onClick={() => handleCallbackClick({ text: '❓ Часті питання (FAQ)', callbackData: 'cb_faq' })}
            className="p-2 rounded-xl bg-blue-950/40 hover:bg-blue-900/60 text-blue-200 border-2 border-blue-400 hover:border-blue-300 shadow-[0_0_12px_rgba(96,165,250,0.3)] flex items-center justify-between transition-all group font-bold"
          >
            <span className="truncate">❓ FAQ / Оплата</span>
            <span className="text-[10px] text-blue-400 font-mono">Blue</span>
          </button>
        </div>
      </div>

      {/* Simulator Quick Tips */}
      <div className="mt-3 text-center text-xs text-slate-500">
        💡 Інтерактивний симулятор відтворює реальну логіку aiogram 3.x зі збереженням станів FSM, зміною тексту, запуском Mini App та розіграшами
      </div>

      {/* Telegram Mini App Modal Overlay */}
      {showMiniAppModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 animate-fade-in">
          <div className="w-full max-w-4xl h-[94vh] max-h-[94vh] flex flex-col rounded-2xl sm:rounded-3xl relative overflow-hidden shadow-2xl">
            <SvoiMiniApp
              onNewLead={onNewLead}
              leads={leads}
              onClose={() => setShowMiniAppModal(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
};
