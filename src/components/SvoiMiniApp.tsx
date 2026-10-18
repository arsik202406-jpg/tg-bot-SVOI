import React, { useState, useMemo } from 'react';
import { 
  Sparkles, Armchair, Compass, Clock, MapPin, 
  Check, CheckCircle2, ChevronRight, User, Phone, 
  Send, ExternalLink, ShieldCheck, Zap, Snowflake, 
  Luggage, Info, Star, Flame, Eye, RefreshCw, X 
} from 'lucide-react';
import { TRIPS_LIST } from '../data/tripsData';
import { TripItem, LeadItem } from '../types';

interface SvoiMiniAppProps {
  onNewLead?: (lead: LeadItem) => void;
  onClose?: () => void;
  isEmbedded?: boolean;
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
    row: '1-й ряд (VIP біля водія)',
    rowNumber: 1,
    position: 'center',
    surcharge: 15,
    perks: ['Панорамний огляд лобового скла', 'Найбільше місця для ніг', 'USB-C Fast Charge']
  },
  {
    id: 'seat-2',
    name: 'Місце 2 (1-й ряд, вікно)',
    row: '1-й ряд (VIP біля водія)',
    rowNumber: 1,
    position: 'window',
    surcharge: 15,
    perks: ['Широкий панорамний вид', 'Окремий вихід', 'Підсклянник та USB-C']
  },
  // 2-й ряд
  {
    id: 'seat-3',
    name: 'Місце 3 (2-й ряд, ліве вікно)',
    row: '2-й ряд (Капітанські місця)',
    rowNumber: 2,
    position: 'window',
    surcharge: 10,
    perks: ['Окремий підлокітник', 'Індивідуальний дефлектор AC', 'Тоноване вікно']
  },
  {
    id: 'seat-4',
    name: 'Місце 4 (2-й ряд, центр)',
    row: '2-й ряд (Капітанські місця)',
    rowNumber: 2,
    position: 'center',
    surcharge: 5,
    perks: ['Відкидна спинка', 'Чудовий огляд салону', 'Доступ до клімат-контролю']
  },
  {
    id: 'seat-5',
    name: 'Місце 5 (2-й ряд, праве вікно)',
    row: '2-й ряд (Капітанські місця)',
    rowNumber: 2,
    position: 'window',
    surcharge: 10,
    perks: ['Зручний вихід через зсувні двері', 'Підлокітник', 'USB зарядка']
  },
  // 3-й ряд
  {
    id: 'seat-6',
    name: 'Місце 6 (3-й ряд, ліве вікно)',
    row: '3-й ряд (Затишний диван)',
    rowNumber: 3,
    position: 'window',
    surcharge: 5,
    perks: ['Затишне розташування', 'М\'який диван із регулюванням', 'Глибоке вікно']
  },
  {
    id: 'seat-7',
    name: 'Місце 7 (3-й ряд, центр)',
    row: '3-й ряд (Затишний диван)',
    rowNumber: 3,
    position: 'center',
    surcharge: 0,
    perks: ['Ідеально для компанії або сну', 'М\'яка анатомічна підтримка']
  },
  {
    id: 'seat-8',
    name: 'Місце 8 (3-й ряд, праве вікно)',
    row: '3-й ряд (Затишний диван)',
    rowNumber: 3,
    position: 'window',
    surcharge: 5,
    perks: ['Гарний бічний огляд', 'Близькість до багажного відсіку']
  }
];

