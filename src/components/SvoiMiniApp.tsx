import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Armchair, Compass, Clock, MapPin, 
  Check, CheckCircle2, ChevronRight, User, Phone, 
  Send, ExternalLink, ShieldCheck, Zap, Snowflake, 
  Luggage, Info, Star, Flame, Eye, RefreshCw, X,
  Calendar, CalendarDays, Filter, Wrench, Terminal, Copy,
  Search, Share2, CalendarPlus
} from 'lucide-react';
import { TRIPS_LIST } from '../data/tripsData';
import { TripItem, LeadItem } from '../types';
import { ReviewsCarousel } from './ReviewsCarousel';

interface SvoiMiniAppProps {
  onNewLead?: (lead: LeadItem) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
  leads?: LeadItem[];
}

interface SeatOption {
  id: string;
  name: string;
  row: string;
  rowNumber: number;
  position: 'window' | 'center' | 'driver';
  surcharge: number;
  perks: string[];
  isOccupied?: boolean;
}

const CABIN_SEATS: SeatOption[] = [
  // 1-й ряд (поруч з водієм)
  {
    id: 'seat-1',
    name: 'Місце 1 (1-й ряд, центр)',
    row: '1-й ряд (біля водія)',
    rowNumber: 1,
    position: 'center',
    surcharge: 5,
    perks: ['Панорамний огляд лобового скла', 'Найбільше місця для ніг', 'USB-C Fast Charge']
  },
  {
    id: 'seat-2',
    name: 'Місце 2 (1-й ряд, вікно)',
    row: '1-й ряд (біля водія)',
    rowNumber: 1,
    position: 'window',
    surcharge: 5,
    perks: ['Широкий панорамний вид', 'Окремий вихід', 'Підсклянник та USB-C']
  },
  // 2-й ряд
  {
    id: 'seat-3',
    name: 'Місце 3 (2-й ряд, ліве вікно)',
    row: '2-й ряд (Комфортні сидіння)',
    rowNumber: 2,
    position: 'window',
    surcharge: 5,
    perks: ['Окремий підлокітник', 'Індивідуальний дефлектор AC', 'Тоноване вікно']
  },
  {
    id: 'seat-4',
    name: 'Місце 4 (2-й ряд, центр)',
    row: '2-й ряд (Комфортні сидіння)',
    rowNumber: 2,
    position: 'center',
    surcharge: 5,
    perks: ['Відкидна спинка', 'Чудовий огляд салону', 'Доступ до клімат-контролю']
  },
  {
    id: 'seat-5',
    name: 'Місце 5 (2-й ряд, праве вікно)',
    row: '2-й ряд (Комфортні сидіння)',
    rowNumber: 2,
    position: 'window',
    surcharge: 5,
    perks: ['Зручний вихід через зсувні двері', 'Підлокітник', 'USB зарядка']
  },
  // 3-й ряд
  {
    id: 'seat-6',
    name: 'Місце 6 (3-й ряд, ліве вікно)',
    row: '3-й ряд (Затишний ряд)',
    rowNumber: 3,
    position: 'window',
    surcharge: 5,
    perks: ['Затишне розташування', 'М\'який диван із регулюванням', 'Глибоке вікно']
  },
  {
    id: 'seat-7',
    name: 'Місце 7 (3-й ряд, центр)',
    row: '3-й ряд (Затишний ряд)',
    rowNumber: 3,
    position: 'center',
    surcharge: 0,
    perks: ['Ідеально для компанії або сну', 'М\'яка анатомічна підтримка']
  },
  {
    id: 'seat-8',
    name: 'Місце 8 (3-й ряд, праве вікно)',
    row: '3-й ряд (Затишний ряд)',
    rowNumber: 3,
    position: 'window',
    surcharge: 5,
    perks: ['Гарний бічний огляд', 'Близькість до багажного відсіку']
  }
];

