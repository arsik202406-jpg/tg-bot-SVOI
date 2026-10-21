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
  const [activeStep, setActiveStep] = useState<'tours' | 'seats' | 'checkout' | 'my_trips'>('tours');
  const [selectedTrip, setSelectedTrip] = useState<TripItem>(TRIPS_LIST[0]);
  const [selectedSeat, setSelectedSeat] = useState<SeatOption | null>(CABIN_SEATS[1]); // Default front row window
  const [selectedDepartureDate, setSelectedDepartureDate] = useState<string>(
    TRIPS_LIST[0]?.departureDates?.[0] || '25.10.2026 (Нд)'
  );
  const [filterDuration, setFilterDuration] = useState<'all' | '1day' | 'multiday'>('all');
  const [onlyHotToursFilter, setOnlyHotToursFilter] = useState<boolean>(false);
  const [filterDateWeekend, setFilterDateWeekend] = useState<string>('all');
  const [showCalendarModal, setShowCalendarModal] = useState<boolean>(false);
  const [calendarMonth, setCalendarMonth] = useState<'oct' | 'nov' | 'dec'>('oct');
  const [starlightCeiling, setStarlightCeiling] = useState(true);

  // Form states & Validation
  const [passengerName, setPassengerName] = useState('Олександр');
  const [passengerHandle, setPassengerHandle] = useState('@alex_traveler');
  const [passengerPhone, setPassengerPhone] = useState('+49 170 1234567');
  const [pickupCity, setPickupCity] = useState('Саарланд (за адресою)');
  const [pickupAddress, setPickupAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);
  const [touchedFields, setTouchedFields] = useState<{
    name?: boolean;
    handle?: boolean;
    phone?: boolean;
  }>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);

  // Validation helpers for Name, Telegram Handle (@username) and Phone Number (E.164 international format)
  const normalizeTelegramHandle = (raw: string): string => {
    let val = raw.trim();
    // Convert t.me/username or https://t.me/username into @username
    val = val.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '@');
    return val;
  };

  const validatePassengerName = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return "Введіть ваше ім'я для оформлення бронювання";
    }
    if (trimmed.length < 2) {
      return "Ім'я повинно містити щонайменше 2 символи";
    }
    return null;
  };

  const validateTelegramHandle = (raw: string): string | null => {
    const normalized = normalizeTelegramHandle(raw);
    if (!normalized) {
      return 'Вкажіть ваш Telegram @username для швидкого зв’язку з менеджером';
    }
    const withoutAt = normalized.startsWith('@') ? normalized.slice(1) : normalized;
    if (!withoutAt) {
      return 'Після символу @ введіть ваш нікнейм (наприклад: @alex_traveler)';
    }
    if (/\s/.test(withoutAt)) {
      return 'Telegram username не може містити пробілів';
    }
    if (!/^[a-zA-Z0-9_]+$/.test(withoutAt)) {
      return 'Дозволені лише латинські літери (a-z), цифри (0-9) та нижнє підкреслення (_)';
    }
    if (/^[0-9_]/.test(withoutAt)) {
      return 'Telegram username повинен починатися з латинської літери';
    }
    if (withoutAt.endsWith('_') || withoutAt.includes('__')) {
      return 'Username не може закінчуватися на «_» або містити подвійне «__»';
    }
    if (withoutAt.length < 5) {
      return `Занадто короткий нікнейм (${withoutAt.length} симв., мінімум 5 символів після @)`;
    }
    if (withoutAt.length > 32) {
      return `Занадто довгий нікнейм (${withoutAt.length} симв., максимум 32 символи)`;
    }
    return null;
  };

  const validatePhoneNumber = (raw: string): string | null => {
    const trimmed = raw.trim();
    if (!trimmed) {
      return 'Введіть контактний номер телефону (WhatsApp / Telegram)';
    }
    // Check for forbidden characters (letters or special symbols other than +, -, spaces, parentheses)
    if (!/^[+\d\s\-()]+$/.test(trimmed)) {
      return 'Номер може містити лише цифри, знак «+», пробіли або дефіси (без літер)';
    }
    if (!trimmed.startsWith('+') && !trimmed.startsWith('00')) {
      return 'Вкажіть міжнародний код країни зі знаком «+» (наприклад: +49, +352, +380)';
    }
    const digitsOnly = trimmed.replace(/\D/g, '');
    if (digitsOnly.length < 10) {
      return `Номер занадто короткий: введено ${digitsOnly.length} цифр (потрібно від 10 до 15 цифр)`;
    }
    if (digitsOnly.length > 15) {
      return `Номер занадто довгий: введено ${digitsOnly.length} цифр (максимум 15 цифр за стандартом E.164)`;
    }
    return null;
  };

  const nameError = validatePassengerName(passengerName);
  const handleError = validateTelegramHandle(passengerHandle);
  const phoneError = validatePhoneNumber(passengerPhone);
  const isBookingFormValid = !nameError && !handleError && !phoneError;

  // Collapsible detailed program per tour card so first-time visitors aren't overwhelmed
  const [expandedProgramTripId, setExpandedProgramTripId] = useState<string | null>(null);

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

  // Search, Collapsible Filters, Price Range Slider, Add-to-Calendar, Share & Trip Statistics states
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [maxPriceFilter, setMaxPriceFilter] = useState<number>(450);
  const [priceSortOrder, setPriceSortOrder] = useState<'default' | 'asc' | 'desc'>('default');
  const [calendarAddedTrips, setCalendarAddedTrips] = useState<Record<string, boolean>>({});
  const [shareModalTrip, setShareModalTrip] = useState<TripItem | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [tripDateSelections, setTripDateSelections] = useState<Record<string, string>>({});
  const [statsWidgetExpanded, setStatsWidgetExpanded] = useState<boolean>(false);

  // Admin mode & custom overrides for tour dates and posters
  const [isAdminMode, setIsAdminMode] = useState<boolean>(false);
  const [editingTripAdmin, setEditingTripAdmin] = useState<TripItem | null>(null);
  const [adminNewPosterInput, setAdminNewPosterInput] = useState<string>('');
  const [adminNewDatesInput, setAdminNewDatesInput] = useState<string>('');
  const [customTripOverrides, setCustomTripOverrides] = useState<
    Record<string, { image?: string; departureDates?: string[] }>
  >(() => {
    try {
      const saved = localStorage.getItem('svoi_trip_overrides');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const tripsWithOverrides = useMemo(() => {
    return TRIPS_LIST.map((t) => {
      const over = customTripOverrides[t.id];
      if (!over) return t;
      return {
        ...t,
        image: over.image && over.image.trim() ? over.image.trim() : t.image,
        departureDates:
          over.departureDates && over.departureDates.length > 0 ? over.departureDates : t.departureDates
      };
    });
  }, [customTripOverrides]);

  const handleOpenAdminTripModal = (e: React.MouseEvent, trip: TripItem) => {
    e.stopPropagation();
    triggerHaptic('medium');
    setEditingTripAdmin(trip);
    setAdminNewPosterInput(trip.image);
    setAdminNewDatesInput((trip.departureDates || []).join(', '));
  };

  const handleSaveAdminTripChanges = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTripAdmin) return;
    const parsedDates = adminNewDatesInput
      .split(',')
      .map((d) => d.trim())
      .filter(Boolean);

    const updated = {
      ...customTripOverrides,
      [editingTripAdmin.id]: {
        image: adminNewPosterInput.trim() || editingTripAdmin.image,
        departureDates: parsedDates.length > 0 ? parsedDates : editingTripAdmin.departureDates
      }
    };
    setCustomTripOverrides(updated);
    try {
      localStorage.setItem('svoi_trip_overrides', JSON.stringify(updated));
    } catch {
      // ignore storage errors
    }
    if (selectedTrip.id === editingTripAdmin.id) {
      setSelectedTrip((prev) => ({
        ...prev,
        image: adminNewPosterInput.trim() || prev.image,
        departureDates: parsedDates.length > 0 ? parsedDates : prev.departureDates
      }));
      if (parsedDates.length > 0) {
        setSelectedDepartureDate(parsedDates[0]);
      }
    }
    triggerHaptic('success');
    setDevToast(`✅ Оновлено дати та постер для туру «${editingTripAdmin.shortTitle}»!`);
    setTimeout(() => setDevToast(null), 3500);
    setEditingTripAdmin(null);
  };

  // Deterministic seat availability & occupancy calculation per tour and departure date (out of 8 seats in Opel Vivaro)
  const getTripOccupancy = (tripId: string, dateStr?: string) => {
    const totalSeats = 8;
    const tripObj = tripsWithOverrides.find((t) => t.id === tripId);
    const targetDate =
      dateStr ||
      tripDateSelections[tripId] ||
      (selectedTrip.id === tripId ? selectedDepartureDate : undefined) ||
      tripObj?.departureDates?.[0] ||
      '25.10.2026';

    let hash = 0;
    const key = `${tripId}__${targetDate}`;
    for (let i = 0; i < key.length; i++) {
      hash = (hash * 31 + key.charCodeAt(i)) % 997;
    }
    // Ensure several popular tours have <= 2 free seats (6 or 7 occupied out of 8) so "Гарячі тури" always has real items
    const hotPresetSeats: Record<string, number> = {
      como_milan: 7, // 1 seat left
      neuschwanstein: 6, // 2 seats left
      etretat_paris: 6, // 2 seats left
      europa_park: 7 // 1 seat left
    };
    const occupiedSeats =
      hotPresetSeats[tripId] !== undefined && !tripDateSelections[tripId]
        ? hotPresetSeats[tripId]
        : 2 + (hash % 6); // 2..7 occupied -> 1..6 free seats
    const freeSeats = Math.max(1, totalSeats - occupiedSeats);
    const occupancyPercent = Math.round((occupiedSeats / totalSeats) * 100);

    // Pick deterministic occupied seat IDs (e.g., seat-4, seat-6) while keeping seat-2 free by default
    const candidateSeats = ['seat-4', 'seat-6', 'seat-8', 'seat-3', 'seat-7', 'seat-5', 'seat-1'];
    const occupiedSeatIds = candidateSeats.slice(0, Math.min(2, occupiedSeats));

    return {
      totalSeats,
      freeSeats,
      occupiedSeats,
      occupancyPercent,
      targetDate,
      occupiedSeatIds
    };
  };

  // User Bookings History for Tab "4. Мої поїздки" (statuses: 'new' | 'confirmed' | 'cancelled')
  interface UserBookingRecord {
    id: string;
    bookingCode: string;
    tripId: string;
    tripTitle: string;
    tripShortTitle: string;
    tripImage: string;
    countryBadge: string;
    departureDate: string;
    duration: string;
    seatName: string;
    totalPrice: number;
    pickupPoint: string;
    createdAt: string;
    status: 'new' | 'confirmed' | 'cancelled';
  }

  const [myBookingsFilter, setMyBookingsFilter] = useState<'all' | 'new' | 'confirmed' | 'cancelled'>('all');
  const [myBookings, setMyBookings] = useState<UserBookingRecord[]>(() => {
    const defaultBookings: UserBookingRecord[] = [
      {
        id: 'bk-101',
        bookingCode: 'SVOI-MINI-4829',
        tripId: 'paris',
        tripTitle: TRIPS_LIST[0]?.title || 'Париж (Версаль + круїз на яхті)',
        tripShortTitle: TRIPS_LIST[0]?.shortTitle || 'Париж + Версаль',
        tripImage: TRIPS_LIST[0]?.image || 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=900&q=80',
        countryBadge: TRIPS_LIST[0]?.badge || '🇫🇷 Франція',
        departureDate: '25.10.2026 (Нд)',
        duration: '1 день',
        seatName: 'Місце 2 (1-й ряд, вікно)',
        totalPrice: 125,
        pickupPoint: 'Саарланд (за адресою): Bahnhofstraße 12, Saarbrücken',
        createdAt: '18.10.2026, 14:20',
        status: 'confirmed'
      },
      {
        id: 'bk-102',
        bookingCode: 'SVOI-MINI-7391',
        tripId: 'como_milan',
        tripTitle: 'Озеро Комо + Мілан + Лугано (Швейцарія & Італія)',
        tripShortTitle: 'Комо + Мілан + Лугано',
        tripImage: 'https://images.unsplash.com/photo-1536663815808-535e2280d2c2?auto=format&fit=crop&w=900&q=80',
        countryBadge: '🇮🇹 Італія / 🇨🇭 Швейцарія',
        departureDate: '07–08.11.2026 (Сб–Нд)',
        duration: '2 дні',
        seatName: 'Місце 1 (1-й ряд, панорамне)',
        totalPrice: 265,
        pickupPoint: 'Трір (за адресою)',
        createdAt: '20.10.2026, 11:05',
        status: 'new'
      },
      {
        id: 'bk-103',
        bookingCode: 'SVOI-MINI-2104',
        tripId: 'bruges',
        tripTitle: 'Середньовічний Брюгге — Північна Венеція',
        tripShortTitle: 'Казковий Брюгге',
        tripImage: 'https://images.unsplash.com/photo-1565060169194-19fabf63012c?auto=format&fit=crop&w=900&q=80',
        countryBadge: '🇧🇪 Бельгія',
        departureDate: '17.10.2026 (Сб)',
        duration: '1 день',
        seatName: 'Місце 5 (2-й ряд, праве вікно)',
        totalPrice: 115,
        pickupPoint: 'Люксембург (за адресою)',
        createdAt: '10.10.2026, 19:45',
        status: 'cancelled'
      }
    ];
    try {
      const saved = localStorage.getItem('svoi_user_bookings');
      return saved ? JSON.parse(saved) : defaultBookings;
    } catch {
      return defaultBookings;
    }
  });

  const handleUpdateBookingStatus = (bookingId: string, newStatus: 'new' | 'confirmed' | 'cancelled') => {
    triggerHaptic('selection');
    setMyBookings((prev) => {
      const updated = prev.map((b) => (b.id === bookingId ? { ...b, status: newStatus } : b));
      try {
        localStorage.setItem('svoi_user_bookings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
    const statusLabel =
      newStatus === 'confirmed' ? 'Підтверджена ✅' : newStatus === 'cancelled' ? 'Скасована ❌' : 'Нова заявка 🟡';
    setDevToast(`Статус заявки оновлено: ${statusLabel}`);
    setTimeout(() => setDevToast(null), 3000);
  };

  // Hot Tours (trips with <= 2 free seats) automatically computed
  const hotToursList = useMemo(() => {
    return tripsWithOverrides.filter((trip) => {
      const occ = getTripOccupancy(trip.id);
      return occ.freeSeats > 0 && occ.freeSeats <= 2;
    });
  }, [tripsWithOverrides, tripDateSelections]);

  // GitHub Pages / Public URL Binder Modal state
  const [showUrlSetupModal, setShowUrlSetupModal] = useState<boolean>(false);
  const [publicMiniAppUrl, setPublicMiniAppUrl] = useState<string>('https://arsik202406-jpg.github.io/tg-bot-SVOI/?miniapp=1');
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
    const filtered = tripsWithOverrides.filter(trip => {
      // Price range filter
      if (trip.price > maxPriceFilter) return false;

      // Search query filter (by title, shortTitle, country, badge, description, highlights, detailedProgram)
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase().trim();
        const matchTitle = trip.title.toLowerCase().includes(q) || trip.shortTitle.toLowerCase().includes(q);
        const matchCountry = (trip.country || '').toLowerCase().includes(q) || (trip.badge || '').toLowerCase().includes(q);
        const matchDesc = trip.description.toLowerCase().includes(q);
        const matchHighlights = trip.highlights.some(h => h.toLowerCase().includes(q));
        const matchProgram = (trip.detailedProgram || []).some(p => p.toLowerCase().includes(q));
        if (!matchTitle && !matchCountry && !matchDesc && !matchHighlights && !matchProgram) return false;
      }

      // Duration filter
      if (filterDuration === '1day' && trip.duration !== '1 день') return false;
      if (filterDuration === 'multiday' && trip.duration === '1 день') return false;

      // Hot tours filter (<= 2 free seats)
      if (onlyHotToursFilter) {
        const occ = getTripOccupancy(trip.id);
        if (occ.freeSeats > 2 || occ.freeSeats <= 0) return false;
      }
      
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
  }, [tripsWithOverrides, searchQuery, maxPriceFilter, priceSortOrder, filterDuration, onlyHotToursFilter, filterDateWeekend, tripDateSelections]);

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
    setSubmitAttempted(true);
    setTouchedFields({ name: true, handle: true, phone: true });

    const currentNameErr = validatePassengerName(passengerName);
    const currentHandleErr = validateTelegramHandle(passengerHandle);
    const currentPhoneErr = validatePhoneNumber(passengerPhone);

    if (currentNameErr || currentHandleErr || currentPhoneErr) {
      triggerHaptic('heavy');
      setDevToast('⚠️ Перевірте правильність імені, Telegram @username або номера телефону');
      setTimeout(() => setDevToast(null), 3500);
      return;
    }

    const cleanHandleRaw = normalizeTelegramHandle(passengerHandle);
    const formattedHandle = cleanHandleRaw.startsWith('@') ? cleanHandleRaw : `@${cleanHandleRaw}`;
    const formattedPhone = passengerPhone.trim().replace(/\s+/g, ' ');

    setPassengerHandle(formattedHandle);
    setPassengerPhone(formattedPhone);

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
      meetingPoint: `${pickupAddress.trim() ? `${pickupCity}: ${pickupAddress.trim()}` : pickupCity} • Тел: ${formattedPhone}`,
      userName: passengerName.trim(),
      userHandle: formattedHandle,
      userId: 8450153980,
      timestamp: new Date().toLocaleString('uk-UA'),
      status: 'new'
    };

    if (onNewLead) {
      onNewLead(newLead);
    }

    // Save to User Bookings History (Tab 4 "Мої поїздки")
    const userBookingEntry: UserBookingRecord = {
      id: `bk-${Date.now()}`,
      bookingCode,
      tripId: selectedTrip.id,
      tripTitle: selectedTrip.title,
      tripShortTitle: selectedTrip.shortTitle,
      tripImage: selectedTrip.image,
      countryBadge: selectedTrip.badge || '🇪🇺 Європа',
      departureDate: selectedDepartureDate,
      duration: selectedTrip.duration,
      seatName: selectedSeat ? selectedSeat.name : 'Вільна посадка (0€)',
      totalPrice,
      pickupPoint: pickupAddress.trim() ? `${pickupCity}: ${pickupAddress.trim()}` : pickupCity,
      createdAt: new Date().toLocaleString('uk-UA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      }),
      status: 'new'
    };

    setMyBookings((prev) => {
      const updated = [userBookingEntry, ...prev];
      try {
        localStorage.setItem('svoi_user_bookings', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });

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
    <div className={`relative w-full ${isEmbedded ? 'max-w-md mx-auto rounded-2xl sm:rounded-3xl' : 'max-w-5xl mx-auto rounded-2xl sm:rounded-3xl'} bg-[#0b1526] border border-sky-400/25 shadow-[0_12px_45px_rgba(2,132,199,0.18)] text-slate-100 flex flex-col h-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden font-sans select-none`}>
      {/* Soft Pleasant Travel Horizon Backdrop (Warm Sunset & Sky Glow) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-36 -left-24 w-96 h-96 bg-sky-500/12 rounded-full blur-3xl" />
        <div className="absolute top-1/4 -right-32 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-36 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
      </div>

      {/* Compact Brand Header Bar */}
      <div className="relative z-10 bg-[#0d192e]/90 backdrop-blur-xl border-b border-slate-800/80 px-3.5 sm:px-5 py-2.5 flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 via-teal-400 to-amber-300 p-[1.5px] shadow-sm">
              <div className="w-full h-full bg-[#0b1526] rounded-[10px] flex items-center justify-center text-sm">
                🚐
              </div>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xs sm:text-sm text-white tracking-tight">SVOI Travel Club</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-sky-500/15 text-sky-300 border border-sky-400/25">
                Міні-групи 8 місць
              </span>
            </div>
            <p className="text-[10px] text-slate-400 hidden sm:block">
              Комфортні тури вихідного дня з Саарланду, Люксембургу та Тріра
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Admin Mode Toggle for editing dates and posters */}
          <button
            onClick={() => {
              triggerHaptic('selection');
              setIsAdminMode(!isAdminMode);
            }}
            className={`px-2 py-1 rounded-xl text-[10px] font-bold border transition-all flex items-center gap-1 ${
              isAdminMode
                ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                : 'bg-slate-900/70 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Режим адміністратора"
          >
            <span>👑</span>
            <span className="hidden sm:inline">{isAdminMode ? 'Адмін: ON' : 'Адмін'}</span>
          </button>

          {/* Starlight toggle */}
          <button
            onClick={() => {
              triggerHaptic('soft');
              setStarlightCeiling(!starlightCeiling);
            }}
            className={`px-2 py-1 rounded-xl text-[10px] sm:text-[11px] font-semibold border transition-all flex items-center gap-1 ${
              starlightCeiling 
                ? 'bg-sky-500/20 border-sky-400/50 text-sky-200' 
                : 'bg-slate-900/70 border-slate-800 text-slate-400'
            }`}
            title="Атмосферне підсвічування салону"
          >
            <Sparkles className="w-3 h-3 text-sky-400" />
            <span className="hidden xs:inline">Атмосфера</span>
          </button>

          {onClose && (
            <button
              onClick={() => {
                triggerHaptic('light');
                onClose();
              }}
              className="w-7 h-7 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 flex items-center justify-center text-slate-300 hover:text-white transition-all shrink-0"
              title="Закрити"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Floating Toast Notification */}
      {devToast && (
        <div className="absolute top-14 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 border border-sky-400/50 shadow-xl rounded-2xl px-4 py-2 text-xs text-sky-100 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-sky-400 shrink-0" />
          <span>{devToast}</span>
        </div>
      )}

      {/* Mini App Step Navigation Bar */}
      <div className="relative z-10 bg-[#0f1d35]/90 backdrop-blur-md px-2.5 sm:px-5 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs shrink-0 overflow-x-auto scrollbar-none">
        <div className="flex items-center gap-1.5 w-full">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('tours');
            }}
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeStep === 'tours'
                ? 'bg-gradient-to-r from-sky-500 to-teal-500 text-white shadow-md shadow-sky-500/25'
                : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800/70'
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
            className={`flex-1 py-2 px-2.5 sm:px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 shrink-0 ${
              activeStep === 'seats'
                ? 'bg-gradient-to-r from-sky-500 to-indigo-500 text-white shadow-md shadow-indigo-500/25'
                : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800/70'
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
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1 shrink-0 ${
              activeStep === 'checkout'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-md shadow-emerald-500/25'
                : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800/70'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span className="truncate">3. Бронь ({totalPrice}€)</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('my_trips');
            }}
            className={`flex-1 py-2 px-2 sm:px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1 shrink-0 ${
              activeStep === 'my_trips'
                ? 'bg-amber-400 text-slate-950 font-extrabold shadow-md shadow-amber-400/25'
                : 'text-slate-300 hover:text-white bg-slate-900/60 border border-slate-800/70'
            }`}
          >
            <Luggage className="w-3.5 h-3.5" />
            <span className="truncate">4. Мої ({myBookings.length})</span>
          </button>
        </div>
      </div>

      {/* Main Mini App Body Area */}
      <div className="relative z-10 p-3 sm:p-5 flex-1 min-h-0 overflow-y-auto overscroll-contain space-y-4 [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.3)_transparent]">
        {/* ================= STEP 1: TOURS SHOWCASE (CLEAN TOURIST DESIGN) ================= */}
        {activeStep === 'tours' && (
          <div className="space-y-4 pb-12 sm:pb-6">
            {/* Friendly First-Time Visitor Onboarding Banner */}
            <div className="p-3 sm:p-3.5 rounded-2xl bg-gradient-to-r from-sky-950/80 via-teal-950/50 to-slate-900/90 border border-sky-400/25 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <div className="space-y-0.5">
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-white">
                  <span>🌍 Куди вирушимо цими вихідними?</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Забираємо від вашого дому (<b className="text-sky-300">Саарланд, Люксембург, Трір</b>) • Комфортний бус на 8 місць • <b className="text-emerald-300">0% передоплати</b> на одноденні тури
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-sky-200 bg-slate-950/60 px-2.5 py-1.5 rounded-xl border border-sky-500/20 shrink-0 self-start sm:self-center">
                <span>1. Оберіть тур</span>
                <span className="text-slate-500">→</span>
                <span>2. Місце в авто</span>
                <span className="text-slate-500">→</span>
                <span className="text-emerald-300">3. Заявка</span>
              </div>
            </div>

            {/* Streamlined Search & Filter Bar */}
            <div className="space-y-2.5">
              {/* Row 1: Search Bar + Duration Filter + ⚙️ Фільтри Button */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-sky-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Куди хочете поїхати? (напр. Париж, Нойшванштайн, Європа-Парк, Мозель)..."
                    className="w-full bg-slate-900/90 border border-slate-700/80 focus:border-sky-400 rounded-xl pl-10 pr-16 py-2.5 text-xs text-white placeholder:text-slate-400 outline-none transition-all"
                  />
                  {searchQuery.trim().length > 0 ? (
                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('light');
                        setSearchQuery('');
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] text-slate-300 hover:text-white flex items-center gap-1"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  ) : (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-semibold">
                      {filteredTrips.length} турів
                    </span>
                  )}
                </div>

                {/* Duration Pills & Collapsible ⚙️ Фільтри Trigger */}
                <div className="flex items-center justify-between sm:justify-end gap-1.5">
                  <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px]">
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('all');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        filterDuration === 'all' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      Усі
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('1day');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        filterDuration === '1day' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      1 день
                    </button>
                    <button
                      onClick={() => {
                        triggerHaptic('selection');
                        setFilterDuration('multiday');
                      }}
                      className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                        filterDuration === 'multiday' ? 'bg-sky-500 text-white shadow-sm' : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      2-3 дні
                    </button>
                  </div>

                  {/* Collapsible Advanced Filters Button (⚙️ Фільтри) */}
                  <button
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setShowAdvancedFilters((prev) => !prev);
                    }}
                    className={`px-3 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1 shrink-0 ${
                      showAdvancedFilters || maxPriceFilter < 450 || filterDateWeekend !== 'all' || priceSortOrder !== 'default'
                        ? 'bg-sky-500/20 border-sky-400 text-sky-200'
                        : 'bg-slate-900/90 border-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span>⚙️ Фільтри</span>
                    {(maxPriceFilter < 450 || filterDateWeekend !== 'all' || priceSortOrder !== 'default') && (
                      <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
                    )}
                  </button>

                  {/* Calendar Modal Trigger Button */}
                  <button
                    onClick={() => {
                      triggerHaptic('medium');
                      setShowCalendarModal(true);
                    }}
                    className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-sky-300 border border-slate-800 font-bold text-[11px] flex items-center gap-1 transition-all shrink-0"
                    title="Відкрити календар дат"
                  >
                    <Calendar className="w-3.5 h-3.5 text-sky-400" />
                    <span className="hidden md:inline">Календар</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Clean Country Pills (Horizontal Scroll) */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs scrollbar-none">
                {[
                  { q: '', label: '🌍 Усі напрямки' },
                  { q: 'Німеччина', label: '🇩🇪 Німеччина (7)' },
                  { q: 'Франція', label: '🇫🇷 Франція (5)' },
                  { q: 'Швейцарія', label: '🇨🇭 Швейцарія (2)' },
                  { q: 'Бельгія', label: '🇧🇪 Бельгія (2)' },
                  { q: 'Голландія', label: '🇳🇱 Голландія (2)' },
                  { q: 'Італія', label: '🇮🇹 Італія' },
                  { q: 'Ліхтенштейн', label: '🇱🇮 Ліхтенштейн' },
                  { q: 'Чехія', label: '🇨🇿 Чехія' }
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
                      className={`px-3 py-1 rounded-xl font-semibold shrink-0 transition-all border ${
                        isCountryActive
                          ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                          : 'bg-slate-900/75 border-slate-800 text-slate-300 hover:text-white hover:border-slate-700'
                      }`}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>

              {/* Country Route Summary Banner when a country is selected */}
              {searchQuery.trim().length > 0 && (() => {
                const qLow = searchQuery.toLowerCase().trim();
                const countrySummaryMap: Record<string, string> = {
                  'франція': '🇫🇷 Франція: Ельзас і Страсбург, Скелі Етрета, Мон-Сен-Мішель, Париж та Лазурове узбережжя',
                  'бельгія': '🇧🇪 Бельгія (2 окремі поїздки): 1) Брюссель (Гран-Плас і Атоміум) • 2) Антверпен + Брюгге',
                  'голландія': '🇳🇱 Голландія (2 окремі поїздки): 1) Гітхорн + Амстердам • 2) Заандам + Море + Амстердам',
                  'німеччина': '🇩🇪 Німеччина (окремі тури): 1) Замок Нойшванштайн + ущелина • 2) Берлін + Дрезден • 3) Леголенд • 4) Штутгарт (Mercedes & Porsche) • 5) Європа-Парк • 6) Замок Ельц і Мозель • 7) Гайдельберг і Баден-Баден',
                  'ліхтенштейн': '🇱🇮 Ліхтенштейн (3 країни за 1 день): Вадуц, австрійський Брегенц та острів Ліндау',
                  'швейцарія': '🇨🇭 Швейцарія: Рейнський водоспад, Цюрих, Люцерн, бірюзова ущелина Ааре, Лаутербруннен, Берн',
                  'італія': '🇮🇹 Італія: Озеро Комо, вілли Белладжо, Варенна та Мілан'
                };
                const summaryText = countrySummaryMap[qLow];
                if (!summaryText) return null;
                return (
                  <div className="px-3.5 py-2 rounded-xl bg-sky-950/60 border border-sky-500/35 text-xs text-sky-100 font-medium flex items-center justify-between gap-2">
                    <span className="leading-snug">{summaryText}</span>
                    <span className="px-2 py-0.5 rounded-lg bg-sky-500/20 text-[11px] text-sky-300 font-bold shrink-0">
                      {filteredTrips.length} турів
                    </span>
                  </div>
                );
              })()}

              {/* Collapsible ⚙️ Фільтри Panel (Price Range Slider, Quick Price Buttons, Date Filter) */}
              <AnimatePresence initial={false}>
                {showAdvancedFilters && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3.5 rounded-2xl bg-slate-900/95 border border-slate-700/80 space-y-3 shadow-inner mt-1">
                      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-200">💶 Бюджет поїздки:</span>
                          <span className="px-2 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold">
                            до {maxPriceFilter}€
                          </span>
                        </div>

                        {/* Sort Order Pills */}
                        <div className="flex items-center gap-1 text-[11px]">
                          <span className="text-slate-400 hidden sm:inline mr-1">Сортування:</span>
                          {[
                            { id: 'default', label: 'Популярні' },
                            { id: 'asc', label: 'Дешевші ↑' },
                            { id: 'desc', label: 'Дорожчі ↓' }
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
                                  ? 'bg-sky-500/30 border-sky-400 text-white'
                                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
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
                          className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-400"
                        />
                        <span className="text-[10px] font-mono text-emerald-400 font-bold shrink-0">450€</span>
                      </div>

                      {/* Quick Price Preset Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[10px]">
                        {[
                          { price: 100, label: '🔥 До 100€' },
                          { price: 120, label: '✨ До 120€' },
                          { price: 150, label: '🌊 До 150€' },
                          { price: 300, label: '🏔 До 300€' },
                          { price: 450, label: '💎 Усі ціни' }
                        ].map((preset) => (
                          <button
                            key={preset.price}
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              setMaxPriceFilter(preset.price);
                            }}
                            className={`px-2.5 py-1 rounded-lg font-medium transition-all border ${
                              maxPriceFilter === preset.price
                                ? 'bg-sky-500/25 border-sky-400 text-sky-200 font-bold'
                                : 'bg-slate-950/80 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {preset.label}
                          </button>
                        ))}
                      </div>

                      {/* Quick Weekend & Date Pills inside ⚙️ Фільтри */}
                      <div className="flex items-center gap-1.5 overflow-x-auto pt-2 border-t border-slate-800 text-[11px] scrollbar-none">
                        <span className="text-slate-400 font-semibold shrink-0 flex items-center gap-1">
                          <Filter className="w-3 h-3 text-sky-400" />
                          <span>Вихідні:</span>
                        </span>
                        {[
                          { id: 'all', label: 'Всі дати' },
                          { id: '24-25.10', label: '24–25.10' },
                          { id: '31.10-01.11', label: '31.10–01.11' },
                          { id: '07-08.11', label: '07–08.11' },
                          { id: '14-15.11', label: '14–15.11' },
                          { id: '21-22.11', label: '21–22.11' },
                          { id: '28-29.11', label: '28–29.11' },
                          { id: '12.2026', label: '❄️ Грудень' }
                        ].map((item) => (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              triggerHaptic('selection');
                              setFilterDateWeekend(item.id);
                            }}
                            className={`px-2 py-0.5 rounded-lg font-medium shrink-0 transition-all border ${
                              filterDateWeekend === item.id
                                ? 'bg-sky-500/25 border-sky-400 text-white font-bold'
                                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-white'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Active Filter Reset Bar */}
              {(filterDateWeekend !== 'all' || searchQuery.trim().length > 0 || maxPriceFilter < 450 || priceSortOrder !== 'default' || onlyHotToursFilter) && (
                <div className="flex items-center justify-between bg-slate-900/90 border border-slate-700 px-3 py-1.5 rounded-xl text-[11px] text-slate-200">
                  <span className="truncate">
                    Показано турів: <b className="text-sky-300">{filteredTrips.length}</b>
                    {onlyHotToursFilter && <> • 🔥 <b>Гарячі місця</b></>}
                    {searchQuery.trim() && <> • «<b>{searchQuery}</b>»</>}
                    {maxPriceFilter < 450 && <> • до <b>{maxPriceFilter}€</b></>}
                    {filterDateWeekend !== 'all' && <> • <b>{filterDateWeekend}</b></>}
                  </span>
                  <button
                    onClick={() => {
                      triggerHaptic('selection');
                      setFilterDateWeekend('all');
                      setSearchQuery('');
                      setMaxPriceFilter(450);
                      setPriceSortOrder('default');
                      setFilterDuration('all');
                      setOnlyHotToursFilter(false);
                    }}
                    className="text-[11px] font-bold text-sky-400 hover:text-white shrink-0 ml-2"
                  >
                    Скинути все ✕
                  </button>
                </div>
              )}

              {/* 🔥 COMPACT HORIZONTAL HOT TOURS STRIP (Easy on the eyes, doesn't clutter the first screen) */}
              {hotToursList.length > 0 && (
                <div className="p-2.5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-rose-950/35 to-slate-900/90 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between gap-2 px-0.5">
                    <div className="flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-extrabold text-white">
                        Гарячі місця на найближчі виїзди
                      </span>
                      <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-200">
                        залишилось 1–2 місця
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setOnlyHotToursFilter((prev) => !prev);
                      }}
                      className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold border transition-all shrink-0 ${
                        onlyHotToursFilter
                          ? 'bg-amber-500 text-slate-950 border-amber-300'
                          : 'bg-slate-900/90 hover:bg-slate-800 text-amber-200 border-amber-500/35'
                      }`}
                    >
                      {onlyHotToursFilter ? 'Усі тури' : 'Лише гарячі 🔥'}
                    </button>
                  </div>

                  {/* Horizontal Scrollable Mini-Pills */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
                    {hotToursList.map((hotTrip) => {
                      const occ = getTripOccupancy(hotTrip.id);
                      return (
                        <div
                          key={`hot-${hotTrip.id}`}
                          onClick={() => handleSelectTrip(hotTrip, occ.targetDate)}
                          className="group cursor-pointer p-1.5 pr-3 rounded-xl bg-slate-950/85 hover:bg-slate-900 border border-slate-800 hover:border-amber-400/60 transition-all flex items-center gap-2.5 shrink-0 min-w-[210px]"
                        >
                          <img
                            src={hotTrip.image}
                            alt={hotTrip.shortTitle}
                            className="w-10 h-10 rounded-lg object-cover shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1.5">
                              <span className="text-[11px] font-bold text-white truncate group-hover:text-sky-300">
                                {hotTrip.shortTitle}
                              </span>
                              <span className="text-[11px] font-black text-emerald-400 shrink-0">
                                {hotTrip.price}€
                              </span>
                            </div>
                            <div className="flex items-center justify-between gap-2 text-[10px] mt-0.5">
                              <span className="text-slate-400 truncate">📅 {occ.targetDate.split(' ')[0]}</span>
                              <span className="text-amber-300 font-bold shrink-0">
                                🔥 {occ.freeSeats} місц.
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Empty Search State */}
            {filteredTrips.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-8 rounded-2xl bg-slate-900/70 border border-slate-800 text-center space-y-3"
              >
                <Search className="w-8 h-8 text-slate-400 mx-auto" />
                <h4 className="text-sm font-bold text-white">За вашим запитом турів не знайдено</h4>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  Спробуйте обрати іншу країну або скинути фільтри, щоб побачити всі {TRIPS_LIST.length} авторських маршрутів.
                </p>
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSearchQuery('');
                    setMaxPriceFilter(450);
                    setPriceSortOrder('default');
                    setFilterDuration('all');
                    setFilterDateWeekend('all');
                    setOnlyHotToursFilter(false);
                  }}
                  className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white text-xs font-bold transition-all"
                >
                  Показати всі {TRIPS_LIST.length} турів
                </button>
              </motion.div>
            ) : (
              /* Clean, Readable Tourist Cards Grid (Progressive Disclosure so user isn't overwhelmed) */
              <motion.div layout className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <AnimatePresence mode="popLayout">
                  {filteredTrips.map((trip, idx) => {
                    const isSelected = selectedTrip.id === trip.id;
                    const isCalendarSaved = Boolean(calendarAddedTrips[trip.id]);
                    const isProgramOpen = expandedProgramTripId === trip.id;
                    const occ = getTripOccupancy(trip.id);

                    return (
                      <motion.div
                        layout
                        key={trip.id}
                        initial={{ opacity: 0, y: 18 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{
                          duration: 0.25,
                          delay: Math.min(idx * 0.03, 0.2)
                        }}
                        onClick={() => handleSelectTrip(trip)}
                        className={`group relative rounded-2xl overflow-hidden cursor-pointer border transition-all duration-300 flex flex-col justify-between ${
                          isSelected
                            ? 'border-sky-400 bg-[#10203a] shadow-[0_8px_30px_rgba(56,189,248,0.2)] ring-1 ring-sky-400/50'
                            : 'border-slate-800/90 hover:border-sky-400/50 bg-[#0f1b31]/90 hover:bg-[#122038]'
                        }`}
                      >
                        {/* Clean Magazine-Style Tour Photo Header */}
                        <div className="relative h-48 w-full overflow-hidden">
                          <img
                            src={trip.image}
                            alt={trip.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#0f1b31] via-[#0f1b31]/35 to-black/25" />

                          {/* Top Left Country & Category Badge */}
                          <div className="absolute top-3 left-3 flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-xl bg-slate-950/75 backdrop-blur-md text-[11px] font-bold text-white border border-white/15 shadow-sm">
                              {trip.badge}
                            </span>
                            <span className="px-2 py-1 rounded-xl bg-slate-950/75 backdrop-blur-md text-[11px] font-semibold text-amber-300 border border-white/10 flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {trip.duration}
                            </span>
                          </div>

                          {/* Top Right Price Pill & Share */}
                          <div className="absolute top-3 right-3 flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => handleShareTrip(e, trip)}
                              className="w-8 h-8 rounded-xl bg-slate-950/75 hover:bg-slate-900 text-slate-200 hover:text-sky-300 border border-white/15 flex items-center justify-center backdrop-blur-md transition-all"
                              title="Поділитися туром"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                            <div className="px-3 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-sm shadow-lg">
                              {trip.price}{trip.currency}
                            </div>
                          </div>

                          {/* Bottom Title Overlay on Image for Instant Readability */}
                          <div className="absolute bottom-2.5 left-3.5 right-3.5 flex items-end justify-between gap-2">
                            <div>
                              <h4 className="font-extrabold text-white text-base sm:text-lg leading-tight drop-shadow-sm group-hover:text-sky-200 transition-colors">
                                {trip.shortTitle}
                              </h4>
                              <p className="text-[11px] text-slate-300 line-clamp-1 mt-0.5">
                                {trip.title}
                              </p>
                            </div>
                            {isSelected && (
                              <span className="px-2 py-0.5 rounded-lg bg-sky-400 text-slate-950 text-[10px] font-extrabold shrink-0">
                                ✓ Обрано
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Uncluttered Card Body */}
                        <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                          {/* Concise 2-line overview */}
                          <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                            {trip.description}
                          </p>

                          {/* Key Highlights Row (Max 3 clean tags) */}
                          <div className="flex flex-wrap gap-1.5">
                            {trip.highlights.slice(0, 3).map((h, i) => (
                              <span
                                key={i}
                                className="px-2.5 py-0.5 rounded-lg bg-slate-900/90 text-[11px] text-sky-200/90 border border-slate-800"
                              >
                                • {h}
                              </span>
                            ))}
                          </div>

                          {/* Simple Date Selector + Clean Seat Availability Indicator */}
                          {trip.departureDates && trip.departureDates.length > 0 && (
                            <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                              <div className="flex items-center justify-between gap-2 text-[11px]">
                                <span className="text-slate-300 font-semibold flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-sky-400" />
                                  <span>Оберіть дату:</span>
                                </span>
                                <span
                                  className={`font-bold text-[11px] ${
                                    occ.freeSeats <= 2
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}
                                >
                                  {occ.freeSeats <= 2 ? `🔥 Лише ${occ.freeSeats} з 8 місць` : `💺 Вільно ${occ.freeSeats} з 8 місць`}
                                </span>
                              </div>

                              {/* Date Chips */}
                              <div className="flex flex-wrap gap-1.5">
                                {trip.departureDates.slice(0, 4).map((d) => {
                                  const activeCardDate =
                                    tripDateSelections[trip.id] ||
                                    (isSelected ? selectedDepartureDate : trip.departureDates?.[0]);
                                  const isDateActive = activeCardDate === d;
                                  return (
                                    <button
                                      key={d}
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        triggerHaptic('selection');
                                        setTripDateSelections((prev) => ({ ...prev, [trip.id]: d }));
                                        setSelectedTrip(trip);
                                        setSelectedDepartureDate(d);
                                      }}
                                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border ${
                                        isDateActive
                                          ? 'bg-sky-500 text-white border-sky-400 shadow-sm'
                                          : 'bg-slate-900 text-slate-300 hover:text-white border-slate-800'
                                      }`}
                                    >
                                      {d}
                                    </button>
                                  );
                                })}
                              </div>

                              {/* Slim Occupancy Bar */}
                              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                                <motion.div
                                  key={`${trip.id}-${occ.targetDate}`}
                                  initial={{ width: 0 }}
                                  animate={{ width: `${occ.occupancyPercent}%` }}
                                  transition={{ duration: 0.4, ease: 'easeOut' }}
                                  className={`h-full rounded-full bg-gradient-to-r ${
                                    occ.freeSeats <= 2
                                      ? 'from-amber-500 to-rose-500'
                                      : 'from-emerald-400 to-sky-400'
                                  }`}
                                />
                              </div>
                            </div>
                          )}

                          {/* Progressive Disclosure: Collapsible Detailed Program so cards stay clean */}
                          <div>
                            <div className="flex items-center justify-between gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  triggerHaptic('light');
                                  setExpandedProgramTripId(isProgramOpen ? null : trip.id);
                                }}
                                className="text-[11px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 py-0.5 transition-colors"
                              >
                                <span>{isProgramOpen ? 'Згорнути маршрут ▲' : '📖 Детальна програма по годинах ▼'}</span>
                              </button>

                              <div className="flex items-center gap-1">
                                {isAdminMode && (
                                  <button
                                    type="button"
                                    onClick={(e) => handleOpenAdminTripModal(e, trip)}
                                    className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-400/40"
                                  >
                                    👑 Ред.
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={(e) => handleAddToCalendar(e, trip)}
                                  className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold flex items-center gap-1 border transition-all ${
                                    isCalendarSaved
                                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                      : 'bg-slate-900/80 text-slate-400 hover:text-white border-slate-800'
                                  }`}
                                >
                                  <CalendarPlus className="w-3 h-3" />
                                  <span>{isCalendarSaved ? 'У календарі ✓' : 'В календар'}</span>
                                </button>
                              </div>
                            </div>

                            <AnimatePresence initial={false}>
                              {isProgramOpen && trip.detailedProgram && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: 'auto' }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.2 }}
                                  className="overflow-hidden"
                                >
                                  <div className="mt-2 p-3 rounded-xl bg-slate-950/90 border border-slate-800 space-y-1.5 text-[11px] text-slate-300">
                                    <div className="font-bold text-sky-300">🗺 План поїздки:</div>
                                    <ul className="space-y-1 leading-relaxed">
                                      {trip.detailedProgram.map((step, sIdx) => (
                                        <li key={sIdx} className="flex items-start gap-1.5">
                                          <span className="text-sky-400 shrink-0">•</span>
                                          <span>{step}</span>
                                        </li>
                                      ))}
                                    </ul>
                                    <div className="pt-1.5 border-t border-slate-800/80 text-[10px] text-slate-400">
                                      📍 Виїзд і адресний збір: <b className="text-slate-200">Саарланд, Люксембург, Трір</b>
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>

                          {/* Clean Primary CTA Button */}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSelectTrip(trip);
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-sky-500 to-teal-500 hover:from-sky-400 hover:to-teal-400 text-white font-bold text-xs shadow-md shadow-sky-500/20 flex items-center justify-center gap-1.5 transition-all active:scale-[0.99]"
                          >
                            <span>Обрати місце та забронювати ({trip.price}€)</span>
                            <ChevronRight className="w-4 h-4" />
                          </button>
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

            {/* ================= WIDGET: СТАТИСТИКА ПОЇЗДОК (MOVED TO BOTTOM & COLLAPSED BY DEFAULT) ================= */}
            {(() => {
              const statsList = filteredTrips.map((t) => {
                const occ = getTripOccupancy(t.id);
                return { trip: t, ...occ };
              });
              const totalFreeAcrossTrips = statsList.reduce((acc, item) => acc + item.freeSeats, 0);
              const totalCapacityAcrossTrips = statsList.length * 8;
              const totalOccupiedAcrossTrips = totalCapacityAcrossTrips - totalFreeAcrossTrips;
              const avgOccupancyPercent =
                totalCapacityAcrossTrips > 0
                  ? Math.round((totalOccupiedAcrossTrips / totalCapacityAcrossTrips) * 100)
                  : 0;
              const hotTripsCount = statsList.filter((item) => item.freeSeats <= 2).length;

              return (
                <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900/95 to-indigo-950/40 border border-cyan-500/35 shadow-[0_0_20px_rgba(34,211,238,0.08)] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
                        📊
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-extrabold text-white tracking-tight">
                            Статистика поїздок та вільні місця
                          </h4>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40 text-[10px] font-bold text-emerald-300">
                            {totalFreeAcrossTrips}/{totalCapacityAcrossTrips} вільно • {avgOccupancyPercent}%
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Заповненість кожного туру (8 місць у бусі) • Гарячих рейсів: {hotTripsCount}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        triggerHaptic('selection');
                        setStatsWidgetExpanded((prev) => !prev);
                      }}
                      className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-[11px] font-semibold text-cyan-300 hover:text-white transition-all"
                    >
                      {statsWidgetExpanded ? 'Згорнути деталі ▲' : 'Розгорнути деталі ▼'}
                    </button>
                  </div>

                  {/* Expandable KPI + Per-Tour Occupancy Progress Bars (Collapsed by default) */}
                  <AnimatePresence initial={false}>
                    {statsWidgetExpanded && statsList.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden space-y-2.5"
                      >
                        <div className="grid grid-cols-3 gap-2 text-center pt-1">
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90">
                            <span className="text-[10px] text-slate-400 block">Доступно місць</span>
                            <span className="text-sm font-black text-emerald-400">
                              {totalFreeAcrossTrips} <span className="text-[10px] font-normal text-slate-500">/ {totalCapacityAcrossTrips}</span>
                            </span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90">
                            <span className="text-[10px] text-slate-400 block">Середня заповненість</span>
                            <span className="text-sm font-black text-cyan-300">{avgOccupancyPercent}%</span>
                          </div>
                          <div className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/90">
                            <span className="text-[10px] text-slate-400 block">Гарячі рейси</span>
                            <span className="text-sm font-black text-amber-400">{hotTripsCount}</span>
                          </div>
                        </div>

                        <div className="max-h-48 overflow-y-auto pr-1 space-y-2 scrollbar-thin">
                          {statsList.map(({ trip, freeSeats, occupiedSeats, occupancyPercent, targetDate }) => {
                            const barColor =
                              freeSeats <= 2
                                ? 'from-rose-500 to-amber-500'
                                : freeSeats <= 4
                                  ? 'from-amber-400 to-cyan-400'
                                  : 'from-emerald-400 to-cyan-500';
                            const badgeColor =
                              freeSeats <= 2
                                ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                                : freeSeats <= 4
                                  ? 'text-amber-300 bg-amber-500/15 border-amber-500/30'
                                  : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30';

                            return (
                              <div
                                key={`stat-${trip.id}`}
                                onClick={() => handleSelectTrip(trip, targetDate)}
                                className="p-2 rounded-xl bg-slate-950/90 hover:bg-slate-900 border border-slate-800/80 hover:border-cyan-500/40 cursor-pointer transition-all space-y-1.5"
                              >
                                <div className="flex items-center justify-between gap-2 text-[11px]">
                                  <div className="flex items-center gap-1.5 truncate">
                                    <span className="font-bold text-white truncate">{trip.shortTitle}</span>
                                    <span className="text-[10px] text-slate-400 shrink-0">• 📅 {targetDate}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <span className={`px-1.5 py-0.5 rounded-md border text-[10px] font-bold ${badgeColor}`}>
                                      Вільно: {freeSeats} з 8
                                    </span>
                                    <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
                                      {occupancyPercent}%
                                    </span>
                                  </div>
                                </div>
                                <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${occupancyPercent}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className={`h-full rounded-full bg-gradient-to-r ${barColor}`}
                                  />
                                </div>
                                <div className="flex items-center justify-between text-[9px] text-slate-500">
                                  <span>Зайнято місць: {occupiedSeats}/8</span>
                                  <span className="text-cyan-400 hover:underline">Обрати місце в салоні →</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })()}
          </div>
        )}

        {/* ================= STEP 2: 3D/2D CABIN & STARLIGHT CEILING ================= */}
        {activeStep === 'seats' && (
          <div className="space-y-4 pb-12 sm:pb-6">
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

            {/* Visual Cabin Container with Starlight Ceiling Effect (Seats Layout ON TOP immediately under button!) */}
            <div className="relative rounded-3xl p-4 sm:p-6 border-2 border-cyan-500/40 bg-gradient-to-b from-[#0a1128] via-[#090d20] to-[#060814] shadow-2xl overflow-hidden">
              {/* Animated Constellation Starlight Headliner overlay */}
              {starlightCeiling && (
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-4 left-10 w-1 h-1 bg-white rounded-full shadow-[0_0_8px_#fff] animate-ping" style={{ animationDuration: '3s' }} />
                  <div className="absolute top-12 right-20 w-1.5 h-1.5 bg-cyan-300 rounded-full shadow-[0_0_10px_#22d3ee] animate-pulse" />
                  <div className="absolute top-28 left-1/3 w-1 h-1 bg-amber-200 rounded-full shadow-[0_0_8px_#fde68a] animate-ping" style={{ animationDuration: '4s' }} />
                  <div className="absolute bottom-16 right-1/4 w-1 h-1 bg-purple-300 rounded-full shadow-[0_0_8px_#d8b4fe] animate-pulse" />
                  <div className="absolute bottom-8 left-1/4 w-1.5 h-1.5 bg-white rounded-full shadow-[0_0_10px_#fff] animate-ping" style={{ animationDuration: '5s' }} />
                  <div className="absolute inset-0 bg-gradient-to-tr from-cyan-500/5 via-purple-500/10 to-amber-500/5 opacity-60 pointer-events-none" />
                </div>
              )}

              {/* Front Windshield & Driver Cockpit */}
              <div className="mb-4 pb-3 border-b border-cyan-500/30 flex items-center justify-between">
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

              {/* SEATS LAYOUT IN 3 ROWS (MOVED TO TOP IMMEDIATELY UNDER HEADER) */}
              <div className="space-y-3.5 max-w-xl mx-auto">
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

                    {/* Місце 1 (+5€ Панорамне) та Місце 2 (+5€ Вікно) */}
                    {CABIN_SEATS.slice(0, 2).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      const isSeat1 = seat.id === 'seat-1';
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
                            {isSeat1 ? '1' : '2'}
                          </div>
                          <span className="text-xs font-bold">{isSeat1 ? 'Місце 1' : 'Місце 2'}</span>
                          <span className="text-[10px] text-amber-300 font-semibold">
                            +{seat.surcharge}€ ({isSeat1 ? 'Панорамне' : 'Вікно'})
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>

                {/* SLIDING DOOR / EXIT INDICATOR BETWEEN ROW 1 AND ROW 2 */}
                <div className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-cyan-950/30 border border-dashed border-cyan-500/40 text-[11px]">
                  <span className="text-slate-400">Лівий борт (панорамне вікно)</span>
                  <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                    <span>🚪 Вихід / Посадка (Розсувні двері)</span>
                    <span className="text-cyan-400">➡️</span>
                  </span>
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

              {/* COMPACT CABIN LEGEND MOVED TO THE BOTTOM UNDER THE SEATS */}
              <div className="mt-4 p-2.5 rounded-2xl bg-slate-950/85 border border-slate-800/80 space-y-2">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-cyan-300 flex items-center gap-1">
                    <Info className="w-3 h-3 text-cyan-400" />
                    <span>Легенда позначень схеми салону:</span>
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">2 + 3 + 3 (8 місць)</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 text-[10px]">
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-slate-800">
                    <span>👨‍✈️</span>
                    <span className="text-slate-300 font-medium">Водій клубу</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-amber-500/30">
                    <span className="text-amber-300 font-bold">1–2</span>
                    <span className="text-amber-200 font-medium">1-й ряд (+5€)</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-sky-500/30">
                    <span className="text-sky-300 font-bold">3–8</span>
                    <span className="text-sky-200 font-medium">Салон (+5€ / 0€)</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-emerald-500/30">
                    <span className="text-emerald-400 font-black">✓</span>
                    <span className="text-emerald-300 font-medium">Обране місце</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-rose-500/30">
                    <span>🔒</span>
                    <span className="text-rose-300 font-medium">Зайняте (Бронь)</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-900/70 border border-cyan-500/30">
                    <span>🚪</span>
                    <span className="text-cyan-300 font-medium">Вихід справа</span>
                  </div>
                </div>
              </div>
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
            <AnimatePresence mode="wait">
              {orderSuccess ? (
                <motion.div
                  key="order-success-card"
                  initial={{ opacity: 0, scale: 0.9, y: 24 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.94, y: -16 }}
                  transition={{ type: 'spring', stiffness: 320, damping: 24 }}
                  className="p-6 rounded-3xl bg-emerald-950/40 border-2 border-emerald-400/60 text-center space-y-4 shadow-[0_0_40px_rgba(16,185,129,0.25)] relative overflow-hidden"
                >
                  {/* Subtle animated glow ring */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.5 }}
                    animate={{ opacity: [0.15, 0.35, 0.15], scale: [0.9, 1.15, 0.95] }}
                    transition={{ duration: 3.5, repeat: Infinity, ease: 'easeInOut' }}
                    className="w-40 h-40 rounded-full bg-emerald-500/20 blur-2xl absolute -top-10 left-1/2 -translate-x-1/2 pointer-events-none"
                  />

                  <motion.div
                    initial={{ scale: 0, rotate: -25 }}
                    animate={{ scale: [0, 1.2, 1], rotate: 0 }}
                    transition={{ delay: 0.08, duration: 0.45, ease: 'easeOut' }}
                    className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/30 relative z-10"
                  >
                    🎉
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.16, duration: 0.3 }}
                    className="space-y-1.5 relative z-10"
                  >
                    <h3 className="text-xl font-black text-white">
                      Заявку успішно відправлено менеджеру SVOI!
                    </h3>
                    <p className="text-xs text-slate-300 max-w-md mx-auto leading-relaxed">
                      Дякуємо, <b>{passengerName}</b>! Менеджер клубу зв'яжеться з вами за вказаним контактом ({passengerHandle}) для підтвердження часу адресного збору.
                    </p>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 14, scale: 0.97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.24, duration: 0.32 }}
                    className="p-4 bg-slate-950/85 rounded-2xl border border-emerald-500/30 max-w-sm mx-auto text-xs space-y-1.5 text-left relative z-10 shadow-inner"
                  >
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Тур:</span>
                      <span className="font-bold text-white text-right">{selectedTrip.shortTitle}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Дата виїзду:</span>
                      <span className="font-extrabold text-amber-300 text-right">{selectedDepartureDate}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Місце:</span>
                      <span className="font-bold text-cyan-300 text-right">{selectedSeat ? selectedSeat.name : 'Вільне'}</span>
                    </div>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-400">Точка збору:</span>
                      <span className="font-bold text-white text-right">{pickupCity}</span>
                    </div>
                    <div className="flex justify-between pt-1.5 border-t border-slate-800 text-sm font-black">
                      <span className="text-slate-300">Разом до сплати в день виїзду:</span>
                      <span className="text-emerald-400">{totalPrice}€</span>
                    </div>
                  </motion.div>

                  <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.32, duration: 0.3 }}
                    className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 relative z-10"
                  >
                    <a
                      href="https://t.me/SVOI_travel_admin"
                      target="_blank"
                      rel="noreferrer"
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all active:scale-95"
                    >
                      <span>Відкрити діалог з менеджером</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>

                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setOrderSuccess(false);
                        setActiveStep('my_trips');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-extrabold shadow-md shadow-amber-500/20 transition-all active:scale-95"
                    >
                      📋 Переглянути у «4. Мої поїздки»
                    </button>

                    <button
                      onClick={() => {
                        triggerHaptic('light');
                        setOrderSuccess(false);
                        setActiveStep('tours');
                      }}
                      className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95"
                    >
                      Обрати інший тур
                    </button>
                  </motion.div>
                </motion.div>
              ) : (
                <motion.form
                  key="booking-checkout-form"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.22 }}
                  onSubmit={handleSubmitBooking}
                  className="space-y-4"
                >
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
                  <div className="p-4 rounded-2xl bg-slate-950/80 border border-cyan-500/30 space-y-3 text-xs shadow-xl">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-400">Обраний напрямок:</span>
                        <h4 className="font-bold text-white text-sm">{selectedTrip.title}</h4>
                        <span className="text-slate-400 text-[11px]">Тривалість: {selectedTrip.duration}</span>
                      </div>
                      <span className="text-base font-extrabold text-cyan-300">{basePrice}€</span>
                    </div>

                    {/* Interactive Departure Date Selector (Dropdown + Chips) */}
                    <div className="pt-2.5 border-t border-slate-800/80 space-y-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="font-bold text-cyan-300">
                            Дата виїзду ({selectedTrip.departureDates?.length || 1} доступно):
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
                        </div>
                      </div>

                      {/* Date Selection Chips & Dropdown when tour has available departureDates */}
                      {selectedTrip.departureDates && selectedTrip.departureDates.length > 0 ? (
                        <div className="space-y-2 bg-slate-900/70 p-2.5 rounded-xl border border-slate-800/90">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <span className="text-[11px] text-slate-300 font-semibold">
                              Оберіть зручну дату виїзду:
                            </span>
                            {/* Dropdown selector for departure date */}
                            <select
                              value={selectedDepartureDate}
                              onChange={(e) => {
                                const newDate = e.target.value;
                                triggerHaptic('selection');
                                setSelectedDepartureDate(newDate);
                                setTripDateSelections((prev) => ({
                                  ...prev,
                                  [selectedTrip.id]: newDate
                                }));
                              }}
                              aria-label="Оберіть дату виїзду"
                              className="bg-slate-950 border border-cyan-500/40 focus:border-cyan-400 text-white text-xs font-bold rounded-xl px-3 py-1.5 outline-none cursor-pointer transition-all"
                            >
                              {selectedTrip.departureDates.map((d) => {
                                const occ = getTripOccupancy(selectedTrip.id, d);
                                return (
                                  <option key={d} value={d} className="bg-slate-950 text-white">
                                    📅 {d} — вільно {occ.freeSeats} із {occ.totalSeats} місць
                                  </option>
                                );
                              })}
                            </select>
                          </div>

                          {/* Quick interactive date chips */}
                          <div className="flex flex-wrap gap-1.5 pt-0.5">
                            {selectedTrip.departureDates.map((dateOption) => {
                              const isSelectedDate = selectedDepartureDate === dateOption;
                              const dateOccupancy = getTripOccupancy(selectedTrip.id, dateOption);
                              const isHotDate = dateOccupancy.freeSeats <= 2;

                              return (
                                <motion.button
                                  key={dateOption}
                                  type="button"
                                  whileHover={{ scale: 1.02 }}
                                  whileTap={{ scale: 0.96 }}
                                  onClick={() => {
                                    triggerHaptic('selection');
                                    setSelectedDepartureDate(dateOption);
                                    setTripDateSelections((prev) => ({
                                      ...prev,
                                      [selectedTrip.id]: dateOption
                                    }));
                                  }}
                                  className={`px-2.5 py-1.5 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
                                    isSelectedDate
                                      ? 'bg-cyan-500/25 border-cyan-400 text-white shadow-[0_0_12px_rgba(34,211,238,0.25)]'
                                      : 'bg-slate-950/80 border-slate-800 text-slate-300 hover:border-slate-700 hover:text-white'
                                  }`}
                                >
                                  <span>📅 {dateOption}</span>
                                  <span
                                    className={`px-1.5 py-0.5 rounded-md text-[9px] font-extrabold ${
                                      isHotDate
                                        ? 'bg-rose-500/25 text-rose-300 border border-rose-500/40'
                                        : isSelectedDate
                                        ? 'bg-cyan-400/25 text-cyan-200'
                                        : 'bg-slate-800 text-slate-400'
                                    }`}
                                  >
                                    {isHotDate ? `🔥 ${dateOccupancy.freeSeats} місц.` : `${dateOccupancy.freeSeats} вільно`}
                                  </span>
                                </motion.button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <span className="block text-xs font-bold text-white">
                          {selectedDepartureDate}
                        </span>
                      )}
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

                  {/* Contact Inputs with Real-Time Validation */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    {/* Passenger Name */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Ваше ім'я:
                        </label>
                        {!nameError ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Коректно
                          </span>
                        ) : (touchedFields.name || submitAttempted) ? (
                          <span className="text-[10px] font-bold text-rose-400">Помилка</span>
                        ) : null}
                      </div>
                      <div className="relative">
                        <User className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={passengerName}
                          onChange={(e) => {
                            setPassengerName(e.target.value);
                            setTouchedFields((prev) => ({ ...prev, name: true }));
                          }}
                          onBlur={() => setTouchedFields((prev) => ({ ...prev, name: true }))}
                          placeholder="Наприклад: Олена"
                          className={`w-full bg-slate-950 border rounded-xl pl-9 pr-3 py-2 text-white outline-none transition-all ${
                            nameError && (touchedFields.name || submitAttempted)
                              ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/15'
                              : !nameError
                              ? 'border-emerald-500/40 focus:border-cyan-400'
                              : 'border-slate-800 focus:border-cyan-500'
                          }`}
                        />
                      </div>
                      {nameError && (touchedFields.name || submitAttempted) && (
                        <p className="text-[10px] text-rose-400 font-medium mt-1 leading-tight">
                          ⚠️ {nameError}
                        </p>
                      )}
                    </div>

                    {/* Telegram Username (@handle) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Telegram Username (@):
                        </label>
                        {!handleError ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Валідний @handle
                          </span>
                        ) : (touchedFields.handle || submitAttempted) ? (
                          <span className="text-[10px] font-bold text-rose-400">Перевірте формат</span>
                        ) : null}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          value={passengerHandle}
                          onChange={(e) => {
                            const rawVal = e.target.value;
                            // Auto-convert pasted t.me/ links immediately
                            const cleaned = rawVal.replace(/^(https?:\/\/)?(www\.)?(t\.me|telegram\.me)\//i, '@');
                            setPassengerHandle(cleaned);
                            setTouchedFields((prev) => ({ ...prev, handle: true }));
                          }}
                          onBlur={() => {
                            setTouchedFields((prev) => ({ ...prev, handle: true }));
                            const trimmed = normalizeTelegramHandle(passengerHandle);
                            if (trimmed && !trimmed.startsWith('@')) {
                              setPassengerHandle(`@${trimmed}`);
                            } else if (trimmed !== passengerHandle) {
                              setPassengerHandle(trimmed);
                            }
                          }}
                          placeholder="@username (5–32 символи)"
                          className={`w-full bg-slate-950 border rounded-xl px-3 pr-8 py-2 text-white font-mono outline-none transition-all ${
                            handleError && (touchedFields.handle || submitAttempted)
                              ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/15'
                              : !handleError
                              ? 'border-emerald-500/40 focus:border-cyan-400'
                              : 'border-slate-800 focus:border-cyan-500'
                          }`}
                        />
                        {!handleError ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        ) : null}
                      </div>
                      {handleError && (touchedFields.handle || submitAttempted) ? (
                        <div className="mt-1 space-y-1">
                          <p className="text-[10px] text-rose-400 font-medium leading-tight">
                            ⚠️ {handleError}
                          </p>
                          {passengerHandle.trim().length > 0 && !passengerHandle.trim().startsWith('@') && (
                            <button
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                setPassengerHandle(`@${passengerHandle.trim().replace(/\s+/g, '')}`);
                              }}
                              className="text-[10px] text-cyan-300 hover:text-cyan-200 underline font-semibold"
                            >
                              + Додати символ «@» автоматично
                            </button>
                          )}
                        </div>
                      ) : (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Латиниця, цифри або «_» (від 5 символів, напр. @alex_traveler)
                        </p>
                      )}
                    </div>

                    {/* Phone Number with Country Code Quick Chips & E.164 Validation */}
                    <div className="sm:col-span-2">
                      <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                        <label className="text-[11px] font-semibold text-slate-300">
                          Телефон (WhatsApp / Telegram у міжнародному форматі):
                        </label>
                        {!phoneError ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-0.5">
                            <Check className="w-3 h-3" /> Номер підтверджено ({passengerPhone.replace(/\D/g, '').length} цифр)
                          </span>
                        ) : (touchedFields.phone || submitAttempted) ? (
                          <span className="text-[10px] font-bold text-rose-400">Невірний формат номера</span>
                        ) : null}
                      </div>

                      {/* Quick Country Prefix Helper Chips */}
                      <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                        <span className="text-[10px] text-slate-500">Код країни:</span>
                        {[
                          { code: '+49 ', label: '🇩🇪 +49 (Німеччина)' },
                          { code: '+352 ', label: '🇱🇺 +352 (Люксембург)' },
                          { code: '+380 ', label: '🇺🇦 +380 (Україна)' },
                          { code: '+33 ', label: '🇫🇷 +33 (Франція)' }
                        ].map((item) => {
                          const isActivePrefix = passengerPhone.trim().startsWith(item.code.trim());
                          return (
                            <button
                              key={item.code}
                              type="button"
                              onClick={() => {
                                triggerHaptic('selection');
                                setTouchedFields((prev) => ({ ...prev, phone: true }));
                                const stripped = passengerPhone
                                  .replace(/^\s*(\+49|\+352|\+380|\+33|\+48|\+41)\s*/, '')
                                  .replace(/^\+/, '');
                                setPassengerPhone(`${item.code}${stripped}`);
                              }}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold border transition-all ${
                                isActivePrefix
                                  ? 'bg-cyan-500/20 border-cyan-400 text-cyan-200'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>

                      <div className="relative">
                        <Phone className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                        <input
                          type="tel"
                          required
                          value={passengerPhone}
                          onChange={(e) => {
                            setPassengerPhone(e.target.value);
                            setTouchedFields((prev) => ({ ...prev, phone: true }));
                          }}
                          onBlur={() => setTouchedFields((prev) => ({ ...prev, phone: true }))}
                          placeholder="+49 170 1234567"
                          className={`w-full bg-slate-950 border rounded-xl pl-9 pr-8 py-2 text-white font-mono outline-none transition-all ${
                            phoneError && (touchedFields.phone || submitAttempted)
                              ? 'border-rose-500/80 focus:border-rose-400 bg-rose-950/15'
                              : !phoneError
                              ? 'border-emerald-500/40 focus:border-cyan-400'
                              : 'border-slate-800 focus:border-cyan-500'
                          }`}
                        />
                        {!phoneError ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        ) : null}
                      </div>
                      {phoneError && (touchedFields.phone || submitAttempted) ? (
                        <p className="text-[10px] text-rose-400 font-medium mt-1 leading-tight">
                          ⚠️ {phoneError}
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 mt-1">
                          Формат: код країни зі знаком «+» та 10–15 цифр (наприклад: +49 170 1234567 або +380 67 1234567)
                        </p>
                      )}
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

                  {/* Validation Error Summary Alert when invalid fields exist */}
                  {(submitAttempted || touchedFields.handle || touchedFields.phone || touchedFields.name) &&
                    !isBookingFormValid && (
                      <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/50 text-xs text-rose-200 space-y-1">
                        <div className="font-bold text-rose-300 flex items-center gap-1.5">
                          <span>🛡️ Перевірка контактних даних перед відправкою менеджеру:</span>
                        </div>
                        <ul className="list-disc list-inside text-[11px] text-rose-200/90 space-y-0.5">
                          {nameError && <li>{nameError}</li>}
                          {handleError && <li>{handleError}</li>}
                          {phoneError && <li>{phoneError}</li>}
                        </ul>
                      </div>
                    )}

                  {/* Submit button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full py-3.5 rounded-2xl text-white font-black text-sm shadow-xl flex items-center justify-center gap-2 transition-all active:scale-[0.99] disabled:opacity-50 ${
                      isBookingFormValid
                        ? 'bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-emerald-600/30'
                        : 'bg-slate-800 hover:bg-slate-700 border border-rose-500/40 text-slate-200'
                    }`}
                  >
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? 'Відправка заявки...'
                        : isBookingFormValid
                        ? `🚀 Забронювати поїздку (${totalPrice}€)`
                        : '⚠️ Виправте контактні дані для бронювання'}
                    </span>
                  </button>

                  {/* Social Proof & Customer Reviews Reassurance in Booking Flow */}
                  <div className="pt-2">
                    <ReviewsCarousel
                      leads={leads}
                      activeTripTitle={selectedTrip?.title}
                      onNewFeedbackLead={onNewLead}
                    />
                  </div>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* ================= STEP 4: MY TRIPS (4. МОЇ ПОЇЗДКИ) ================= */}
        {activeStep === 'my_trips' && (
          <div className="space-y-4 pb-14 sm:pb-8 animate-fade-in">
            {/* Header & Status Summary */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-amber-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-7 h-7 rounded-xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center text-amber-300">
                    <Luggage className="w-4 h-4" />
                  </span>
                  <div>
                    <h3 className="text-sm sm:text-base font-extrabold text-white">
                      Історія моїх бронювань та статус заявок
                    </h3>
                    <p className="text-[11px] text-slate-400">
                      Відстежуйте статус ваших поїздок (нова, підтверджена, скасована) та дати виїздів
                    </p>
                  </div>
                </div>
              </div>

              {/* Filter by status */}
              <div className="flex flex-wrap items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-[11px]">
                {[
                  { id: 'all', label: `Усі (${myBookings.length})` },
                  { id: 'new', label: `🟡 Нові (${myBookings.filter((b) => b.status === 'new').length})` },
                  { id: 'confirmed', label: `🟢 Підтверджені (${myBookings.filter((b) => b.status === 'confirmed').length})` },
                  { id: 'cancelled', label: `🔴 Скасовані (${myBookings.filter((b) => b.status === 'cancelled').length})` }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      triggerHaptic('selection');
                      setMyBookingsFilter(tab.id as 'all' | 'new' | 'confirmed' | 'cancelled');
                    }}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      myBookingsFilter === tab.id
                        ? 'bg-amber-500 text-slate-950 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Bookings List */}
            <div className="space-y-3">
              {myBookings
                .filter((b) => (myBookingsFilter === 'all' ? true : b.status === myBookingsFilter))
                .map((booking) => {
                  const statusConfig =
                    booking.status === 'confirmed'
                      ? {
                          label: 'Підтверджена',
                          dot: 'bg-emerald-400',
                          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                          desc: 'Місце зафіксовано за вами. Точний час заїзду надійде за день увечері.'
                        }
                      : booking.status === 'cancelled'
                      ? {
                          label: 'Скасована',
                          dot: 'bg-rose-400',
                          badgeClass: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
                          desc: 'Бронювання скасовано. Ви можете відновити заявку або обрати нову дату.'
                        }
                      : {
                          label: 'Нова заявка',
                          dot: 'bg-amber-400 animate-pulse',
                          badgeClass: 'bg-amber-500/20 text-amber-200 border-amber-500/40',
                          desc: 'Заявка прийнята в обробку менеджером клубу SVOI.'
                        };

                  return (
                    <motion.div
                      key={booking.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3.5 sm:p-4 rounded-2xl bg-slate-950/90 border border-slate-800 hover:border-cyan-500/40 transition-all shadow-lg space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-800/80">
                        <div className="flex items-center gap-3">
                          <img
                            src={booking.tripImage}
                            alt={booking.tripShortTitle}
                            className="w-14 h-14 rounded-xl object-cover shrink-0 border border-slate-700"
                          />
                          <div>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-slate-900 text-cyan-300 border border-cyan-500/30 font-bold">
                                #{booking.bookingCode}
                              </span>
                              <span className="text-[10px] text-slate-400">{booking.countryBadge}</span>
                            </div>
                            <h4 className="text-sm font-extrabold text-white mt-0.5">{booking.tripTitle}</h4>
                            <span className="text-[10px] text-slate-500">Створено: {booking.createdAt}</span>
                          </div>
                        </div>

                        {/* Status Badge */}
                        <div className="flex items-center justify-between sm:justify-end gap-2">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-extrabold border flex items-center gap-1.5 ${statusConfig.badgeClass}`}
                          >
                            <span className={`w-2 h-2 rounded-full ${statusConfig.dot}`} />
                            <span>Статус: {statusConfig.label}</span>
                          </span>
                        </div>
                      </div>

                      {/* Trip Details Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">📅 Дата подорожі:</span>
                          <span className="font-extrabold text-cyan-300">{booking.departureDate}</span>
                          <span className="text-[10px] text-slate-500 block">Тривалість: {booking.duration}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80">
                          <span className="text-[10px] text-slate-400 block">💺 Місце в салоні:</span>
                          <span className="font-bold text-white">{booking.seatName}</span>
                          <span className="text-[10px] text-slate-500 block">📍 {booking.pickupPoint}</span>
                        </div>
                        <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800/80 flex flex-col justify-between">
                          <span className="text-[10px] text-slate-400 block">💶 Вартість поїздки:</span>
                          <span className="text-base font-black text-emerald-400">{booking.totalPrice}€</span>
                          <span className="text-[10px] text-emerald-300/80">0% передоплати (при посадці)</span>
                        </div>
                      </div>

                      {/* Status explanation + Interactive actions */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 text-[11px]">
                        <span className="text-slate-400 italic">{statusConfig.desc}</span>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {/* Quick Status Switcher for Testing / Admin */}
                          <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-xl border border-slate-800">
                            <span className="text-[10px] text-slate-400 mr-1">Статус:</span>
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'new')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                booking.status === 'new'
                                  ? 'bg-amber-500 text-slate-950'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Нова
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'confirmed')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                booking.status === 'confirmed'
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Підтверджена
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateBookingStatus(booking.id, 'cancelled')}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold transition-all ${
                                booking.status === 'cancelled'
                                  ? 'bg-rose-500 text-white'
                                  : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              Скасована
                            </button>
                          </div>

                          <a
                            href={`https://t.me/SVOI_travel_admin?text=${encodeURIComponent(
                              `Вітаю! Питання щодо моєї броні #${booking.bookingCode} (${booking.tripShortTitle}, ${booking.departureDate})`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-200 border border-cyan-500/40 font-bold flex items-center gap-1 transition-all"
                          >
                            <Send className="w-3 h-3" />
                            <span>Менеджер</span>
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
            </div>

            {/* CTA to book another trip */}
            <div className="pt-2 flex justify-center">
              <button
                type="button"
                onClick={() => {
                  triggerHaptic('medium');
                  setActiveStep('tours');
                }}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-cyan-600/25"
              >
                <Compass className="w-4 h-4" />
                <span>Обрати нову поїздку з каталогу турів</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================= ADMIN EDIT TOUR DATES & POSTER MODAL ================= */}
      <AnimatePresence>
        {editingTripAdmin && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4"
            onClick={() => setEditingTripAdmin(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 20, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md bg-[#0b1324] border-2 border-amber-500/50 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_40px_rgba(245,158,11,0.25)] space-y-4 text-xs"
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center justify-center font-bold">
                    👑
                  </div>
                  <div>
                    <h4 className="text-sm font-extrabold text-white">Редагування туру (Адмін)</h4>
                    <p className="text-[11px] text-slate-400">{editingTripAdmin.shortTitle}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingTripAdmin(null)}
                  className="w-7 h-7 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center border border-slate-700"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAdminTripChanges} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    📅 Дати виїзду (через кому):
                  </label>
                  <input
                    type="text"
                    required
                    value={adminNewDatesInput}
                    onChange={(e) => setAdminNewDatesInput(e.target.value)}
                    placeholder="25.10.2026 (Нд), 01.11.2026 (Нд), 08.11.2026 (Нд)"
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white text-xs outline-none"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-amber-300 block mb-1">
                    🖼 Посилання на новий постер / фото туру (URL):
                  </label>
                  <input
                    type="url"
                    required
                    value={adminNewPosterInput}
                    onChange={(e) => setAdminNewPosterInput(e.target.value)}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-amber-400 rounded-xl px-3 py-2 text-white font-mono text-[11px] outline-none"
                  />
                  {adminNewPosterInput && (
                    <div className="mt-2 h-24 w-full rounded-xl overflow-hidden border border-slate-800">
                      <img
                        src={adminNewPosterInput}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setEditingTripAdmin(null)}
                    className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 font-semibold"
                  >
                    Скасувати
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20"
                  >
                    Зберегти зміни
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
