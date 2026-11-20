import { Moon, Sun, Ticket, X } from 'lucide-react';
import type { ReactNode } from 'react';

export const STEP_LABELS = ['Поїздка', 'Дата', 'Місця', 'Адреса', 'Перевірка'];

export function Header({ theme, onTheme, onMy, myCount }: { theme: string; onTheme: () => void; onMy: () => void; myCount: number }) {
  return (
    <header className="flex items-center justify-between px-5 pt-4 pb-2">
      <div className="leading-tight">
        <div className="text-[22px] font-extrabold tracking-tight">
          SVOI<span className="text-accent">.</span>travel
        </div>
        <div className="text-[13px] font-semibold text-muted">Поїздки по Європі на мінівені</div>
      </div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onMy}
          className="relative flex h-11 items-center gap-1.5 rounded-full bg-surface px-3.5 text-sm font-bold shadow-sm"
          aria-label="Мої бронювання"
        >
          <Ticket size={18} />
          Мої
          {myCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] text-accent-ink">
              {myCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onTheme}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm"
          aria-label={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
        >
          {theme === 'dark' ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
    </header>
  );
}

export function Stepper({ step }: { step: number }) {
  return (
    <div className="px-5 pt-1 pb-3" aria-label={`Крок ${step + 1} з ${STEP_LABELS.length}`}>
      <div className="flex gap-1.5">
        {STEP_LABELS.map((_, i) => (
          <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-line'}`} />
        ))}
      </div>
      <div className="mt-2 flex items-baseline justify-between text-sm">
        <span className="font-extrabold">{STEP_LABELS[step]}</span>
        <span className="font-semibold text-muted">
          Крок {step + 1} з {STEP_LABELS.length}
        </span>
      </div>
    </div>
  );
}

export function BottomBar({ total, label, disabled, loading, onClick, hint }: {
  total?: number | null;
  label: string;
  disabled?: boolean;
  loading?: boolean;
  onClick: () => void;
  hint?: string;
}) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-bg/95 px-5 pt-3 pb-[max(14px,env(safe-area-inset-bottom))] backdrop-blur">
      <div className="mx-auto flex max-w-xl items-center gap-4">
        {total != null && (
          <div className="shrink-0 leading-tight">
            <div className="text-xs font-semibold text-muted">Разом</div>
            <div className="text-2xl font-extrabold">{total} €</div>
          </div>
        )}
        <button type="button" className="btn-primary flex-1 px-4" disabled={disabled || loading} onClick={onClick}>
          {loading ? 'Зачекайте…' : label}
        </button>
      </div>
      {hint && <p className="mx-auto mt-2 max-w-xl text-center text-[13px] font-semibold text-muted">{hint}</p>}
    </div>
  );
}

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-bg fade-in" role="dialog" aria-modal="true" aria-label={title}>
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="text-xl font-extrabold">{title}</h2>
        <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full bg-surface shadow-sm" aria-label="Закрити">
          <X size={22} />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 pb-10">{children}</div>
    </div>
  );
}

export function Choice({ active, onClick, children, disabled }: { active: boolean; onClick: () => void; children: ReactNode; disabled?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`w-full rounded-2xl border-2 p-4 text-left transition-all active:scale-[0.99] ${
        active ? 'border-accent bg-accent-soft' : 'border-transparent bg-surface shadow-sm'
      } ${disabled ? 'opacity-45' : ''}`}
    >
      {children}
    </button>
  );
}