export const SvoiMiniApp: React.FC<SvoiMiniAppProps> = ({ 
  onNewLead, 
  onClose,
  isEmbedded = false,
  leads = []
}) => {
  // Navigation within Mini App
  const [activeStep, setActiveStep] = useState<'tours' | 'seats' | 'checkout'>('tours');
  const [selectedTrip, setSelectedTrip] = useState<TripItem>(TRIPS_LIST[0]);
  const [selectedSeat, setSelectedSeat] = useState<SeatOption | null>(CABIN_SEATS[1]); // Default front row window
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string>(
    TRIPS_LIST[0]?.departureDates?.[0] || '25.10.2026 (Нд)'
  );
  const [filterDuration, setFilterDuration] = useState<'all' | '1day' | 'multiday'>('all');
  const [filterDateWeekend, setFilterDateWeekend] = useState<string>('all');
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<'oct' | 'nov' | 'dec'>('oct');
  const [starlightCeiling, setStarlightCeiling] = useState(true);

  // Form states
  const [passengerName, setPassengerName] = useState('Олександр');
  const [passengerHandle, setPassengerHandle] = useState('@alex_traveler');
  const [passengerPhone, setPassengerPhone] = useState('+49 170 1234567');
  const [pickupCity, setPickupCity] = useState('Саарланд (за адресою)');
  const [pickupAddress, setPickupAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Developer Mode Simulation States (imitate Telegram initData)
  const [isDevMode, setIsDevMode] = useState<boolean>(false);
  const [showDevInspector, setShowDevInspector] = useState<boolean>(false);
  const [devToast, setDevToast] = useState<string | null>(null);
  const [copiedInitData, setCopiedInitData] = useState<boolean>(false);

  const handleToggleDevMode = () => {
    triggerHaptic('medium');
    if (!isDevMode) {
      const mockUser = {
        id: 845015398,
        first_name: 'Олександр (Dev)',
        last_name: 'Мандрівник',
        username: 'alex_traveler_dev',
        language_code: 'uk',
        is_premium: true
      };
      const nowTs = Math.floor(Date.now() / 1000);
      const mockInitData = `query_id=AAHl3mDZU00jncjJ52TyGTHm&user=${encodeURIComponent(JSON.stringify(mockUser))}&auth_date=${nowTs}&hash=9f438b17c8d990b7e21a84cd803e1e07b22a61358914b72804c7d0a2046421bb`;

      // Mock Telegram WebApp object in window
      if (typeof window !== 'undefined') {
        const win = window as any;
        win.Telegram = win.Telegram || {};
        win.Telegram.WebApp = {
          ...(win.Telegram.WebApp || {}),
          initData: mockInitData,
          initDataUnsafe: {
            query_id: 'AAHl3mDZU00jncjJ52TyGTHm',
            user: mockUser,
            auth_date: String(nowTs),
            hash: '9f438b17c8d990b7e21a84cd803e1e07b22a61358914b72804c7d0a2046421bb'
          },
          version: '7.10',
          platform: 'ios',
          colorScheme: 'dark',
          themeParams: {
            bg_color: '#070b14',
            text_color: '#ffffff',
            hint_color: '#708499',
            link_color: '#22d3ee',
            button_color: '#0284c7',
            button_text_color: '#ffffff'
          },
          isExpanded: true,
          viewportHeight: 740,
          viewportStableHeight: 740,
          headerColor: '#070b14',
          backgroundColor: '#070b14',
          ready: () => console.log('[Dev WebApp] tg.ready() OK'),
          expand: () => console.log('[Dev WebApp] tg.expand() OK'),
          close: () => {
            console.log('[Dev WebApp] tg.close() called');
            if (onClose) onClose();
          },
          sendData: (data: string) => {
            console.log('[Dev WebApp] tg.sendData() transmitted:', data);
            setDevToast(`📤 tg.sendData: надіслано в бот ${data.length} байт`);
            setTimeout(() => setDevToast(null), 4000);
          },
          HapticFeedback: {
            impactOccurred: (style: string) => console.log('[Dev WebApp] Haptic impact:', style),
            notificationOccurred: (type: string) => console.log('[Dev WebApp] Haptic notification:', type),
            selectionChanged: () => console.log('[Dev WebApp] Haptic selectionChanged')
          }
        };
      }

      setPassengerName('Олександр (Dev)');
      setPassengerHandle('@alex_traveler_dev');
      setPassengerPhone('+49 170 1234567');
      setPickupAddress('Bahnhofstraße 12, 66111 Saarbrücken');
      setIsDevMode(true);
      setShowDevInspector(true);
      setDevToast('🛠 Режим розробника увімкнено! Імітовано отримання initData з Telegram');
      setTimeout(() => setDevToast(null), 3500);
    } else {
      setIsDevMode(false);
      setShowDevInspector(false);
      setDevToast('Режим розробника вимкнено.');
      setTimeout(() => setDevToast(null), 2500);
    }
  };

  // Search, Price Range Slider, Add-to-Calendar & Share states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(450);
  const [priceSortOrder, setPriceSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [calendarAddedTrips, setCalendarAddedTrips] = useState<Record<string, boolean>>({});
  const [shareModalTrip, setShareModalTrip] = useState<TripItem | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);

  // GitHub Pages / Public URL Binder Modal state
  const [showUrlSetupModal, setShowUrlSetupModal] = useState<boolean>(false);
  const [publicMiniAppUrl, setPublicMiniAppUrl] = useState<string>('https://username.github.io/svoi-miniapp/?miniapp=1');
  const [isSavingBotUrl, setIsSavingBotUrl] = useState<boolean>(false);

  const handleSavePublicUrlToBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicMiniAppUrl.startsWith('https://')) {
      setDevToast('⚠️ Посилання має починатися з https://');
      setTimeout(() => setDevToast(null), 3500);
      return;
    }
    setIsSavingBotUrl(true);
    try {
      const urlWithParam = publicMiniAppUrl.includes('miniapp=1')
        ? publicMiniAppUrl
        : `${publicMiniAppUrl.replace(/\/$/, '')}/?miniapp=1`;
      const resp = await fetch('/api/telegram/set-miniapp-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ miniAppUrl: urlWithParam })
      });
      const data = await resp.json();
      if (data.ok) {
        triggerHaptic('success');
        setPublicMiniAppUrl(urlWithParam);
        setDevToast('✅ Нову адресу Mini App успішно прив’язано до @Svoi_TravelEU_bot!');
        setShowUrlSetupModal(false);
      } else {
        setDevToast(`⚠️ Помилка Telegram API: ${data.description || data.error || 'Невідома помилка'}`);
      }
    } catch (_err) {
      setDevToast('⚠️ Помилка з’єднання з сервером');
    } finally {
      setIsSavingBotUrl(false);
      setTimeout(() => setDevToast(null), 4000);
    }
  };

  const handleAddToCalendar = (e: React.MouseEvent, trip: TripItem, dateStr?: string) => {
    e.stopPropagation();
    triggerHaptic('success');
    const chosenDate = dateStr || (selectedTrip.id === trip.id ? selectedDepartureDate : trip.departureDates?.[0]) || '25.10.2026';
    setCalendarAddedTrips((prev) => ({ ...prev, [trip.id]: true }));
    setDevToast(`📅 Дату виїзду «${trip.shortTitle}» (${chosenDate}) додано до системного Календаря пристрою!`);
    setTimeout(() => setDevToast(null), 4000);
  };

  const handleShareTrip = (e: React.MouseEvent, trip: TripItem) => {
    e.stopPropagation();
    triggerHaptic('light');
    setShareModalTrip(trip);
    setCopiedShareLink(false);
    setDevToast(`📤 Поширення туру «${trip.shortTitle}» у Telegram...`);
    setTimeout(() => setDevToast(null), 3500);
  };

  // Filtered tours by search query, price range slider, duration, and calendar date
  const filteredTrips = useMemo(() => {
    const filtered = TRIPS_LIST.filter(trip => {
      // Price range filter
      if (trip.price > maxPriceFilter) return false;

      // Search query filter (by title, shortTitle, badge/country, description, highlights)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = trip.title.toLowerCase().includes(q) || trip.shortTitle.toLowerCase().includes(q);
        const matchCountry = (trip.badge || '').toLowerCase().includes(q);
        const matchDesc = trip.description.toLowerCase().includes(q);
        const matchHighlights = trip.highlights.some(h => h.toLowerCase().includes(q));
        if (!matchTitle && !matchCountry && !matchDesc && !matchHighlights) return false;
      }

      // Duration filter
      if (filterDuration === '1day' && trip.duration !== '1 день') return false;
      if (filterDuration === 'multiday' && trip.duration === '1 день') return false;
      
      // Date filter
      if (filterDateWeekend !== 'all') {
        const dates = trip.departureDates || [];
        if (filterDateWeekend === '24-25.10') {
          if (!dates.some(d => d.includes('24.10') || d.includes('25.10'))) return false;
        } else if (filterDateWeekend === '31.10-01.11') {
          if (!dates.some(d => d.includes('31.10') || d.includes('01.11') || d.includes('30.10'))) return false;
        } else if (filterDateWeekend === '07-08.11') {
          if (!dates.some(d => d.includes('07.11') || d.includes('08.11') || d.includes('06.11'))) return false;
        } else if (filterDateWeekend === '14-15.11') {
          if (!dates.some(d => d.includes('14.11') || d.includes('15.11'))) return false;
        } else if (filterDateWeekend === '21-22.11') {
          if (!dates.some(d => d.includes('21.11') || d.includes('22.11') || d.includes('20.11'))) return false;
        } else if (filterDateWeekend === '28-29.11') {
          if (!dates.some(d => d.includes('28.11') || d.includes('29.11') || d.includes('27.11'))) return false;
        } else if (filterDateWeekend === '12.2026' || filterDateWeekend === 'dec.2026') {
          if (!dates.some(d => d.includes('12.2026') || d.includes('12.'))) return false;
        } else {
          // Specific date substring e.g. "24.10" or "01.11"
          if (!dates.some(d => d.includes(filterDateWeekend))) return false;
        }
      }
      return true;
    });

    if (priceSortOrder === 'asc') {
      return [...filtered].sort((a, b) => a.price - b.price);
    }
    if (priceSortOrder === 'desc') {
      return [...filtered].sort((a, b) => b.price - a.price);
    }
    return filtered;
  }, [searchQuery, maxPriceFilter, priceSortOrder, filterDuration, filterDateWeekend]);

  // Native Telegram WebApp SDK initialization and auto-detection
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        tg.ready();
        tg.expand();
        if (tg.enableClosingConfirmation) {
          tg.enableClosingConfirmation();
        }
        if (tg.setHeaderColor) {
          tg.setHeaderColor('#070b14');
        }
        if (tg.setBackgroundColor) {
          tg.setBackgroundColor('#070b14');
        }
        // Autofill user profile from Telegram context
        const user = tg.initDataUnsafe?.user;
        if (user) {
          if (user.first_name) {
            setPassengerName(`${user.first_name}${user.last_name ? ' ' + user.last_name : ''}`);
          }
          if (user.username) {
            setPassengerHandle(`@${user.username}`);
          }
        }
      }
    } catch (e) {
      console.warn('Telegram WebApp init warning', e);
    }
  }, []);

  // Sync Telegram native BackButton
  useEffect(() => {
    try {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp?.BackButton) {
        const backBtn = (window as any).Telegram.WebApp.BackButton;
        if (activeStep !== 'tours') {
          backBtn.show();
          const handleBack = () => {
            if (activeStep === 'checkout') {
              setActiveStep('seats');
            } else {
              setActiveStep('tours');
            }
          };
          backBtn.onClick(handleBack);
          return () => {
            backBtn.offClick(handleBack);
          };
        } else {
          backBtn.hide();
        }
      }
    } catch {
      // Ignore
    }
  }, [activeStep]);

  // Pricing calculations
  const basePrice = selectedTrip.price;
  const seatSurcharge = selectedSeat ? selectedSeat.surcharge : 0;
  const totalPrice = basePrice + seatSurcharge;

  // Safe Telegram WebApp HapticFeedback helper with Web Vibration API fallback
  const triggerHaptic = (
    type: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' | 'success' | 'warning' | 'error' | 'selection' = 'light'
  ) => {
    try {
      if (
        typeof window !== 'undefined' &&
        (window as any).Telegram?.WebApp?.HapticFeedback
      ) {
        const haptic = (window as any).Telegram.WebApp.HapticFeedback;
        if (type === 'success' || type === 'warning' || type === 'error') {
          haptic.notificationOccurred(type);
        } else if (type === 'selection') {
          haptic.selectionChanged();
        } else {
          haptic.impactOccurred(type);
        }
      }
      // Also trigger light device vibration via standard Web Vibration API when supported
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        if (type === 'selection' || type === 'light' || type === 'soft') {
          navigator.vibrate(12);
        } else if (type === 'success') {
          navigator.vibrate([15, 30, 20]);
        } else {
          navigator.vibrate(20);
        }
      }
    } catch {
      // Gracefully silent in standard browser mode
    }
  };

  const handleSelectTrip = (trip: TripItem, chosenDate?: string) => {
    triggerHaptic('medium');
    setSelectedTrip(trip);
    if (chosenDate) {
      setSelectedDepartureDate(chosenDate);
    } else if (trip.departureDates && trip.departureDates.length > 0) {
      setSelectedDepartureDate(trip.departureDates[0]);
    }
    setActiveStep('seats');
  };

  const handleSubmitBooking = (e: React.FormEvent) => {
    e.preventDefault();
    triggerHaptic('heavy');
    setIsSubmitting(true);

    const bookingCode = `SVOI-MINI-${Math.floor(1000 + Math.random() * 9000)}`;
    const newLead: LeadItem = {
      id: `lead-mini-${Date.now()}`,
      type: 'booking',
      bookingCode,
      tripTitle: `${selectedTrip.title} • ${selectedDepartureDate}`,
      duration: selectedTrip.duration,
      seatType: selectedSeat ? selectedSeat.name : 'Вільна посадка (0€)',
      basePrice,
      seatFee: seatSurcharge,
      totalCost: totalPrice,
      meetingPoint: pickupAddress.trim() ? `${pickupCity}: ${pickupAddress.trim()}` : pickupCity,
      userName: passengerName,
      userHandle: passengerHandle.startsWith('@') ? passengerHandle : `@${passengerHandle}`,
      userId: 8450153980,
      timestamp: new Date().toLocaleString('uk-UA'),
      status: 'new'
    };

    if (onNewLead) {
      onNewLead(newLead);
    }

    // Try Telegram WebApp API if running inside real Telegram
    try {
      if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
        const tg = (window as any).Telegram.WebApp;
        triggerHaptic('success');
        // Note: sendData only works when WebApp is opened via KeyboardButton.
        // For inline buttons or menu button, Telegram throws an error if called, so catch safely.
        if (typeof tg.sendData === 'function') {
          try {
            tg.sendData(JSON.stringify({
              action: 'book_trip',
              trip: selectedTrip.shortTitle,
              date: selectedDepartureDate,
              seat: selectedSeat?.name,
              total: totalPrice,
              code: bookingCode
            }));
          } catch (innerErr) {
            console.warn('tg.sendData not allowed in current launch mode (inline/menu button):', innerErr);
          }
        }
      }
    } catch (err) {
      console.warn('Telegram WebApp context error caught:', err);
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setOrderSuccess(true);
      triggerHaptic('success');
    }, 600);
  };

  return (
    <div className={`relative w-full ${isEmbedded ? 'max-w-md mx-auto rounded-2xl sm:rounded-3xl' : 'max-w-5xl mx-auto rounded-2xl sm:rounded-3xl'} bg-[#070b19] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100 flex flex-col h-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden font-sans select-none`}>
      {/* Dynamic Cosmic Stars & Nebula Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        {/* Subtle Constellation Grid */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Telegram Mini App Header Bar */}
      <div className="relative z-10 bg-slate-950/85 backdrop-blur-xl border-b border-cyan-500/20 px-3 sm:px-4 py-2.5 sm:py-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-amber-400 p-[1.5px] shadow-lg shadow-cyan-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-xs text-cyan-300">
                ✨
              </div>
            </div>
            {starlightCeiling && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 sm:w-2.5 sm:h-2.5 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-wide">SVOI Mini App</span>
              <span className="px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Зоряне небо 🌌
              </span>
            </div>
            <p className="text-[10px] sm:text-[11px] text-slate-400 hidden xs:block">Opel Vivaro & 14 турів Європою</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* GitHub Pages / Public URL Binder Button */}
          <button
            onClick={() => {
              triggerHaptic('light');
              setShowUrlSetupModal(true);
            }}
            className="px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-bold bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-400/50 text-indigo-200 hover:text-white transition-all flex items-center gap-1 shadow-sm active:scale-95"
            title="Налаштувати публічне посилання GitHub Pages для відкриття в Telegram"
          >
            <ExternalLink className="w-3 h-3 text-indigo-400 shrink-0" />
            <span className="hidden md:inline">GitHub URL для ТГ</span>
            <span className="md:hidden">URL ТГ</span>
          </button>

          {/* Developer Mode Simulator Trigger Button */}
          <button
            onClick={handleToggleDevMode}
            className={`px-2.5 sm:px-3 py-1 rounded-xl text-[11px] font-extrabold border transition-all flex items-center gap-1.5 shadow-sm active:scale-95 ${
              isDevMode 
                ? 'bg-amber-500/25 border-amber-400 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.4)] ring-1 ring-amber-400/50' 
                : 'bg-amber-950/40 hover:bg-amber-900/60 border-amber-500/40 text-amber-300 hover:text-white'
            }`}
            title="Імітувати отримання initData від Telegram WebApp SDK"
          >
            <Wrench className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="truncate">{isDevMode ? '🛠 Dev Mode: ON' : '🛠 Запустити в режимі розробника'}</span>
          </button>

          {/* Starlight toggle */}
          <button
            onClick={() => {
              triggerHaptic('soft');
              setStarlightCeiling(!starlightCeiling);
            }}
            className={`px-2 sm:px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
              starlightCeiling 
                ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200 shadow-[0_0_12px_rgba(34,211,238,0.3)]' 
                : 'bg-slate-900 border-slate-700 text-slate-400'
            }`}
            title="Увімкнути/вимкнути зоряне небо в салоні"
          >
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="hidden sm:inline">Зоряне небо</span>
          </button>

          {onClose && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all shrink-0"
              title="Закрити Mini App"
            >
              <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Dev Mode Simulated Telegram Status Banner & Inspector */}
      {isDevMode && (
        <div className="relative z-20 bg-amber-950/80 border-b border-amber-500/40 px-3 sm:px-4 py-2 text-xs text-amber-200 space-y-1.5 shrink-0 animate-fade-in backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-extrabold text-amber-300 flex items-center gap-1 text-[11px]">
                <Terminal className="w-3.5 h-3.5" />
                <span>Telegram WebApp: initData змодельовано</span>
              </span>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30 font-mono">
                @alex_traveler_dev (ID: 845015398)
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowDevInspector(!showDevInspector)}
                className="px-2 py-0.5 rounded-lg bg-amber-900/60 hover:bg-amber-800 text-[10px] text-amber-100 font-semibold border border-amber-500/40 transition-all"
              >
                {showDevInspector ? 'Сховати інспектор' : 'Показати JSON initData'}
              </button>
              <button
                onClick={() => {
                  triggerHaptic('success');
                  setDevToast('✨ Тестовий Haptic Pulse (success) відтворено!');
                  setTimeout(() => setDevToast(null), 2500);
                }}
                className="px-2 py-0.5 rounded-lg bg-amber-900/40 hover:bg-amber-800 text-[10px] text-amber-200 transition-all"
                title="Перевірити тактильну вібрацію HapticFeedback"
              >
                Тест Haptic
              </button>
              <button
                onClick={handleToggleDevMode}
                className="w-5 h-5 rounded-md bg-amber-900/80 hover:bg-amber-800 text-amber-300 hover:text-white flex items-center justify-center text-[10px]"
                title="Вимкнути режим розробника"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Expanded Inspector Panel */}
          {showDevInspector && (
            <div className="mt-2 p-2.5 rounded-xl bg-slate-950/90 border border-amber-500/30 text-[11px] font-mono text-slate-300 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-slate-400 pb-1 border-b border-slate-800">
                <span>Імітований об'єкт window.Telegram.WebApp.initDataUnsafe:</span>
                <button
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      JSON.stringify((window as any).Telegram?.WebApp?.initDataUnsafe || {}, null, 2)
                    );
                    setCopiedInitData(true);
                    setTimeout(() => setCopiedInitData(false), 2000);
                  }}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300"
                >
                  <Copy className="w-3 h-3" />
                  <span>{copiedInitData ? 'Скопійовано!' : 'Копіювати JSON'}</span>
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                <div>
                  <span className="text-amber-400">user.first_name:</span> "Олександр (Dev)"<br />
                  <span className="text-amber-400">user.username:</span> "@alex_traveler_dev"<br />
                  <span className="text-amber-400">user.id:</span> 845015398<br />
                  <span className="text-amber-400">user.is_premium:</span> true
                </div>
                <div>
                  <span className="text-cyan-400">platform:</span> "ios" (модельована)<br />
                  <span className="text-cyan-400">version:</span> "7.10"<br />
                  <span className="text-cyan-400">themeParams.bg_color:</span> "#070b14"<br />
                  <span className="text-emerald-400">HapticFeedback:</span> Активний
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Dev Toast Notification */}
      {devToast && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 bg-slate-950/95 border border-amber-500/60 shadow-2xl rounded-2xl px-4 py-2 text-xs text-amber-200 flex items-center gap-2 animate-bounce">
          <Wrench className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{devToast}</span>
        </div>
      )}

      {/* Mini App Tab Navigation Bar */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-md px-2 sm:px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1 sm:gap-1.5 w-full">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('tours');
            }}
            className={`flex-1 py-1.5 px-2.5 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeStep === 'tours'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="truncate">1. Тури ({TRIPS_LIST.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('seats');
            }}
            className={`flex-1 py-1.5 px-2.5 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeStep === 'seats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            <span className="truncate">2. Салон 3D</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('checkout');
            }}
            className={`flex-1 py-1.5 px-2.5 sm:px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeStep === 'checkout'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate">3. Бронь ({totalPrice}€)</span>
          </button>
        </div>
      </div>

      {/* Main Mini App Body Area */}
      <div className="relative z-10 p-3 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(6,182,212,0.3)_transparent]">
        {/* ================= STEP 1: 14 TOURS SHOWCASE ================= */}
        {activeStep === 'tours' && (
          <div className="space-y-4 pb-12 sm:pb-6">
            {/* Header intro & filters */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                    <Compass className="w-5 h-5 text-cyan-400" />
                    <span>Вітрина всіх 14 турів Європою</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Оберіть тур та точну дату виїзду — 0% передоплати на одноденні поїздки!
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  {/* Calendar Modal Trigger Button */}
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setShowCalendarModal(true);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 text-cyan-300 hover:text-white border border-cyan-400/50 font-bold text-xs flex items-center gap-1.5 transition-all shadow-[0_0_12px_rgba(34,211,238,0.25)]"
                    title="Відкрити інтерактивний календар турів"
                  >
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Календар дат</span>
                  </button>

                  {/* Filter pills */}
                  <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        filterDuration === 'all' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Усі (14)
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('1day');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        filterDuration === '1day' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      1 день
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('multiday');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-all ${
                        filterDuration === 'multiday' ? 'bg-cyan-600 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      2-3 дні
                    </button>
                  </div>
                </div>
              </div>

              {/* Search Bar for Filtering by Tour Name or Destination Country */}
              <div className="relative">
                <Search className="w-4 h-4 text-cyan-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Пошук туру за назвою або країною (наприклад: Париж, Італія, Бельгія, Швейцарія)..."
                  className="w-full bg-slate-950/90 border border-slate-800 focus:border-cyan-400 rounded-xl pl-10 pr-24 py-2.5 text-xs sm:text-sm text-white placeholder:text-slate-500 outline-none transition-all shadow-inner focus:shadow-[0_0_15px_rgba(34,211,238,0.2)]"
                />
                {searchQuery.trim().length > 0 ? (
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setSearchQuery('');
                    }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white flex items-center gap-1 transition-all"
                  >
                    <X className="w-3 h-3" />
                    <span>Очистити</span>
                  </button>
                ) : (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono hidden sm:inline">
                    {filteredTrips.length} / {TRIPS_LIST.length} турів
                  </span>
                )}
              </div>

              {/* Quick Country Filter Tags */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-none">
                <span className="text-slate-500 font-semibold shrink-0">Країни:</span>
                {[
                  { q: '', label: '🌍 Всі країни' },
                  { q: 'Франція', label: '🇫🇷 Франція' },
                  { q: 'Італія', label: '🇮🇹 Італія' },
                  { q: 'Швейцарія', label: '🇨🇭 Швейцарія' },
                  { q: 'Бельгія', label: '🇧🇪 Бельгія' },
                  { q: 'Нідерланди', label: '🇳🇱 Нідерланди' },
                  { q: 'Німеччина', label: '🇩🇪 Німеччина' },
                  { q: 'Люксембург', label: '🇱🇺 Люксембург' }
                ].map((c) => {
                  const isCountryActive = searchQuery.toLowerCase() === c.q.toLowerCase();
                  return (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setSearchQuery(c.q);
                      }}
                      className={`px-2.5 py-1 rounded-lg font-medium shrink-0 transition-all border ${
                        isCountryActive
                          ? 'bg-indigo-600/30 border-indigo-400 text-white font-bold shadow-sm'
                          : 'bg-slate-950/60 border-slate-800/80 text-slate-400 hover:text-white'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Price Range Slider & Price Sorting Controls */}
              <div className="p-3 rounded-2xl bg-slate-950/85 border border-slate-800/90 space-y-2.5 shadow-inner">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 flex items-center gap-1.5">
                      💶 Діапазон цін:
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold">
                      від 80€ до {maxPriceFilter}€
                    </span>
                  </div>

                  {/* Sort Order Pills (Cheapest -> Most Expensive) */}
                  <div className="flex items-center gap-1 text-[11px]">
                    <span className="text-slate-500 hidden sm:inline mr-1">Сортування:</span>
                    {[
                      { id: 'default', label: 'За замовч.' },
                      { id: 'asc', label: 'Від найдешевших ↑' },
                      { id: 'desc', label: 'Від дорожчих ↓' }
                    ].map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setPriceSortOrder(s.id as 'default' | 'asc' | 'desc');
                        }}
                        className={`px-2 py-0.5 rounded-lg font-semibold transition-all border ${
                          priceSortOrder === s.id
                            ? 'bg-emerald-600/30 border-emerald-400 text-emerald-200 shadow-sm'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Range Input Slider */}
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-mono text-slate-400 shrink-0">80€</span>
                  <input
                    type="range"
                    min={80}
                    max={450}
                    step={10}
                    value={maxPriceFilter}
                    onChange={(e) => setMaxPriceFilter(Number(e.target.value))}
                    className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                  />
                  <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">450€</span>
                </div>

                {/* Quick Price Preset Chips */}
                <div className="flex flex-wrap items-center justify-between gap-1.5 pt-0.5">
                  <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                    {[
                      { price: 100, label: '🔥 До 100€ (Бюджетні)' },
                      { price: 120, label: '✨ До 120€ (Хіти 1 день)' },
                      { price: 150, label: '🌊 До 150€' },
                      { price: 300, label: '🏔 До 300€ (2 дні)' },
                      { price: 450, label: '💎 Усі ціни (до 450€)' }
                    ].map((preset) => (
                      <button
                        key={preset.price}
                        type="button"
                        onClick={() => {
                          triggerHaptic('selection');
                          setMaxPriceFilter(preset.price);
                        }}
                        className={`px-2 py-0.5 rounded-lg font-medium transition-all border ${
                          maxPriceFilter === preset.price
                            ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 font-bold'
                            : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-white'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Показано: <b className="text-cyan-300">{filteredTrips.length}</b> із {TRIPS_LIST.length}
                  </span>
                </div>
              </div>

              {/* Quick Weekend & Date Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] scrollbar-thin">
                <span className="text-slate-500 font-semibold shrink-0 flex items-center gap-1">
                  <Filter className="w-3 h-3 text-cyan-400" />
                  <span>Дати:</span>
                </span>
                {[
                  { id: 'all', label: 'Всі дати' },
                  { id: '24-25.10', label: '24–25 Жовтня' },
                  { id: '31.10-01.11', label: '31 Жовтня – 01 Листопада' },
                  { id: '07-08.11', label: '07–08 Листопада' },
                  { id: '14-15.11', label: '14–15 Листопада' },
                  { id: '21-22.11', label: '21–22 Листопада' },
                  { id: '28-29.11', label: '28–29 Листопада' },
                  { id: '12.2026', label: '❄️ Грудень 2026' }
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      triggerHaptic('selection');
                      setFilterDateWeekend(item.id);
                    }}
                    className={`px-2.5 py-1 rounded-xl font-medium shrink-0 transition-all border ${
                      filterDateWeekend === item.id
                        ? 'bg-cyan-500/25 border-cyan-400 text-white font-bold shadow-[0_0_10px_rgba(34,211,238,0.3)]'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Active Filter Notice */}
              {(filterDateWeekend !== 'all' || searchQuery.trim().length > 0 || maxPriceFilter < 450 || priceSortOrder !== 'default') && (
                <div className="flex items-center justify-between bg-cyan-950/40 border border-cyan-500/30 px-3 py-1.5 rounded-xl text-xs text-cyan-200">
                  <span className="flex items-center gap-1.5 flex-wrap">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Знайдено турів: <b>{filteredTrips.length}</b>
                      {searchQuery.trim() && <> за запитом «<b>{searchQuery}</b>»</>}
                      {maxPriceFilter < 450 && <> • ціна до <b>{maxPriceFilter}€</b></>}
                      {filterDateWeekend !== 'all' && <> • дати <b>{filterDateWeekend}</b></>}
                    </span>
                  </span>
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setFilterDateWeekend('all');
                      setSearchQuery('');
                      setMaxPriceFilter(450);
                      setPriceSortOrder('default');
                      setFilterDuration('all');
                    }}
                    className="text-[11px] underline text-cyan-400 hover:text-white shrink-0 ml-2"
                  >
                    Скинути всі фільтри
                  </button>
                </div>
              )}
            </div>

            {/* Empty Search State */}
            {filteredTrips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-slate-950/80 border border-slate-800 text-center space-y-3"
              >
                <Search className="w-8 h-8 text-slate-500 mx-auto" />
                <h4 className="text-sm font-bold text-white">За обраними параметрами турів не знайдено</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Спробуйте збільшити максимальну ціну на повзунку, змінити пошуковий запит або скинути фільтри.
                </p>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSearchQuery('');
                    setMaxPriceFilter(450);
                    setPriceSortOrder('default');
                    setFilterDuration('all');
                    setFilterDateWeekend('all');
                  }}
                  className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all"
                >
                  Показати всі 14 турів
                </button>
              </motion.div>
            ) : (
              /* Tours Grid with Framer Motion Entrance / Exit / Layout Animations */
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((trip, idx) => {
                    const isSelected = selectedTrip.id === trip.id;
                    const isCalendarSaved = Boolean(calendarAddedTrips[trip.id]);

                    return (
                      <motion.div
                        layout
                        key={trip.id}
                        initial={{ opacity: 0, y: 24, scale: 0.94 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -18, scale: 0.92 }}
                        transition={{
                          type: 'spring',
                          stiffness: 340,
                          damping: 26,
                          delay: Math.min(idx * 0.035, 0.25)
                        }}
                        onClick={() => handleSelectTrip(trip)}
                        className={`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-colors duration-300 flex flex-col justify-between ${
                          isSelected
                            ? 'border-cyan-400 bg-slate-900/90 shadow-[0_0_20px_rgba(34,211,238,0.3)] ring-1 ring-cyan-500/50'
                            : 'border-slate-800 hover:border-cyan-500/50 bg-slate-950/70 hover:bg-slate-900/60'
                        }`}
                      >
                      {/* Tour Photo */}
                      <div className="relative h-44 w-full overflow-hidden">
                        <img
                          src={trip.image}
                          alt={trip.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
                        
                        {/* Badge Top Left */}
                        <span className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-lg bg-slate-950/80 backdrop-blur-md text-[11px] font-bold text-cyan-300 border border-cyan-500/30 shadow-md">
                          {trip.badge}
                        </span>

                        {/* Top Right Price & Share Action */}
                        <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleShareTrip(e, trip)}
                            className="px-2.5 py-1 rounded-xl bg-slate-950/85 hover:bg-slate-900 text-slate-200 hover:text-cyan-300 border border-slate-700/80 hover:border-cyan-400/60 text-[11px] font-bold flex items-center gap-1 backdrop-blur-md shadow-md transition-all active:scale-95"
                            title="Поділитися посиланням на тур у Telegram"
                          >
                            <Share2 className="w-3 h-3 text-cyan-400" />
                            <span>Поділитися</span>
                          </button>
                          <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-black text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40">
                            {trip.price}{trip.currency}
                          </span>
                        </div>

                        {/* Duration Tag Bottom Left */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs text-slate-200">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span className="font-semibold">{trip.duration}</span>
                        </div>

                        {/* Selected Indicator Bottom Right */}
                        {isSelected && (
                          <span className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded-lg bg-cyan-500/90 text-slate-950 text-[10px] font-extrabold shadow">
                            ✓ Обраний тур
                          </span>
                        )}
                      </div>

                      {/* Tour Content */}
                      <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                        <div>
                          <h4 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors line-clamp-1">
                            {trip.title}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                            {trip.description}
                          </p>
                        </div>

                        {/* Highlights */}
                        <div className="flex flex-wrap gap-1">
                          {trip.highlights.slice(0, 3).map((h, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded-md bg-slate-900 text-[10px] text-slate-300 border border-slate-800"
                            >
                              ✓ {h}
                            </span>
                          ))}
                        </div>

                        {/* Available Departure Dates Chips & Add to Calendar Button */}
                        {trip.departureDates && trip.departureDates.length > 0 && (
                          <div className="pt-2 border-t border-slate-800/60 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                                <Calendar className="w-3 h-3 text-cyan-400" />
                                <span>Дати виїзду:</span>
                              </span>

                              {/* Add to System Calendar Button */}
                              <button
                                type="button"
                                onClick={(e) => handleAddToCalendar(e, trip)}
                                className={`px-2 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                                  isCalendarSaved
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                    : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border-cyan-500/30 hover:border-cyan-400'
                                }`}
                                title="Зберегти дату виїзду в системний календар пристрою"
                              >
                                <CalendarPlus className="w-3 h-3" />
                                <span>{isCalendarSaved ? 'Додано в Календар ✓' : 'Додати в Календар'}</span>
                              </button>
                            </div>

                            <div className="flex flex-wrap gap-1">
                              {trip.departureDates.slice(0, 4).map((d) => {
                                const isDateActive = isSelected && selectedDepartureDate === d;
                                return (
                                  <button
                                    key={d}
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      triggerHaptic('selection');
                                      handleSelectTrip(trip, d);
                                    }}
                                    className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition-all border ${
                                      isDateActive
                                        ? 'bg-cyan-500 text-white border-cyan-300 shadow-[0_0_8px_rgba(34,211,238,0.4)]'
                                        : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-cyan-500/50'
                                    }`}
                                  >
                                    {d}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* CTA Button */}
                        <div className="pt-2 flex items-center justify-between border-t border-slate-800/80 gap-2">
                          <span className="text-[11px] text-slate-400 truncate">
                            Збір: <b className="text-slate-200">Саарланд, Люксембург, Трір</b>
                          </span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTrip(trip);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center gap-1 transition-all shrink-0"
                          >
                            <span>Обрати місце</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Customer Testimonials Carousel directly in Tours showcase */}
            <div className="pt-2">
              <ReviewsCarousel
                leads={leads}
                activeTripTitle={selectedTrip?.title}
                onNewFeedbackLead={onNewLead}
              />
            </div>
          </div>
        )}

        {/* ================= STEP 2: 3D/2D CABIN & STARLIGHT CEILING ================= */}
        {activeStep === 'seats' && (
          <div className="space-y-5 pb-12 sm:pb-6">
            {/* Cabin Top Header with Selected Tour & Add to Calendar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold">
                    Тур: {selectedTrip.shortTitle}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    {selectedTrip.price}€
                  </span>
                  <span className="text-xs text-slate-400">
                    • Виїзд: <b className="text-cyan-300">{selectedDepartureDate}</b>
                  </span>
                  <button
                    type="button"
                    onClick={(e) => handleAddToCalendar(e, selectedTrip, selectedDepartureDate)}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                      calendarAddedTrips[selectedTrip.id]
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border-cyan-500/40'
                    }`}
                  >
                    <CalendarPlus className="w-3 h-3" />
                    <span>{calendarAddedTrips[selectedTrip.id] ? 'Додано в Календар ✓' : 'Додати в Календар'}</span>
                  </button>
                </div>
                <h3 className="text-lg font-extrabold text-white mt-1.5 flex items-center gap-2">
                  <Armchair className="w-5 h-5 text-indigo-400" />
                  <span>Інтерактивний салон Opel Vivaro</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Клікніть на потрібне крісло для бронювання. Бронь місця — лише 5€ (або 0€ вільна посадка).
                </p>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setActiveStep('checkout');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start sm:self-auto shrink-0"
              >
                <span>Перейти до замовлення ({totalPrice}€)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Cabin Container with Starlight Ceiling Effect */}
            <div className="relative rounded-3xl p-4 sm:p-7 border-2 border-cyan-500/40 bg-gradient-to-b from-[#0a1128] via-[#090d20] to-[#060814] shadow-2xl overflow-hidden">
              {/* Animated Constellation Starlight Headliner overlay */}
              {starlightCeiling && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_#fff] animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute top-12 right-20 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_#22d3ee] animate-pulse" />
                  <div className="absolute top-28 left-1/3 w-1 h-1 bg-amber-200 rounded-full shadow-[0_0_8px_#fde68a] animate-ping" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-16 right-1/4 w-1 h-1 bg-purple-300 rounded-full shadow-[0_0_8px_#d8b4fe] animate-pulse" />
                  <div className="absolute bottom-8 left-1/4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#fff] animate-ping" style={{ animationDuration: '5s' }} />
                  {/* Subtle Milky Way shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-purple-500/10 to-amber-500/5 opacity-60 pointer-events-none" />
                </div>
              )}

              {/* Front Windshield & Driver Cockpit */}
              <div className="mb-6 pb-4 border-b border-cyan-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center font-bold text-xs text-slate-300">
                    🚐
                  </div>
                  <div>
                    <span className="text-xs font-bold text-white block">Лобове скло & Панорама дороги</span>
                    <span className="text-[10px] text-cyan-400">Напрямок руху вперед ⬆️</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] px-2.5 py-1 rounded-full bg-cyan-950/80 border border-cyan-500/40 text-cyan-200 font-semibold flex items-center gap-1 shadow-sm">
                    <Sparkles className="w-3 h-3 text-cyan-400" />
                    Зоряне небо: {starlightCeiling ? 'УВІМКНЕНО' : 'ВИМКНЕНО'}
                  </span>
                </div>
              </div>

              {/* SEATS LAYOUT IN 3 ROWS WITH FRAMER MOTION ANIMATIONS */}
              <div className="space-y-4 max-w-xl mx-auto">
                {/* --- 1-Й РЯД (ВОДІЙ + 2 МІСЦЯ) --- */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      1-й ряд (біля водія, +5€)
                    </span>
                    <span className="text-[10px] text-slate-400">Найкращий огляд</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {/* Водій (зайнято/капітан) */}
                    <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-700/80 opacity-60 flex flex-col items-center justify-center text-center">
                      <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-xs mb-1">
                        👨‍✈️
                      </div>
                      <span className="text-[11px] font-bold text-slate-300">Водій клубу</span>
                      <span className="text-[9px] text-slate-500">SVOI Travel</span>
                    </div>

                    {/* Місце 1 та 2 з плавною анімацією масштабування та світіння */}
                    {CABIN_SEATS.slice(0, 2).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      return (
                        <motion.button
                          key={seat.id}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          animate={
                            isSelected
                              ? {
                                  scale: [1, 1.07, 1.03],
                                  boxShadow: '0 0 24px rgba(251, 191, 36, 0.65), inset 0 0 12px rgba(251, 191, 36, 0.25)'
                                }
                              : {
                                  scale: 1,
                                  boxShadow: '0 0 0px rgba(251, 191, 36, 0)'
                                }
                          }
                          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-amber-500/25 border-amber-400 text-white'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-amber-500/40 text-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold transition-colors ${
                            isSelected ? 'bg-amber-400 text-slate-950 shadow-[0_0_12px_rgba(251,191,36,0.8)]' : 'bg-slate-800 text-amber-300'
                          }`}>
                            {seat.id === 'seat-1' ? '1' : '2'}
                          </div>
                          <span className="text-xs font-bold">{seat.id === 'seat-1' ? 'Місце 1' : 'Місце 2'}</span>
                          <span className="text-[10px] text-amber-300 font-semibold">+{seat.surcharge}€ (Вікно)</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* --- 2-Й РЯД (3 КАПІТАНСЬКІ МІСЦЯ) --- */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-1.5">
                      <Armchair className="w-3.5 h-3.5 text-sky-400" />
                      2-й ряд (Комфортні сидіння, +5€)
                    </span>
                    <span className="text-[10px] text-slate-400">Широкі підлокітники</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {CABIN_SEATS.slice(2, 5).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      return (
                        <motion.button
                          key={seat.id}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          animate={
                            isSelected
                              ? {
                                  scale: [1, 1.07, 1.03],
                                  boxShadow: '0 0 24px rgba(56, 189, 248, 0.65), inset 0 0 12px rgba(56, 189, 248, 0.25)'
                                }
                              : {
                                  scale: 1,
                                  boxShadow: '0 0 0px rgba(56, 189, 248, 0)'
                                }
                          }
                          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-sky-500/25 border-sky-400 text-white'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-sky-500/40 text-slate-200 hover:border-sky-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold transition-colors ${
                            isSelected ? 'bg-sky-400 text-slate-950 shadow-[0_0_12px_rgba(56,189,248,0.8)]' : 'bg-slate-800 text-sky-300'
                          }`}>
                            {seat.id.replace('seat-', '')}
                          </div>
                          <span className="text-xs font-bold">{seat.name.split(' ')[0]} {seat.id.replace('seat-', '')}</span>
                          <span className="text-[10px] text-sky-300 font-semibold">
                            {seat.surcharge > 0 ? `+${seat.surcharge}€` : '0€'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* --- 3-Й РЯД (3 МІСЦЯ ДИВАН) --- */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-indigo-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      3-й ряд (Затишний диван, 0..5€)
                    </span>
                    <span className="text-[10px] text-slate-400">Ідеально для відпочинку</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {CABIN_SEATS.slice(5, 8).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      return (
                        <motion.button
                          key={seat.id}
                          type="button"
                          whileHover={{ scale: 1.04 }}
                          whileTap={{ scale: 0.94 }}
                          animate={
                            isSelected
                              ? {
                                  scale: [1, 1.07, 1.03],
                                  boxShadow: '0 0 24px rgba(129, 140, 248, 0.65), inset 0 0 12px rgba(129, 140, 248, 0.25)'
                                }
                              : {
                                  scale: 1,
                                  boxShadow: '0 0 0px rgba(129, 140, 248, 0)'
                                }
                          }
                          transition={{ type: 'spring', stiffness: 360, damping: 20 }}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-colors flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-indigo-500/25 border-indigo-400 text-white'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-indigo-500/40 text-slate-200 hover:border-indigo-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold transition-colors ${
                            isSelected ? 'bg-indigo-400 text-slate-950 shadow-[0_0_12px_rgba(129,140,248,0.8)]' : 'bg-slate-800 text-indigo-300'
                          }`}>
                            {seat.id.replace('seat-', '')}
                          </div>
                          <span className="text-xs font-bold">{seat.name.split(' ')[0]} {seat.id.replace('seat-', '')}</span>
                          <span className="text-[10px] text-indigo-300 font-semibold">
                            {seat.surcharge > 0 ? `+${seat.surcharge}€` : 'Включено (0€)'}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* Free seating option */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    triggerHaptic('selection');
                    setSelectedSeat(null);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    selectedSeat === null
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_14px_rgba(52,211,153,0.35)]'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-semibold">🎲 Без фіксації конкретного місця (вільна посадка в день виїзду)</span>
                  <span className="font-bold text-emerald-400">0€ доплати</span>
                </motion.button>
              </div>

              {/* Selected Seat Details Card with Framer Motion Transition */}
              <AnimatePresence mode="wait">
                {selectedSeat && (
                  <motion.div
                    key={selectedSeat.id}
                    initial={{ opacity: 0, y: 10, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.97 }}
                    transition={{ duration: 0.22 }}
                    className="mt-4 p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/50 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_0_20px_rgba(34,211,238,0.2)]"
                  >
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">Обране місце:</span>
                      <h5 className="font-bold text-white text-sm">{selectedSeat.name} ({selectedSeat.row})</h5>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {selectedSeat.perks.map((p, idx) => (
                          <span key={idx} className="text-[10px] text-slate-300 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            ✓ {p}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="text-right sm:shrink-0">
                      <span className="text-[11px] text-slate-400 block">Доплата за місце:</span>
                      <span className="text-base font-extrabold text-amber-300">+{selectedSeat.surcharge}€</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Amenities overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <Snowflake className="w-4 h-4 text-cyan-400 shrink-0" />
                <span className="text-slate-300 text-[11px]">Дводіапазонний клімат</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-slate-300 text-[11px]">USB-C швидка зарядка</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <Luggage className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-slate-300 text-[11px]">Багаж 10 кг + ручна</span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                <span className="text-slate-300 text-[11px]">0% передоплати (1 день)</span>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: CHECKOUT & SEND TO TELEGRAM ================= */}
        {activeStep === 'checkout' && (
          <div className="space-y-5 pb-14 sm:pb-8">
            {orderSuccess ? (
              <div className="p-6 rounded-3xl bg-emerald-950/40 border-2 border-emerald-400/60 text-center space-y-4 shadow-2xl animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/30">
                  🎉
                </div>
                <h3 className="text-xl font-black text-white">
                  Заявку успішно відправлено менеджеру SVOI!
                </h3>
                <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                  Дякуємо, <b>{passengerName}</b>! Менеджер клубу зв'яжеться з вами за вказаним контактом ({passengerHandle}) для підтвердження часу адресного збору.
                </p>

                <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 max-w-sm mx-auto text-xs space-y-1.5 text-left">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Тур:</span>
                    <span className="font-bold text-white">{selectedTrip.shortTitle}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Місце:</span>
                    <span className="font-bold text-cyan-300">{selectedSeat ? selectedSeat.name : 'Вільне'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Точка збору:</span>
                    <span className="font-bold text-white">{pickupCity}</span>
                  </div>
                  <div className="flex justify-between pt-1 border-t border-slate-800 text-sm font-black">
                    <span className="text-slate-300">Разом до сплати в день виїзду:</span>
                    <span className="text-emerald-400">{totalPrice}€</span>
                  </div>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <a
                    href="https://t.me/SVOI_travel_admin"
                    target="_blank"
                    rel="noreferrer"
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30"
                  >
                    <span>Відкрити діалог з менеджером</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>

                  <button
                    onClick={() => {
                      triggerHaptic('light');
                      setOrderSuccess(false);
                      setActiveStep('tours');
                    }}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Обрати інший тур
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmitBooking} className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div>
                    <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>Підтвердження та передача заявки в бот</span>
                    </h3>
                    <p className="text-xs text-slate-400">
                      Дані передаються через Telegram WebApp API безпосередньо менеджеру
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('light');
                      setActiveStep('seats');
                    }}
                    className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                  >
                    Змінити місце
                  </button>
                </div>

                {/* Summary Order Receipt Card */}
                <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-2.5 text-xs shadow-xl">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-cyan-400">Обраний напрямок:</span>
                      <h4 className="font-bold text-white text-sm">{selectedTrip.title}</h4>
                      <span className="text-slate-400 text-[11px]">Тривалість: {selectedTrip.duration}</span>
                    </div>
                    <span className="text-base font-extrabold text-cyan-300">{basePrice}€</span>
                  </div>

                  {/* Selected Departure Date & Quick Calendar / Share Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="font-semibold text-cyan-300 flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Дата виїзду:</span>
                      </span>
                      <span className="block text-xs font-bold text-white mt-0.5">
                        {selectedDepartureDate}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => handleAddToCalendar(e, selectedTrip, selectedDepartureDate)}
                        className={`px-2.5 py-1 rounded-xl text-[11px] font-bold flex items-center gap-1 border transition-all active:scale-95 ${
                          calendarAddedTrips[selectedTrip.id]
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-slate-900 hover:bg-slate-800 text-cyan-300 hover:text-white border-cyan-500/40'
                        }`}
                      >
                        <CalendarPlus className="w-3.5 h-3.5" />
                        <span>{calendarAddedTrips[selectedTrip.id] ? 'Додано в Календар ✓' : 'Додати в Календар'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleShareTrip(e, selectedTrip)}
                        className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-cyan-300 border border-slate-700 hover:border-cyan-400/50 text-[11px] font-bold flex items-center gap-1 transition-all active:scale-95"
                      >
                        <Share2 className="w-3 h-3 text-cyan-400" />
                        <span>Поділитися</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          triggerHaptic('light');
                          setActiveStep('tours');
                          setShowCalendarModal(true);
                        }}
                        className="text-[11px] text-cyan-400 hover:underline flex items-center gap-1 ml-1"
                      >
                        Змінити дату
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                    <div>
                      <span className="font-semibold text-slate-300">
                        {selectedSeat ? selectedSeat.name : '🎲 Вільна посадка (без фіксації)'}
                      </span>
                      <span className="block text-[10px] text-slate-500">
                        {selectedSeat ? selectedSeat.row : 'Вибір місця в мікроавтобусі в день туру'}
                      </span>
                    </div>
                    <span className="font-bold text-amber-300">+{seatSurcharge}€</span>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-sm font-black">
                    <span className="text-white">Підсумкова сума:</span>
                    <span className="text-lg text-emerald-400">{totalPrice}€</span>
                  </div>
                  <p className="text-[10px] text-emerald-300/80">
                    💡 0% передоплати: оплата готівкою або на карту водієві в день виїзду!
                  </p>
                </div>

                {/* Contact Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Ваше ім'я:
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={passengerName}
                        onChange={(e) => setPassengerName(e.target.value)}
                        placeholder="Наприклад: Олена"
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Telegram Username (@):
                    </label>
                    <input
                      type="text"
                      required
                      value={passengerHandle}
                      onChange={(e) => setPassengerHandle(e.target.value)}
                      placeholder="@username"
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Телефон (WhatsApp / Telegram):
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={passengerPhone}
                        onChange={(e) => setPassengerPhone(e.target.value)}
                        placeholder="+49 ..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2 space-y-2">
                    <label className="text-[11px] font-semibold text-slate-300 block">
                      Регіон та адреса збору пасажира (Door-to-Door):
                    </label>
                    {/* Quick selection chips for core regions */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {[
                        'Саарланд (за адресою)',
                        'Люксембург (за адресою)',
                        'Трір (за адресою)',
                        'Інша земля (від 4 осіб)'
                      ].map((reg) => (
                        <button
                          key={reg}
                          type="button"
                          onClick={() => {
                            triggerHaptic('selection');
                            setPickupCity(reg);
                          }}
                          className={`px-2.5 py-1 rounded-xl text-[10px] font-semibold transition-all border ${
                            pickupCity === reg
                              ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 shadow-sm'
                              : 'bg-slate-900 border-slate-700/80 text-slate-400 hover:text-white'
                          }`}
                        >
                          {reg}
                        </button>
                      ))}
                    </div>

                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        value={pickupAddress}
                        onChange={(e) => setPickupAddress(e.target.value)}
                        placeholder="Введіть вашу точну адресу (вулиця, номер будинку, місто)..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400">
                      📍 Збираємо пасажирів прямо біля вашого будинку по Саарланду, Люксембургу та Тріру!
                    </p>
                  </div>
                </div>

                {/* Submit button */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-sm shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Відправка заявки...' : `🚀 Забронювати поїздку (${totalPrice}€)`}</span>
                </button>

                {/* Social Proof & Customer Reviews Reassurance in Booking Flow */}
                <div className="pt-2">
                  <ReviewsCarousel
                    leads={leads}
                    activeTripTitle={selectedTrip?.title}
                    onNewFeedbackLead={onNewLead}
                  />
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* Mini App Bottom Status Footer */}
      <div className="relative z-10 bg-slate-950/90 border-t border-slate-800 px-4 py-2 text-[10px] text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
          <span>Telegram WebApp SDK & Haptic Feedback Active</span>
        </div>
        <span>Комфортабельне авто Opel Vivaro • 8 місць</span>
      </div>

      {/* ================= INTERACTIVE CALENDAR MODAL ================= */}
      {showCalendarModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-2.5 sm:p-4 animate-fade-in">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto overscroll-contain bg-[#0c1222] border-2 border-cyan-500/40 rounded-2xl sm:rounded-3xl p-3.5 sm:p-6 shadow-[0_0_50px_rgba(6,182,212,0.25)] space-y-4 [scrollbar-width:thin]">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-white">Календар турів SVOI</h3>
                  <p className="text-[11px] text-slate-400">Оберіть дату, щоб побачити актуальні поїздки</p>
                </div>
              </div>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowCalendarModal(false);
                }}
                className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all border border-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Month Switcher Tabs */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setCalendarMonth('oct');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  calendarMonth === 'oct'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Жовтень 2026
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setCalendarMonth('nov');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  calendarMonth === 'nov'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Листопад 2026
              </button>
              <button
                onClick={() => {
                  triggerHaptic('selection');
                  setCalendarMonth('dec');
                }}
                className={`py-1.5 px-2 rounded-lg font-bold transition-all text-center ${
                  calendarMonth === 'dec'
                    ? 'bg-cyan-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ❄️ Грудень 2026
              </button>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-slate-400 pt-1">
              <div>Пн</div>
              <div>Вт</div>
              <div>Ср</div>
              <div>Чт</div>
              <div>Пт</div>
              <div className="text-cyan-400 font-extrabold">Сб</div>
              <div className="text-cyan-400 font-extrabold">Нд</div>
            </div>

            {/* Month Grid */}
            {calendarMonth === 'oct' && (
              <div className="grid grid-cols-7 gap-1.5 text-xs text-center">
                {/* 3 offset days Mon-Wed for Oct 1st Thursday */}
                <div className="p-2 opacity-20">28</div>
                <div className="p-2 opacity-20">29</div>
                <div className="p-2 opacity-20">30</div>
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const dayStr = day < 10 ? `0${day}` : `${day}`;
                  const isDepartureWeekend = day === 24 || day === 25 || day === 31;
                  const tourCount = day === 24 ? 4 : day === 25 ? 3 : day === 31 ? 4 : 0;
                  const isCurrentFilter = filterDateWeekend.includes(`${dayStr}.10`);

                  return (
                    <button
                      key={day}
                      disabled={!isDepartureWeekend}
                      onClick={() => {
                        triggerHaptic('medium');
                        const filterKey = day === 24 || day === 25 ? '24-25.10' : '31.10-01.11';
                        setFilterDateWeekend(filterKey);
                        setShowCalendarModal(false);
                        setActiveStep('tours');
                      }}
                      className={`relative p-2 rounded-xl transition-all flex flex-col items-center justify-center min-h-[46px] border ${
                        isDepartureWeekend
                          ? isCurrentFilter
                            ? 'bg-cyan-500 text-white border-cyan-300 font-extrabold shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                            : 'bg-slate-900/90 hover:bg-cyan-950/70 text-cyan-200 hover:text-white border-cyan-500/50 hover:border-cyan-400 font-bold cursor-pointer'
                          : 'text-slate-600 border-transparent hover:bg-slate-900/30'
                      }`}
                    >
                      <span>{day}</span>
                      {isDepartureWeekend && (
                        <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                          {tourCount} тур.
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {calendarMonth === 'nov' && (
              <div className="grid grid-cols-7 gap-1.5 text-xs text-center">
                {/* 6 offset days for Nov 1st Sunday */}
                <div className="p-2 opacity-20">26</div>
                <div className="p-2 opacity-20">27</div>
                <div className="p-2 opacity-20">28</div>
                <div className="p-2 opacity-20">29</div>
                <div className="p-2 opacity-20">30</div>
                <div className="p-2 opacity-20">31</div>
                {[...Array(30)].map((_, i) => {
                  const day = i + 1;
                  const dayStr = day < 10 ? `0${day}` : `${day}`;
                  const isDepartureWeekend = [1, 7, 8, 14, 15, 21, 22, 28, 29].includes(day);
                  const isCurrentFilter = filterDateWeekend.includes(`${dayStr}.11`);

                  return (
                    <button
                      key={day}
                      disabled={!isDepartureWeekend}
                      onClick={() => {
                        triggerHaptic('medium');
                        let filterKey = 'all';
                        if (day === 1) filterKey = '31.10-01.11';
                        else if (day === 7 || day === 8) filterKey = '07-08.11';
                        else if (day === 14 || day === 15) filterKey = '14-15.11';
                        else if (day === 21 || day === 22) filterKey = '21-22.11';
                        else if (day === 28 || day === 29) filterKey = '28-29.11';
                        setFilterDateWeekend(filterKey);
                        setShowCalendarModal(false);
                        setActiveStep('tours');
                      }}
                      className={`relative p-2 rounded-xl transition-all flex flex-col items-center justify-center min-h-[46px] border ${
                        isDepartureWeekend
                          ? isCurrentFilter
                            ? 'bg-cyan-500 text-white border-cyan-300 font-extrabold shadow-[0_0_12px_rgba(34,211,238,0.5)]'
                            : 'bg-slate-900/90 hover:bg-cyan-950/70 text-cyan-200 hover:text-white border-cyan-500/50 hover:border-cyan-400 font-bold cursor-pointer'
                          : 'text-slate-600 border-transparent hover:bg-slate-900/30'
                      }`}
                    >
                      <span>{day}</span>
                      {isDepartureWeekend && (
                        <span className="text-[9px] text-emerald-400 font-mono mt-0.5">
                          ✓ тур
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {calendarMonth === 'dec' && (
              <div className="grid grid-cols-7 gap-1.5 text-xs text-center">
                {/* 1 offset day for Dec 1st Tuesday */}
                <div className="p-2 opacity-20">30</div>
                {[...Array(31)].map((_, i) => {
                  const day = i + 1;
                  const isDepartureWeekend = [5, 6, 12, 13, 19, 20].includes(day);

                  return (
                    <button
                      key={day}
                      disabled={!isDepartureWeekend}
                      onClick={() => {
                        triggerHaptic('medium');
                        setFilterDateWeekend('12.2026');
                        setShowCalendarModal(false);
                        setActiveStep('tours');
                      }}
                      className={`relative p-2 rounded-xl transition-all flex flex-col items-center justify-center min-h-[46px] border ${
                        isDepartureWeekend
                          ? 'bg-slate-900/90 hover:bg-cyan-950/70 text-cyan-200 hover:text-white border-cyan-500/50 hover:border-cyan-400 font-bold cursor-pointer'
                          : 'text-slate-600 border-transparent hover:bg-slate-900/30'
                      }`}
                    >
                      <span>{day}</span>
                      {isDepartureWeekend && (
                        <span className="text-[9px] text-amber-300 font-mono mt-0.5">
                          🎄 Ярмарок
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Modal Footer Controls */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setFilterDateWeekend('all');
                  setShowCalendarModal(false);
                }}
                className="text-xs text-slate-400 hover:text-white underline"
              >
                Показати всі 14 турів (без фільтра дат)
              </button>
              <button
                onClick={() => {
                  triggerHaptic('light');
                  setShowCalendarModal(false);
                }}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30"
              >
                Готово
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================= SYSTEM SHARE TO TELEGRAM MENU MODAL ================= */}
      <AnimatePresence>
        {shareModalTrip && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-2.5 sm:p-4"
            onClick={() => setShareModalTrip(null)}
          >
            <motion.div
              initial={{ y: 60, scale: 0.96, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: 40, scale: 0.96, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 340, damping: 26 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0b1324] border-2 border-cyan-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.3)] space-y-4 text-xs"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Поділитися туром у Telegram</h4>
                    <p className="text-[11px] text-slate-400">Системне меню поширення посилання</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShareModalTrip(null)}
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Preview of Telegram Message */}
              <div className="p-3 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2">
                <div className="flex items-center gap-2.5">
                  <img
                    src={shareModalTrip.image}
                    alt={shareModalTrip.shortTitle}
                    className="w-12 h-12 rounded-xl object-cover shrink-0 border border-cyan-500/30"
                  />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">
                      {shareModalTrip.badge}
                    </span>
                    <h5 className="font-bold text-white text-xs truncate">{shareModalTrip.title}</h5>
                    <span className="text-[11px] text-emerald-400 font-extrabold">
                      {shareModalTrip.price}{shareModalTrip.currency} • {shareModalTrip.duration}
                    </span>
                  </div>
                </div>
                <div className="p-2 rounded-xl bg-slate-900/90 border border-slate-800/80 font-mono text-[10px] text-cyan-300 break-all">
                  https://t.me/SVOI_Bot/app?startapp=tour_{shareModalTrip.id}
                </div>
              </div>

              {/* Simulated Telegram Quick Contacts */}
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-400 block">
                  Надіслати в Telegram-повідомлення:
                </span>
                <div className="grid grid-cols-4 gap-2 text-center">
                  {[
                    { name: 'Збережене', icon: '🔖', color: 'from-cyan-500 to-blue-600' },
                    { name: 'Друзі / Сім\'я', icon: '👨‍👩‍👧‍👦', color: 'from-indigo-500 to-purple-600' },
                    { name: 'Чат SVOI', icon: '🚐', color: 'from-emerald-500 to-teal-600' },
                    { name: 'Попутники', icon: '✨', color: 'from-amber-500 to-orange-600' }
                  ].map((recipient) => (
                    <button
                      key={recipient.name}
                      type="button"
                      onClick={() => {
                        triggerHaptic('success');
                        setDevToast(`📨 Посилання на тур «${shareModalTrip.shortTitle}» надіслано в «${recipient.name}»!`);
                        setTimeout(() => setDevToast(null), 4000);
                        setShareModalTrip(null);
                      }}
                      className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-cyan-400/50 flex flex-col items-center gap-1.5 transition-all active:scale-95"
                    >
                      <div className={`w-9 h-9 rounded-full bg-gradient-to-tr ${recipient.color} flex items-center justify-center text-sm shadow-md`}>
                        {recipient.icon}
                      </div>
                      <span className="text-[10px] text-slate-300 font-medium truncate w-full">
                        {recipient.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('selection');
                    const shareUrl = `https://t.me/SVOI_Bot/app?startapp=tour_${shareModalTrip.id}`;
                    navigator.clipboard?.writeText(
                      `🚐 Приєднуйся до туру «${shareModalTrip.title}» (${shareModalTrip.price}€) з клубом SVOI! Бронювання місця без передоплати: ${shareUrl}`
                    );
                    setCopiedShareLink(true);
                    setDevToast(`🔗 Посилання на тур «${shareModalTrip.shortTitle}» скопійовано!`);
                    setTimeout(() => setDevToast(null), 3500);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-300 border border-cyan-500/30 font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copiedShareLink ? 'Посилання скопійовано ✓' : 'Скопіювати посилання'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    triggerHaptic('success');
                    setDevToast(`🚀 Відкрито системне вікно Telegram Share для туру «${shareModalTrip.shortTitle}»!`);
                    setTimeout(() => setDevToast(null), 4000);
                    setShareModalTrip(null);
                  }}
                  className="w-full sm:flex-1 py-2.5 px-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/30 transition-all"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Поділитися в Telegram</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ================= GITHUB PAGES / PUBLIC URL SETUP MODAL ================= */}
      <AnimatePresence>
        {showUrlSetupModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => setShowUrlSetupModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg bg-[#0b1324] border-2 border-indigo-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-[0_0_50px_rgba(99,102,241,0.3)] space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Запуск Mini App через GitHub Pages</h4>
                    <p className="text-[11px] text-slate-400">Безкоштовний HTTPS-хостинг для відкриття в Telegram</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowUrlSetupModal(false)}
                  className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-950/90 border border-slate-800 space-y-2 leading-relaxed text-slate-300">
                <p className="font-bold text-indigo-300">
                  ✅ Ми вже додали в проєкт файл <code>.github/workflows/deploy-pages.yml</code> та <code>base: './'</code>!
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px]">
                  <li>Завантажте або синхронізуйте цей репозиторій на свій <b>GitHub</b>.</li>
                  <li>У репозиторії на GitHub відкрийте <b>Settings → Pages</b>.</li>
                  <li>У полі <b>Source</b> оберіть <b>GitHub Actions</b> — сайт автоматично збереться за 1 хвилину!</li>
                  <li>Скопіюйте отримане посилання виду <code>https://ваш-логін.github.io/назва-репо/?miniapp=1</code> і вставте нижче:</li>
                </ol>
              </div>

              <form onSubmit={handleSavePublicUrlToBot} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 block mb-1">
                    Ваше публічне посилання (GitHub Pages / Vercel / Cloud Run):
                  </label>
                  <input
                    type="url"
                    required
                    value={publicMiniAppUrl}
                    onChange={(e) => setPublicMiniAppUrl(e.target.value)}
                    placeholder="https://username.github.io/svoi-miniapp/?miniapp=1"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-400 rounded-xl px-3.5 py-2.5 text-white font-mono text-xs outline-none"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setShowUrlSetupModal(false)}
                    className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                  >
                    Закрити
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingBotUrl}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-bold shadow-lg shadow-indigo-600/30 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isSavingBotUrl ? 'Збереження в Telegram...' : 'Прив’язати URL до @Svoi_TravelEU_bot'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