export const SvoiMiniApp: React.FC<SvoiMiniAppProps> = ({ 
  onNewLead, 
  onClose,
  isEmbedded = false 
}) => {
  // Navigation within Mini App
  const [activeStep, setActiveStep] = useState<'tours' | 'seats' | 'checkout'>('tours');
  const [selectedTrip, setSelectedTrip] = useState<TripItem>(TRIPS_LIST[0]);
  const [selectedSeat, setSelectedSeat] = useState<SeatOption | null>(CABIN_SEATS[1]); // Default front row window
  const [filterDuration, setFilterDuration] = useState<'all' | '1day' | 'multiday'>('all');
  const [starlightCeiling, setStarlightCeiling] = useState(true);

  // Form states
  const [passengerName, setPassengerName] = useState('Олександр');
  const [passengerHandle, setPassengerHandle] = useState('@alex_traveler');
  const [passengerPhone, setPassengerPhone] = useState('+49 170 1234567');
  const [pickupCity, setPickupCity] = useState('Саарбрюккен');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(false);

  // Filtered tours
  const filteredTrips = useMemo(() => {
    return TRIPS_LIST.filter(trip => {
      if (filterDuration === '1day') return trip.duration === '1 день';
      if (filterDuration === 'multiday') return trip.duration !== '1 день';
      return true;
    });
  }, [filterDuration]);

  // Pricing calculations
  const basePrice = selectedTrip.price;
  const seatSurcharge = selectedSeat ? selectedSeat.surcharge : 0;
  const totalPrice = basePrice + seatSurcharge;

  // Safe Telegram WebApp HapticFeedback helper
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
    } catch {
      // Gracefully silent in standard browser mode
    }
  };

  const handleSelectTrip = (trip: TripItem) => {
    triggerHaptic('medium');
    setSelectedTrip(trip);
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
      tripTitle: selectedTrip.title,
      duration: selectedTrip.duration,
      seatType: selectedSeat ? selectedSeat.name : 'Вільна посадка (0€)',
      basePrice,
      seatFee: seatSurcharge,
      totalCost: totalPrice,
      meetingPoint: `За адресою: ${pickupCity}`,
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
        tg.sendData(JSON.stringify({
          action: 'book_trip',
          trip: selectedTrip.shortTitle,
          seat: selectedSeat?.name,
          total: totalPrice,
          code: bookingCode
        }));
      }
    } catch (err) {
      console.log('Telegram WebApp sendData not available in browser mode');
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setOrderSuccess(true);
      triggerHaptic('success');
    }, 600);
  };

  return (
    <div className={`relative w-full ${isEmbedded ? 'max-w-md mx-auto rounded-3xl overflow-hidden' : 'max-w-5xl mx-auto rounded-3xl'} bg-[#070b19] border border-cyan-500/30 shadow-[0_0_50px_rgba(6,182,212,0.15)] text-slate-100 flex flex-col overflow-hidden font-sans select-none`}>
      {/* Dynamic Cosmic Stars & Nebula Backdrop */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-cyan-600/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute top-1/3 -right-32 w-96 h-96 bg-purple-600/15 rounded-full blur-3xl animate-pulse" style={{ animationDuration: '6s' }} />
        <div className="absolute -bottom-32 left-1/3 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        {/* Subtle Constellation Grid */}
        <div className="absolute inset-0 opacity-[0.07] bg-[radial-gradient(#22d3ee_1px,transparent_1px)] [background-size:24px_24px]" />
      </div>

      {/* Top Telegram Mini App Header Bar */}
      <div className="relative z-10 bg-slate-950/80 backdrop-blur-xl border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-600 to-amber-400 p-[1.5px] shadow-lg shadow-cyan-500/30">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-xs text-cyan-300">
                ✨
              </div>
            </div>
            {starlightCeiling && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-cyan-400 rounded-full animate-ping" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm text-white tracking-wide">SVOI Mini App</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-400/30">
                Зоряне небо 🌌
              </span>
            </div>
            <p className="text-[11px] text-slate-400">VIP салон Opel Vivaro & 14 турів</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Starlight toggle */}
          <button
            onClick={() => {
              triggerHaptic('soft');
              setStarlightCeiling(!starlightCeiling);
            }}
            className={`px-2.5 py-1 rounded-xl text-[11px] font-semibold border transition-all flex items-center gap-1.5 ${
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
              className="w-8 h-8 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:text-white transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Mini App Tab Navigation Bar */}
      <div className="relative z-10 bg-slate-900/60 backdrop-blur-md px-4 py-2 border-b border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 w-full">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('tours');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeStep === 'tours'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30 border border-cyan-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>1. Тури ({TRIPS_LIST.length})</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('seats');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeStep === 'seats'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 border border-indigo-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <Armchair className="w-3.5 h-3.5" />
            <span>2. VIP Салон 3D</span>
          </button>

          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveStep('checkout');
            }}
            className={`flex-1 py-1.5 px-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-1.5 ${
              activeStep === 'checkout'
                ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30 border border-emerald-400/40'
                : 'text-slate-400 hover:text-white bg-slate-950/40'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>3. Бронь ({totalPrice}€)</span>
          </button>
        </div>
      </div>

      {/* Main Mini App Body Area */}
      <div className="relative z-10 p-4 sm:p-6 overflow-y-auto max-h-[75vh]">
        {/* ================= STEP 1: 14 TOURS SHOWCASE ================= */}
        {activeStep === 'tours' && (
          <div className="space-y-4">
            {/* Header intro & filters */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                  <Compass className="w-5 h-5 text-cyan-400" />
                  <span>Вітрина всіх 14 турів Європою</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Оберіть тур на зручну дату — без передоплати на одноденні поїздки!
                </p>
              </div>

              {/* Filter pills */}
              <div className="flex items-center gap-1.5 bg-slate-950/70 p-1 rounded-xl border border-slate-800 text-xs">
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

            {/* Tours Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTrips.map((trip) => {
                const isSelected = selectedTrip.id === trip.id;
                return (
                  <div
                    key={trip.id}
                    onClick={() => handleSelectTrip(trip)}
                    className={`group relative rounded-2xl overflow-hidden cursor-pointer border-2 transition-all duration-300 flex flex-col justify-between ${
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

                      {/* Price Tag Top Right */}
                      <span className="absolute top-2.5 right-2.5 px-3 py-1 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 text-xs font-black text-white shadow-lg shadow-emerald-600/30 border border-emerald-400/40">
                        {trip.price}{trip.currency}
                      </span>

                      {/* Duration Tag Bottom Left */}
                      <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 text-xs text-slate-200">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span className="font-semibold">{trip.duration}</span>
                      </div>
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

                      {/* CTA Button */}
                      <div className="pt-2 flex items-center justify-between border-t border-slate-800/80">
                        <span className="text-[11px] text-slate-400">
                          Посадка: <b className="text-slate-200">Саарбрюккен (06:00)</b>
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelectTrip(trip);
                          }}
                          className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs shadow-md shadow-cyan-600/30 flex items-center gap-1 transition-all"
                        >
                          <span>Обрати місце</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= STEP 2: 3D/2D VIP CABIN & STARLIGHT CEILING ================= */}
        {activeStep === 'seats' && (
          <div className="space-y-5">
            {/* Cabin Top Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-xs font-bold">
                    Тур: {selectedTrip.shortTitle}
                  </span>
                  <span className="text-xs text-emerald-400 font-bold">
                    {selectedTrip.price}€
                  </span>
                </div>
                <h3 className="text-lg font-extrabold text-white mt-1 flex items-center gap-2">
                  <Armchair className="w-5 h-5 text-indigo-400" />
                  <span>Інтерактивний VIP-салон Opel Vivaro</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Клікніть на потрібне крісло для бронювання. Стеля з підсвічуванням «Зоряне небо».
                </p>
              </div>

              <button
                onClick={() => {
                  triggerHaptic('medium');
                  setActiveStep('checkout');
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 flex items-center gap-2 self-start sm:self-auto"
              >
                <span>Перейти до замовлення ({totalPrice}€)</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Visual Cabin Container with Starlight Ceiling Effect */}
            <div className="relative rounded-3xl p-5 sm:p-7 border-2 border-cyan-500/40 bg-gradient-to-b from-[#0a1128] via-[#090d20] to-[#060814] shadow-2xl overflow-hidden">
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
                    Зоряне небо: УВІМКНЕНО
                  </span>
                </div>
              </div>

              {/* SEATS LAYOUT IN 3 ROWS */}
              <div className="space-y-4 max-w-xl mx-auto">
                {/* --- 1-Й РЯД (ВОДІЙ + 2 МІСЦЯ) --- */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-amber-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-300 flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                      1-й ряд (VIP біля водія, +15€)
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

                    {/* Місце 1 (центр) */}
                    {CABIN_SEATS.slice(0, 2).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      return (
                        <button
                          key={seat.id}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-amber-500/20 border-amber-400 shadow-[0_0_15px_rgba(251,191,36,0.4)] text-white scale-[1.02]'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-amber-500/40 text-slate-200 hover:border-amber-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold ${
                            isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-amber-300'
                          }`}>
                            {seat.id === 'seat-1' ? '1' : '2'}
                          </div>
                          <span className="text-xs font-bold">{seat.id === 'seat-1' ? 'Місце 1' : 'Місце 2'}</span>
                          <span className="text-[10px] text-amber-300 font-semibold">+{seat.surcharge}€ (Вікно)</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* --- 2-Й РЯД (3 КАПІТАНСЬКІ МІСЦЯ) --- */}
                <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-sky-500/30 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-sky-300 flex items-center gap-1.5">
                      <Armchair className="w-3.5 h-3.5 text-sky-400" />
                      2-й ряд (Капітанські крісла, +5..10€)
                    </span>
                    <span className="text-[10px] text-slate-400">Широкі підлокітники</span>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    {CABIN_SEATS.slice(2, 5).map((seat) => {
                      const isSelected = selectedSeat?.id === seat.id;
                      return (
                        <button
                          key={seat.id}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-sky-500/20 border-sky-400 shadow-[0_0_15px_rgba(56,189,248,0.4)] text-white scale-[1.02]'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-sky-500/40 text-slate-200 hover:border-sky-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold ${
                            isSelected ? 'bg-sky-500 text-slate-950' : 'bg-slate-800 text-sky-300'
                          }`}>
                            {seat.id.replace('seat-', '')}
                          </div>
                          <span className="text-xs font-bold">{seat.name.split(' ')[0]} {seat.id.replace('seat-', '')}</span>
                          <span className="text-[10px] text-sky-300 font-semibold">
                            {seat.surcharge > 0 ? `+${seat.surcharge}€` : '0€'}
                          </span>
                        </button>
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
                        <button
                          key={seat.id}
                          onClick={() => {
                            triggerHaptic('selection');
                            setSelectedSeat(seat);
                          }}
                          className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center justify-center text-center group ${
                            isSelected
                              ? 'bg-indigo-500/20 border-indigo-400 shadow-[0_0_15px_rgba(129,140,248,0.4)] text-white scale-[1.02]'
                              : 'bg-slate-900/80 hover:bg-slate-850 border-indigo-500/40 text-slate-200 hover:border-indigo-400'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs mb-1 font-bold ${
                            isSelected ? 'bg-indigo-500 text-slate-950' : 'bg-slate-800 text-indigo-300'
                          }`}>
                            {seat.id.replace('seat-', '')}
                          </div>
                          <span className="text-xs font-bold">{seat.name.split(' ')[0]} {seat.id.replace('seat-', '')}</span>
                          <span className="text-[10px] text-indigo-300 font-semibold">
                            {seat.surcharge > 0 ? `+${seat.surcharge}€` : 'Включено (0€)'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Free seating option */}
                <button
                  onClick={() => {
                    triggerHaptic('light');
                    setSelectedSeat(null);
                  }}
                  className={`w-full py-2.5 px-3 rounded-xl border transition-all text-xs flex items-center justify-between ${
                    selectedSeat === null
                      ? 'bg-emerald-950/60 border-emerald-400 text-emerald-200 shadow-[0_0_10px_rgba(52,211,153,0.3)]'
                      : 'bg-slate-900/60 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  <span className="font-semibold">🎲 Без фіксації конкретного місця (вільна посадка в день виїзду)</span>
                  <span className="font-bold text-emerald-400">0€ доплати</span>
                </button>
              </div>

              {/* Selected Seat Details Card */}
              {selectedSeat && (
                <div className="mt-4 p-3.5 rounded-xl bg-slate-950/90 border border-cyan-500/40 text-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
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
                </div>
              )}
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
          <div className="space-y-5">
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

                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 block mb-1">
                      Місто / Точка збору:
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                      <input
                        type="text"
                        required
                        value={pickupCity}
                        onChange={(e) => setPickupCity(e.target.value)}
                        placeholder="Саарбрюккен, Трір, Люксембург..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white outline-none focus:border-cyan-500"
                      />
                    </div>
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
        <span>Opel Vivaro VIP • 8 пасажирських місць</span>
      </div>
    </div>
  );
};
