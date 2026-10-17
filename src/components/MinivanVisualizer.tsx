import React, { useState } from 'react';
import { Armchair, Zap, Snowflake, Luggage, ShieldCheck, Check, ExternalLink, Sparkles } from 'lucide-react';

interface MinivanVisualizerProps {
  onSelectSeat?: (seatName: string, extraPrice: number) => void;
}

export const MinivanVisualizer: React.FC<MinivanVisualizerProps> = ({ onSelectSeat }) => {
  const [selectedSeat, setSelectedSeat] = useState<string | null>(null);

  const seats = [
    { 
      id: 'seat1', 
      number: 1,
      name: 'Место 1 (рядом с водителем, центр)', 
      shortName: 'Место 1 (центр)',
      row: '1-й ряд', 
      price: 5,
      position: 'Рядом с водителем',
      note: 'Первый ряд, отличный обзор через лобовое стекло, удобно выходить.' 
    },
    { 
      id: 'seat2', 
      number: 2,
      name: 'Место 2 (рядом с водителем, у окна)', 
      shortName: 'Место 2 (окно)',
      row: '1-й ряд', 
      price: 5,
      position: 'Рядом с водителем (окно)',
      note: 'Панорамный вид через лобовое стекло и боковое окно справа. Любимое место фотографов!' 
    },
    { 
      id: 'seat3', 
      number: 3,
      name: 'Место 3 (2-й ряд, у окна слева)', 
      shortName: 'Место 3 (окно слева)',
      row: '2-й ряд', 
      price: 5,
      position: '2-й ряд слева',
      note: 'Отличный обзор из бокового окна, много пространства для ног, откидная спинка.' 
    },
    { 
      id: 'seat4', 
      number: 4,
      name: 'Место 4 (2-й ряд, по центру)', 
      shortName: 'Место 4 (центр)',
      row: '2-й ряд', 
      price: 5,
      position: '2-й ряд центр',
      note: 'Удобное центральное кресло, мягкая посадка, отличный климат в середине салона.' 
    },
    { 
      id: 'seat5', 
      number: 5,
      name: 'Место 5 (2-й ряд, у окна справа)', 
      shortName: 'Место 5 (окно справа)',
      row: '2-й ряд', 
      price: 5,
      position: '2-й ряд справа',
      note: 'У окна справа рядом со сдвижной дверью: быстрый и комфортный выход на остановках.' 
    },
    { 
      id: 'seat6', 
      number: 6,
      name: 'Место 6 (3-й ряд, у окна слева)', 
      shortName: 'Место 6 (окно слева)',
      row: '3-й ряд', 
      price: 5,
      position: '3-й ряд слева',
      note: 'Уединенный задний ряд у окна: очень комфортно вздремнуть в дальних поездках.' 
    },
    { 
      id: 'seat7', 
      number: 7,
      name: 'Место 7 (3-й ряд, по центру)', 
      shortName: 'Место 7 (центр)',
      row: '3-й ряд', 
      price: 5,
      position: '3-й ряд центр',
      note: 'Просторный третий ряд, глубокие сиденья, уютно для спокойного путешествия.' 
    },
    { 
      id: 'seat8', 
      number: 8,
      name: 'Место 8 (3-й ряд, у окна справа)', 
      shortName: 'Место 8 (окно справа)',
      row: '3-й ряд', 
      price: 5,
      position: '3-й ряд справа',
      note: 'Место у окна в 3-м ряду с мягким подлокотником и регулируемым наклоном спинки.' 
    },
  ];

  const handleSeatClick = (seat: typeof seats[0]) => {
    setSelectedSeat(seat.id);
    onSelectSeat?.(seat.name, seat.price);
  };

  const handleFreeSeatClick = () => {
    setSelectedSeat('seat_none');
    onSelectSeat?.('Без выбора места (свободная посадка)', 0);
  };

  const getSelectedSeatObj = () => {
    if (selectedSeat === 'seat_none') {
      return {
        id: 'seat_none',
        number: 0,
        name: 'Без выбора места (свободная посадка)',
        shortName: 'Свободная посадка',
        row: 'Любой ряд',
        price: 0,
        position: 'Свободный выбор при посадке',
        note: 'Вы сможете занять любое свободное место в минивэне при посадке без доплаты (0€).'
      };
    }
    return seats.find((s) => s.id === selectedSeat);
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-2xl p-4 sm:p-6 text-slate-100 shadow-2xl space-y-6">
      {/* Title & Badge */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-4 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Минивэн Opel Vivaro • 8 пассажирских мест
            </span>
            <h3 className="text-xl font-bold text-white tracking-wide">Схема рассадки и выбор мест</h3>
          </div>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Рядом с водителем — 2 места • 2-й ряд — 3 места • 3-й ряд — 3 места. Интерактивные плашки по порядку.
          </p>
        </div>

        <div className="text-xs bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-slate-300">
          Выбор конкретного места: <b className="text-emerald-400">+5€</b> (без выбора: 0€)
        </div>
      </div>

      {/* Cabin Visualizer Frame */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Interactive Cabin Blueprint */}
        <div className="lg:col-span-6 flex flex-col">
          <div className="relative rounded-2xl p-4 sm:p-5 border border-slate-800 bg-slate-950/90 shadow-inner flex flex-col justify-between">
            {/* Header / Orientation */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80 mb-4">
              <span className="flex items-center gap-1.5 font-medium text-blue-400">
                <span>⬆️ Лобовое стекло / Направление движения</span>
              </span>
              <span className="text-[11px] text-slate-500 font-mono">1 водитель + 8 мест</span>
            </div>

            {/* Interior Seat Layout Blueprint */}
            <div className="space-y-3.5 my-1">
              {/* Row 1: Driver + 2 Passenger Seats */}
              <div>
                <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">
                  1-й ряд (Водитель + 2 пассажирских места)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {/* Driver seat */}
                  <div className="bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 text-center text-xs opacity-60 flex flex-col items-center justify-center">
                    <div className="text-slate-500 text-[10px]">Место шофёра</div>
                    <div className="font-semibold text-slate-300 mt-0.5 text-xs">👨‍✈️ Водитель</div>
                    <span className="text-[9px] text-slate-500 mt-0.5">SVOI Tour</span>
                  </div>

                  {/* Seat 1: Center Next to Driver */}
                  <button
                    onClick={() => handleSeatClick(seats[0])}
                    className={`rounded-xl p-2.5 text-center text-xs transition-all border flex flex-col items-center justify-between ${
                      selectedSeat === 'seat1'
                        ? 'bg-blue-600/35 border-blue-400 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] text-emerald-400 font-bold">+5€</span>
                      <span className="text-[9px] text-slate-400">1-й ряд</span>
                    </div>
                    <div className="font-bold my-1 text-xs text-white">Место 1</div>
                    <div className="text-[9px] text-slate-300 truncate w-full text-center">Рядом с водителем</div>
                  </button>

                  {/* Seat 2: Window Next to Driver */}
                  <button
                    onClick={() => handleSeatClick(seats[1])}
                    className={`rounded-xl p-2.5 text-center text-xs transition-all border flex flex-col items-center justify-between ${
                      selectedSeat === 'seat2'
                        ? 'bg-blue-600/35 border-blue-400 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                        : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-[10px] text-emerald-400 font-bold">+5€</span>
                      <span className="text-[9px] text-slate-400">1-й ряд</span>
                    </div>
                    <div className="font-bold my-1 text-xs text-white">Место 2</div>
                    <div className="text-[9px] text-slate-300 truncate w-full text-center">У окна справа</div>
                  </button>
                </div>
              </div>

              {/* Row 2: 3 Passenger Seats */}
              <div>
                <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">
                  2-й ряд (3 места)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[seats[2], seats[3], seats[4]].map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      className={`rounded-xl p-2.5 text-center text-xs transition-all border flex flex-col items-center justify-between ${
                        selectedSeat === seat.id
                          ? 'bg-blue-600/35 border-blue-400 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-emerald-400 font-bold">+5€</span>
                        <span className="text-[9px] text-slate-400">{seat.row}</span>
                      </div>
                      <div className="font-bold my-1 text-xs text-white">Место {seat.number}</div>
                      <div className="text-[9px] text-slate-300 truncate w-full text-center">
                        {seat.number === 3 ? 'Окно слева' : seat.number === 4 ? 'Центр' : 'Окно справа'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Row 3: 3 Passenger Seats */}
              <div>
                <div className="text-[10px] text-slate-500 mb-1 font-semibold uppercase tracking-wider">
                  3-й ряд (3 места)
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[seats[5], seats[6], seats[7]].map((seat) => (
                    <button
                      key={seat.id}
                      onClick={() => handleSeatClick(seat)}
                      className={`rounded-xl p-2.5 text-center text-xs transition-all border flex flex-col items-center justify-between ${
                        selectedSeat === seat.id
                          ? 'bg-blue-600/35 border-blue-400 text-white shadow-lg shadow-blue-500/25 ring-2 ring-blue-400'
                          : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700/80 text-slate-200 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-[10px] text-emerald-400 font-bold">+5€</span>
                        <span className="text-[9px] text-slate-400">{seat.row}</span>
                      </div>
                      <div className="font-bold my-1 text-xs text-white">Место {seat.number}</div>
                      <div className="text-[9px] text-slate-300 truncate w-full text-center">
                        {seat.number === 6 ? 'Окно слева' : seat.number === 7 ? 'Центр' : 'Окно справа'}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Luggage Area */}
            <div className="mt-4 pt-3 border-t border-slate-800/80 text-[11px] text-slate-400 text-center flex items-center justify-center gap-2 bg-slate-900/40 py-2.5 rounded-xl">
              <Luggage className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Багаж: <b>10 кг при дальних поездках</b> + ручная кладь в салон</span>
            </div>
          </div>
        </div>

        {/* Right Column: Selected Seat Info & Vehicle Highlights */}
        <div className="lg:col-span-6 flex flex-col justify-between space-y-4">
          {/* Seat Selected Summary Card */}
          <div className="p-4 sm:p-5 bg-slate-950 border border-slate-800 rounded-2xl space-y-3 shadow-xl">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">Статус бронирования места:</span>
              <span className="text-xs font-bold text-emerald-400 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                {selectedSeat === 'seat_none' ? '0€ (свободная посадка)' : selectedSeat ? '+5€ к стоимости тура' : 'Место не выбрано'}
              </span>
            </div>

            {selectedSeat ? (
              <div className="space-y-2 pt-1 animate-fade-in">
                <div className="text-base font-bold text-white flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-blue-600/20 text-blue-400 border border-blue-500/30">
                    <Armchair className="w-4 h-4" />
                  </span>
                  <span>{getSelectedSeatObj()?.name}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/80">
                  {getSelectedSeatObj()?.note}
                </p>
                <div className="pt-2 flex flex-col sm:flex-row gap-2">
                  <a
                    href={`https://t.me/SVOI_travel_admin?text=${encodeURIComponent(`Здравствуйте! Хочу забронировать ${getSelectedSeatObj()?.name} (${selectedSeat === 'seat_none' ? '0€' : '+5€'}).`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex-1 py-2.5 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-600/30"
                  >
                    <span>Забронировать у менеджера в Telegram</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                  <button
                    onClick={handleFreeSeatClick}
                    className="py-2 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs border border-slate-700 transition-colors"
                  >
                    Сбросить выбор (0€)
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400 py-4 text-center italic bg-slate-900/40 rounded-xl border border-dashed border-slate-800">
                Нажмите на любую плашку ниже или на схему сидений слева, чтобы выбрать место
              </div>
            )}
          </div>

          {/* Practical Vehicle Highlights */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
                <Armchair className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">8 мягких кресел</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Регулировка наклона спинки для сна и отдыха в пути.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">USB-порты зарядки</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Быстрая зарядка смартфонов в дороге для ваших фото.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                <Snowflake className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Кондиционер & тепло</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Оптимальный климат салона в любое время года.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-start gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-white">Без предоплаты</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  На однодневные туры оплата только при посадке!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Интерактивные плашки по порядку (1 - 8 + Свободная посадка) */}
      <div className="pt-2">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            <h4 className="text-sm font-bold text-white tracking-wide">
              Интерактивные плашки мест по порядку (1 — 8):
            </h4>
          </div>
          <span className="text-xs text-slate-400">Нажмите для быстрого выбора</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
          {seats.map((seat) => {
            const isSelected = selectedSeat === seat.id;
            return (
              <button
                key={seat.id}
                onClick={() => handleSeatClick(seat)}
                className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
                  isSelected
                    ? 'bg-blue-900/40 border-blue-400 ring-2 ring-blue-500/40 shadow-lg shadow-blue-500/10'
                    : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                      isSelected ? 'bg-blue-500 text-white' : 'bg-slate-800 text-slate-300'
                    }`}>
                      #{seat.number} • {seat.row}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-400">
                      +{seat.price}€
                    </span>
                  </div>

                  <div className="text-xs font-bold text-white group-hover:text-blue-300 transition-colors">
                    Место {seat.number}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {seat.position}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                  <span className="text-slate-500 truncate max-w-[130px]">{seat.note}</span>
                  {isSelected ? (
                    <span className="text-blue-400 font-bold flex items-center gap-1 shrink-0">
                      <Check className="w-3 h-3" /> Выбрано
                    </span>
                  ) : (
                    <span className="text-slate-400 group-hover:text-blue-400 transition-colors shrink-0">
                      Выбрать →
                    </span>
                  )}
                </div>
              </button>
            );
          })}

          {/* Option for free seating */}
          <button
            onClick={handleFreeSeatClick}
            className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between ${
              selectedSeat === 'seat_none'
                ? 'bg-emerald-950/50 border-emerald-400 ring-2 ring-emerald-500/40 shadow-lg shadow-emerald-500/10'
                : 'bg-slate-950/80 hover:bg-slate-900 border-slate-800 hover:border-slate-700'
            }`}
          >
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                  selectedSeat === 'seat_none' ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}>
                  🎲 Свободная посадка
                </span>
                <span className="text-[11px] font-bold text-emerald-400">
                  0€
                </span>
              </div>

              <div className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                Без выбора места
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Любое свободное при посадке
              </div>
            </div>

            <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
              <span className="text-slate-500">Бесплатный вариант</span>
              {selectedSeat === 'seat_none' ? (
                <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                  <Check className="w-3 h-3" /> Выбрано
                </span>
              ) : (
                <span className="text-slate-400 group-hover:text-emerald-400 transition-colors shrink-0">
                  Выбрать →
                </span>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
