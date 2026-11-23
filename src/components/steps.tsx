import { Bell, CalendarPlus, Check, ChevronDown, Clock, MapPin, Minus, Phone, Plus, Share2, Star, Users } from 'lucide-react';
import { sendDateRequest } from '../api';
import { useState } from 'react';
import type { Catalog, Departure, Draft, Trip } from '../types';
import { haptic, openLink, requestPhone, tg } from '../tg';
import VanMap from './VanMap';
import { Choice } from './ui';

// Фото туру або охайна заглушка з прапором, якщо фото ще немає
function TripImage({ trip, className, hero }: { trip: Trip; className?: string; hero?: boolean }) {
  const [broken, setBroken] = useState(false);
  if (!trip.image || broken) {
    return (
      <div className={`flex items-center justify-center bg-gradient-to-br from-accent-soft via-surface-2 to-surface-2 ${className ?? ''}`} aria-hidden>
        <div className={`text-center ${hero ? '-mt-16' : ''}`}>
          <div className="text-6xl leading-none">{trip.flag}</div>
          {!hero && <div className="mt-2 text-xs font-extrabold tracking-[0.2em] text-muted uppercase">{trip.country}</div>}
        </div>
      </div>
    );
  }
  return <img src={trip.image} alt="" loading="lazy" onError={() => setBroken(true)} className={`object-cover ${className ?? ''}`} />;
}

function reviewWord(n: number): string {
  const d = n % 10, h = n % 100;
  if (d === 1 && h !== 11) return 'відгук';
  if (d >= 2 && d <= 4 && (h < 12 || h > 14)) return 'відгуки';
  return 'відгуків';
}

// ---------- Крок 1: список поїздок ----------

export function TripList({ catalog, onPick }: { catalog: Catalog; onPick: (t: Trip) => void }) {
  const next = new Map<string, Departure>();
  for (const d of catalog.departures) {
    if (d.free > 0 && !next.has(d.trip_id)) next.set(d.trip_id, d);
  }
  const dated = catalog.trips.filter((t) => next.has(t.id)).sort((a, b) => next.get(a.id)!.date.localeCompare(next.get(b.id)!.date));
  const soon = catalog.trips.filter((t) => !next.has(t.id));

  const card = (t: Trip, i: number) => {
    const d = next.get(t.id);
    return (
      <button
        key={t.id}
        type="button"
        onClick={() => onPick(t)}
        className="card fade-in block w-full overflow-hidden text-left active:scale-[0.99] transition-transform"
        style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}
      >
        <div className="relative aspect-[16/9] bg-surface-2">
          <TripImage trip={t} className="h-full w-full" />
          <div className="absolute top-3 left-3 rounded-full bg-black/55 px-3 py-1 text-sm font-bold text-white backdrop-blur">
            {t.flag} {t.duration}
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg leading-snug font-extrabold">{t.short_title}</h3>
            <div className="shrink-0 text-lg font-extrabold text-warm">{t.price} €</div>
          </div>
          <p className="mt-1 line-clamp-2 text-[15px] font-medium text-muted">{t.highlights.slice(0, 3).join(' · ')}</p>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-accent-soft px-3 py-1.5 text-sm font-bold text-accent">
            {d ? (
              <>
                <Clock size={15} /> {d.label} · вільно {d.free}
              </>
            ) : (
              <>
                <Bell size={15} /> Дати скоро
              </>
            )}
          </div>
        </div>
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {dated.length > 0 && <h2 className="px-1 text-sm font-extrabold tracking-wide text-muted uppercase">Найближчі поїздки</h2>}
      {dated.map(card)}
      {soon.length > 0 && (
        <h2 className="px-1 pt-2 text-sm font-extrabold tracking-wide text-muted uppercase">
          {dated.length ? 'Інші напрямки — дати скоро' : 'Наші напрямки'}
        </h2>
      )}
      {soon.map((t, i) => card(t, i + dated.length))}
    </div>
  );
}

// ---------- Крок 2: тур, дата, кількість людей ----------

