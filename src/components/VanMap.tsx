import type { Seat } from '../types';
import { haptic } from '../tg';

interface Props {
  seats: Seat[];
  taken: number[];
  selected: number[];
  onToggle: (no: number) => void;
  disabled?: boolean;
}

/** Схема салону Opel Vivaro зверху: кабіна, 2 + 3 + 3 місця. */
export default function VanMap({ seats, taken, selected, onToggle, disabled }: Props) {
  const rows = [1, 2, 3].map((r) => seats.filter((s) => s.row === r));

  const seatBtn = (s: Seat) => {
    const isTaken = taken.includes(s.no);
    const isSel = selected.includes(s.no);
    const base = 'relative flex h-[68px] flex-1 flex-col items-center justify-center rounded-2xl border-2 transition-all';
    let cls = 'border-line bg-surface text-ink active:scale-95';
    if (isTaken) cls = 'border-transparent bg-seat-taken text-muted';
    else if (isSel) cls = 'border-accent bg-accent text-accent-ink shadow-lg scale-[1.03]';
    else if (disabled) cls = 'border-line bg-surface text-muted opacity-50';
    return (
      <button
        key={s.no}
        type="button"
        disabled={isTaken}
        aria-pressed={isSel}
        aria-label={`Місце ${s.no}, ${s.label}${isTaken ? ', зайняте' : s.fee ? `, доплата ${s.fee} євро` : ', без доплати'}`}
        onClick={() => {
          haptic('select');
          onToggle(s.no);
        }}
        className={`${base} ${cls}`}
      >
        <span className="text-xl font-extrabold leading-none">{isTaken ? '✕' : s.no}</span>
        <span className="mt-1 text-[11px] font-bold opacity-80">
          {isTaken ? 'зайнято' : s.fee ? `+${s.fee} €` : '0 €'}
        </span>
      </button>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[340px]">
      <div className="rounded-[36px] border-2 border-line bg-surface-2 p-3 pt-4">
        {/* лобове скло */}
        <div className="mx-6 mb-3 h-3 rounded-full bg-line" aria-hidden />
        <div className="flex gap-2">
          <div className="flex h-[68px] flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-line text-muted">
            <span className="text-xl" aria-hidden>
              🧑‍✈️
            </span>
            <span className="mt-1 text-[11px] font-bold">водій</span>
          </div>
          {rows[0].map(seatBtn)}
        </div>
        <div className="my-3 h-px bg-line" aria-hidden />
        <div className="flex gap-2">{rows[1].map(seatBtn)}</div>
        <div className="mt-2 flex gap-2">{rows[2].map(seatBtn)}</div>
        <div className="mx-10 mt-3 h-2 rounded-full bg-line" aria-hidden />
      </div>
      <p className="mt-2 text-center text-xs font-semibold text-muted">↑ перед автомобіля</p>
    </div>
  );
}