export function TripStep({ trip, catalog, departures, draft, setDraft, onWaitlist, waitlisted }: {
  trip: Trip;
  catalog: Catalog;
  departures: Departure[];
  draft: Draft;
  setDraft: (d: Partial<Draft>) => void;
  onWaitlist: () => void;
  waitlisted: boolean;
}) {
  const [showProgram, setShowProgram] = useState(false);
  const dep = departures.find((d) => d.id === draft.departureId);
  const minPax = catalog.min_pax ?? 5;
  const reviews = catalog.reviews?.[trip.id];
  const maxPax = dep ? dep.free : 8;

  return (
    <div className="space-y-5">
      <div className="card overflow-hidden">
        <div className="relative aspect-[16/10]">
          <TripImage trip={trip} className="h-full w-full" hero />
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/5 to-transparent" />
          <div className="absolute right-4 bottom-4 left-4 text-white">
            <div className="text-sm font-bold opacity-90">
              {trip.flag} {trip.country} · {trip.duration}
            </div>
            <h2 className="mt-0.5 text-2xl leading-tight font-extrabold">{trip.short_title}</h2>
          </div>
        </div>
        <div className="p-4">
          <ul className="space-y-2">
            {trip.highlights.map((h) => (
              <li key={h} className="flex gap-2.5 text-[15px] font-semibold">
                <Check size={18} className="mt-0.5 shrink-0 text-accent" />
                {h}
              </li>
            ))}
          </ul>
          {trip.program.length > 0 && (
            <>
              <button
                type="button"
                onClick={() => setShowProgram(!showProgram)}
                className="mt-4 flex w-full items-center justify-between rounded-xl bg-surface-2 px-4 py-3 text-[15px] font-bold"
                aria-expanded={showProgram}
              >
                Програма по годинах
                <ChevronDown size={20} className={`transition-transform ${showProgram ? 'rotate-180' : ''}`} />
              </button>
              {showProgram && (
                <ol className="mt-3 space-y-3 border-l-2 border-accent-soft pl-4 fade-in">
                  {trip.program.map((p) => (
                    <li key={p} className="text-[15px] leading-snug font-medium">
                      {p}
                    </li>
                  ))}
                </ol>
              )}
            </>
          )}
          <div className="mt-4 flex items-center justify-between rounded-xl bg-accent-soft px-4 py-3">
            <span className="text-[15px] font-bold">Ціна з людини</span>
            <span className="text-xl font-extrabold text-accent">{trip.price} €</span>
          </div>
          <p className="mt-3 text-center text-[13px] font-semibold text-muted">🚐 Поїздка відбудеться, коли збереться від {minPax} людей</p>
          {catalog.bot_username && (
            <button
              type="button"
              onClick={() => {
                const link = `https://t.me/${catalog.bot_username}?start=trip_${trip.id}`;
                openLink(`https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(`Поїхали разом: ${trip.flag} ${trip.short_title} 🚐`)}`);
              }}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-line py-3 text-[15px] font-bold"
            >
              <Share2 size={18} /> Поділитися з друзями
            </button>
          )}
        </div>
      </div>

      {reviews && reviews.count > 0 && (
        <section className="card p-4">
          <div className="flex items-center gap-2">
            <Star size={20} className="fill-current text-warm" />
            <span className="text-lg font-extrabold">{reviews.avg.toFixed(1)}</span>
            <span className="text-[15px] font-semibold text-muted">· {reviews.count} {reviewWord(reviews.count)}</span>
          </div>
          <div className="mt-3 space-y-3">
            {reviews.items.map((r, i) => (
              <div key={i} className="border-t border-line pt-3 first:border-0 first:pt-0">
                <div className="text-sm font-bold">
                  {'⭐'.repeat(r.rating)} <span className="text-muted">{r.name}</span>
                </div>
                {r.text && <p className="mt-1 text-[15px] leading-snug font-medium">«{r.text}»</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 px-1 text-lg font-extrabold">Оберіть дату</h3>
        {departures.length === 0 ? (
          <div className="card p-5 text-center">
            <p className="text-[15px] font-semibold text-muted">Дати на цю поїздку ще не призначені.</p>
            <button
              type="button"
              disabled={waitlisted}
              onClick={onWaitlist}
              className="btn-primary mt-4 flex w-full items-center justify-center gap-2"
            >
              <Bell size={19} />
              {waitlisted ? 'Готово! Повідомимо першими' : 'Повідомити, коли з’являться'}
            </button>
          </div>
        ) : (
          <div className="space-y-2.5">
            {departures.map((d) => (
              <Choice
                key={d.id}
                active={d.id === draft.departureId}
                disabled={d.free <= 0}
                onClick={() => {
                  haptic('select');
                  setDraft({ departureId: d.id, pax: Math.min(draft.pax, Math.max(d.free, 1)), seats: [] });
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[17px] font-extrabold">{d.label}</span>
                  <span className={`text-sm font-bold ${d.free <= 2 ? 'text-warm' : 'text-muted'}`}>
                    {d.free > 0 ? `вільно ${d.free} з 8` : 'місць немає'}
                  </span>
                </div>
                {d.free > 0 && (d.booked ?? 0) < minPax && (
                  <div className="mt-1 text-[13px] font-semibold text-muted">
                    {(d.booked ?? 0) === 0 ? `Станьте першим — їдемо від ${minPax} людей` : `Ще ${minPax - (d.booked ?? 0)} — і поїздка гарантована`}
                  </div>
                )}
              </Choice>
            ))}
          </div>
        )}
      </section>

      <ProposeDate tripId={trip.id} />

      {dep && (
        <section className="fade-in">
          <h3 className="mb-3 px-1 text-lg font-extrabold">Скільки людей поїде?</h3>
          <div className="card flex items-center justify-between p-3">
            <button
              type="button"
              aria-label="Менше"
              disabled={draft.pax <= 1}
              onClick={() => {
                haptic();
                setDraft({ pax: draft.pax - 1, seats: [] });
              }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-surface-2 disabled:opacity-35"
            >
              <Minus size={24} />
            </button>
            <div className="text-center">
              <div className="text-3xl font-extrabold">{draft.pax}</div>
              <div className="text-sm font-semibold text-muted">
                <Users size={14} className="mr-1 inline" />
                {draft.pax === 1 ? 'людина' : draft.pax < 5 ? 'людини' : 'людей'}
              </div>
            </div>
            <button
              type="button"
              aria-label="Більше"
              disabled={draft.pax >= maxPax}
              onClick={() => {
                haptic();
                setDraft({ pax: draft.pax + 1, seats: [] });
              }}
              className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent text-accent-ink disabled:opacity-35"
            >
              <Plus size={24} />
            </button>
          </div>
        </section>
      )}
    </div>
  );
}

function ProposeDate({ tripId }: { tripId: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  if (state === 'done') {
    return (
      <div className="rounded-2xl bg-accent-soft p-4 text-[15px] font-bold text-accent fade-in">
        ✓ Дякуємо! Передали менеджеру. Якщо збереться група — додамо дату й напишемо вам першими.
      </div>
    );
  }
  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line py-3.5 text-[15px] font-bold text-muted">
        <CalendarPlus size={19} /> Не підходить дата? Запропонуйте свою
      </button>
    );
  }
  return (
    <div className="card space-y-3 p-4 fade-in">
      <label className="block">
        <span className="mb-2 block text-[15px] font-extrabold">Яка дата вам зручна і скільки вас буде?</span>
        <textarea className="field min-h-[80px] resize-none" value={text} onChange={(e) => setText(e.target.value)} placeholder="Наприклад: 14 або 21 грудня, нас 4" />
      </label>
      {state === 'error' && <p className="text-sm font-bold text-danger">{error}</p>}
      <button
        type="button"
        className="btn-primary w-full"
        disabled={text.trim().length < 2 || state === 'sending'}
        onClick={async () => {
          setState('sending');
          try {
            await sendDateRequest(tripId, text.trim());
            haptic('success');
            setState('done');
          } catch (e) {
            setError(e instanceof Error ? e.message : 'Помилка');
            setState('error');
          }
        }}
      >
        {state === 'sending' ? 'Надсилаємо…' : 'Надіслати менеджеру'}
      </button>
    </div>
  );
}

// ---------- Крок 3: місця ----------

export function SeatStep({ catalog, dep, draft, setDraft }: { catalog: Catalog; dep: Departure; draft: Draft; setDraft: (d: Partial<Draft>) => void }) {
  const need = draft.pax;
  const left = need - draft.seats.length;

  const toggle = (no: number) => {
    let seats = [...draft.seats];
    if (seats.includes(no)) seats = seats.filter((s) => s !== no);
    else if (seats.length < need) seats.push(no);
    else if (need === 1) seats = [no];
    else {
      haptic('error');
      return;
    }
    setDraft({ seats, auto: false });
  };

  const photos = catalog.van_photos ?? [];
  return (
    <div className="space-y-5">
      {photos.length > 0 && (
        <div>
          <h3 className="mb-2 px-1 text-[15px] font-extrabold">📸 Наш Opel Vivaro</h3>
          <div className="-mx-5 flex snap-x gap-2.5 overflow-x-auto px-5 pb-1">
            {photos.map((src) => (
              <img key={src} src={src} alt="Салон мінівена" loading="lazy" className="h-36 w-56 shrink-0 snap-start rounded-2xl object-cover" />
            ))}
          </div>
        </div>
      )}
      <Choice active={draft.auto} onClick={() => setDraft({ auto: true, seats: [] })}>
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${draft.auto ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
            {draft.auto && <Check size={16} strokeWidth={3} />}
          </div>
          <div>
            <div className="text-[17px] font-extrabold">Будь-які вільні місця</div>
            <div className="text-sm font-semibold text-muted">Без доплати — водій посадить на вільні</div>
          </div>
        </div>
      </Choice>
      <Choice active={!draft.auto} onClick={() => setDraft({ auto: false })}>
        <div className="flex items-center gap-3">
          <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 ${!draft.auto ? 'border-accent bg-accent text-accent-ink' : 'border-line'}`}>
            {!draft.auto && <Check size={16} strokeWidth={3} />}
          </div>
          <div>
            <div className="text-[17px] font-extrabold">Хочу обрати місце</div>
            <div className="text-sm font-semibold text-muted">+5 € за місце · місце 7 безкоштовно</div>
          </div>
        </div>
      </Choice>

      {!draft.auto && (
        <div className="fade-in">
          <p className="mb-3 text-center text-[15px] font-bold" aria-live="polite">
            {left > 0 ? `Оберіть ще ${left} ${left === 1 ? 'місце' : left < 5 ? 'місця' : 'місць'}` : '✓ Усі місця обрано'}
          </p>
          <VanMap seats={catalog.seats} taken={dep.taken} selected={draft.seats} onToggle={toggle} />
        </div>
      )}
    </div>
  );
}

// ---------- Крок 4: адреса і контакти ----------

export function PickupStep({ catalog, draft, setDraft }: { catalog: Catalog; draft: Draft; setDraft: (d: Partial<Draft>) => void }) {
  const [asking, setAsking] = useState(false);
  const canRequest = Boolean(tg?.requestContact);

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 px-1 text-lg font-extrabold">Звідки вас забрати?</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {catalog.pickup_cities.map((c) => (
            <Choice key={c.id} active={draft.city === c.id} onClick={() => setDraft({ city: c.id })}>
              <div className="text-[16px] font-extrabold">{c.name}</div>
              <div className="mt-0.5 text-[13px] leading-snug font-semibold text-muted">{c.hint}</div>
            </Choice>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <label className="block">
          <span className="mb-2 flex items-center gap-1.5 px-1 text-[15px] font-extrabold">
            <MapPin size={17} /> Адреса
          </span>
          <input
            className="field"
            value={draft.address}
            onChange={(e) => setDraft({ address: e.target.value })}
            placeholder="Вулиця, будинок, місто"
            autoComplete="street-address"
          />
        </label>

        <label className="block">
          <span className="mb-2 block px-1 text-[15px] font-extrabold">Ім’я</span>
          <input className="field" value={draft.name} onChange={(e) => setDraft({ name: e.target.value })} placeholder="Як до вас звертатись" autoComplete="name" />
        </label>

        <div>
          <span className="mb-2 flex items-center gap-1.5 px-1 text-[15px] font-extrabold">
            <Phone size={17} /> Телефон
          </span>
          <input
            className="field"
            type="tel"
            inputMode="tel"
            value={draft.phone}
            onChange={(e) => setDraft({ phone: e.target.value })}
            placeholder="+49 170 1234567"
            autoComplete="tel"
          />
          {canRequest && (
            <button
              type="button"
              disabled={asking}
              onClick={async () => {
                setAsking(true);
                const p = await requestPhone();
                setAsking(false);
                if (p) {
                  haptic('success');
                  setDraft({ phone: p });
                }
              }}
              className="mt-2 w-full rounded-xl bg-accent-soft py-3 text-[15px] font-bold text-accent"
            >
              📱 Взяти номер із Telegram
            </button>
          )}
        </div>

        <label className="block">
          <span className="mb-2 block px-1 text-[15px] font-extrabold">
            Побажання <span className="font-semibold text-muted">(необов’язково)</span>
          </span>
          <textarea
            className="field min-h-[88px] resize-none"
            value={draft.comment}
            onChange={(e) => setDraft({ comment: e.target.value })}
            placeholder="Наприклад: з дитиною 5 років, велика валіза"
          />
        </label>
      </section>
    </div>
  );
}

// ---------- Крок 5: перевірка ----------

export function ReviewStep({ trip, dep, draft, catalog, total, onPrivacy }: { trip: Trip; dep: Departure; draft: Draft; catalog: Catalog; total: number; onPrivacy: () => void }) {
  const city = catalog.pickup_cities.find((c) => c.id === draft.city)?.name ?? draft.city;
  const fee = draft.auto ? 0 : draft.seats.reduce((s, n) => s + (catalog.seats.find((x) => x.no === n)?.fee ?? 0), 0);
  const rows: [string, string][] = [
    ['Поїздка', `${trip.flag} ${trip.short_title}`],
    ['Дата', dep.label],
    ['Пасажирів', String(draft.pax)],
    ['Місця', draft.auto ? 'будь-які вільні' : [...draft.seats].sort((a, b) => a - b).join(', ')],
    ['Звідки', `${city}, ${draft.address}`],
    ['Ім’я', draft.name],
    ['Телефон', draft.phone],
  ];
  if (draft.comment.trim()) rows.push(['Побажання', draft.comment.trim()]);

  return (
    <div className="space-y-4">
      <div className="card divide-y divide-line">
        {rows.map(([k, v]) => (
          <div key={k} className="flex gap-4 px-4 py-3.5">
            <span className="w-28 shrink-0 text-[15px] font-semibold text-muted">{k}</span>
            <span className="text-[15px] font-bold break-words">{v}</span>
          </div>
        ))}
      </div>
      <div className="card space-y-1.5 p-4 text-[15px] font-semibold">
        <div className="flex justify-between">
          <span className="text-muted">
            {trip.price} € × {draft.pax}
          </span>
          <span>{trip.price * draft.pax} €</span>
        </div>
        {fee > 0 && (
          <div className="flex justify-between">
            <span className="text-muted">Вибір місць</span>
            <span>{fee} €</span>
          </div>
        )}
        <div className="flex justify-between border-t border-line pt-2 text-lg font-extrabold">
          <span>Разом</span>
          <span>{total} €</span>
        </div>
      </div>
      <p className="rounded-2xl bg-accent-soft p-4 text-[15px] leading-snug font-semibold">
        {trip.days > 1
          ? '🏨 Менеджер зв’яжеться щодо передоплати за готель, решта — при посадці.'
          : '💶 Передоплата не потрібна — оплата водію при посадці.'}{' '}
        Напередодні напишемо точний час, коли під’їдемо.
      </p>
      <p className="px-1 text-center text-[13px] leading-snug font-semibold text-muted">
        Натискаючи «Забронювати», ви погоджуєтесь з обробкою даних для організації поїздки.{' '}
        <button type="button" onClick={onPrivacy} className="font-bold text-accent underline">
          Політика конфіденційності
        </button>
      </p>
    </div>
  );
}
