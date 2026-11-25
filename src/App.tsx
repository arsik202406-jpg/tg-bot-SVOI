import { CalendarCheck, MessageCircle, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { cancelBooking, createBooking, DEMO, joinWaitlist, loadCatalog, loadMe, loadPrivacy, postcodeOk, updateAddress } from './api';
import { PickupStep, ReviewStep, SeatStep, TripList, TripStep } from './components/steps';
import { BottomBar, Header, Sheet, Stepper } from './components/ui';
import { closeApp, cloudGet, cloudSet, haptic, inTelegram, onBackButton, openLink, setChrome, userName } from './tg';
import type { Catalog, Draft, MyBooking } from './types';

const EMPTY: Draft = { tripId: null, departureId: null, pax: 1, seats: [], auto: true, city: 'saarland', address: '', postcode: '', district: '', phone: '', name: '', comment: '' };

// Світла тема — основна. Якщо людина обрала темну, запам'ятовуємо її вибір.
function initialTheme(): 'light' | 'dark' {
  try {
    const saved = localStorage.getItem('svoi_theme');
    if (saved === 'light' || saved === 'dark') return saved;
  } catch {
    /* ignore */
  }
  return 'light';
}

export default function App() {
  const [theme, setTheme] = useState(initialTheme);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [loadError, setLoadError] = useState('');
  const [step, setStep] = useState(0);
  const [draft, setDraftState] = useState<Draft>({ ...EMPTY, name: userName() });
  const [myBookings, setMyBookings] = useState<MyBooking[]>([]);
  const [showMy, setShowMy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState<{ code: string } | null>(null);
  const [waitlisted, setWaitlisted] = useState<Record<string, boolean>>({});
  const [privacy, setPrivacy] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [editing, setEditing] = useState<{ code: string; address: string; postcode: string; district: string } | null>(null);
  const [savingAddr, setSavingAddr] = useState(false);

  const saveAddress = async () => {
    if (!editing) return;
    setSavingAddr(true);
    setError('');
    try {
      await updateAddress(editing.code, editing.address.trim(), editing.postcode.trim(), editing.district.trim());
      haptic('success');
      setMyBookings((list) => list.map((b) => (b.code === editing.code ? { ...b, address: editing.address.trim(), postcode: editing.postcode.trim().toUpperCase(), district: editing.district.trim() || null, pickup_time: null } : b)));
      setEditing(null);
    } catch (e) {
      haptic('error');
      setError(e instanceof Error ? e.message : 'Не вдалося зберегти');
    } finally {
      setSavingAddr(false);
    }
  };

  const openPrivacy = async () => {
    setPrivacy('Завантаження…');
    try {
      setPrivacy(await loadPrivacy());
    } catch {
      setPrivacy('Не вдалося завантажити. Політика доступна в боті: команда /privacy');
    }
  };

  const doCancel = async (code: string) => {
    setCancelling(true);
    try {
      await cancelBooking(code);
      haptic('success');
      setMyBookings((list) => list.filter((b) => b.code !== code));
      setConfirmCancel(null);
      load();
    } catch (e) {
      haptic('error');
      setError(e instanceof Error ? e.message : 'Не вдалося скасувати');
    } finally {
      setCancelling(false);
    }
  };

  const setDraft = useCallback((d: Partial<Draft>) => {
    setError('');
    setDraftState((prev) => ({ ...prev, ...d }));
  }, []);

  // тема: показуємо одразу, а збережений у Telegram вибір підтягуємо (він діє на всіх пристроях)
  useEffect(() => {
    cloudGet('svoi_theme').then((v) => {
      if (v === 'light' || v === 'dark') setTheme(v);
    });
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    setChrome(theme === 'dark' ? '#0e1412' : '#f3efe7');
  }, [theme]);
  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    cloudSet('svoi_theme', next);
    try {
      localStorage.setItem('svoi_theme', next);
    } catch {
      /* ignore */
    }
  };

  // завантаження
  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [cat, me] = await Promise.all([loadCatalog(), loadMe().catch(() => ({ saved: null, bookings: [] }))]);
      setCatalog(cat);
      setMyBookings(me.bookings);
      if (me.saved) {
        setDraftState((prev) => ({
          ...prev,
          phone: prev.phone || me.saved?.phone || '',
          address: prev.address || me.saved?.address || '',
          postcode: prev.postcode || me.saved?.postcode || '',
          district: prev.district || me.saved?.district || '',
          city: cat.pickup_cities.find((c) => c.name === me.saved?.city)?.id ?? prev.city,
        }));
      }
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Помилка завантаження');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const trip = catalog?.trips.find((t) => t.id === draft.tripId) ?? null;
  const departures = useMemo(() => catalog?.departures.filter((d) => d.trip_id === draft.tripId) ?? [], [catalog, draft.tripId]);
  const dep = departures.find((d) => d.id === draft.departureId) ?? null;
  const total = useMemo(() => {
    if (!trip || !catalog) return null;
    const fee = draft.auto ? 0 : draft.seats.reduce((s, n) => s + (catalog.seats.find((x) => x.no === n)?.fee ?? 0), 0);
    return trip.price * draft.pax + fee;
  }, [trip, catalog, draft]);

  const go = (n: number) => {
    haptic();
    setError('');
    setStep(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // кнопка «Назад» Telegram
  useEffect(() => {
    if (showMy) return onBackButton(() => setShowMy(false));
    if (done || step === 0) return onBackButton(null);
    return onBackButton(() => go(step - 1));
  }, [step, showMy, done]);

  // ---------- валідація кроків ----------
  const phoneOk = draft.phone.replace(/\D/g, '').length >= 7;
  const canNext = [
    true,
    Boolean(dep && dep.free >= draft.pax),
    draft.auto || draft.seats.length === draft.pax,
    draft.address.trim().length >= 5 && postcodeOk(draft.postcode) && phoneOk && draft.name.trim().length >= 2,
    true,
  ][step];
  const nextHint = [
    '',
    !dep ? 'Оберіть дату' : '',
    !draft.auto && draft.seats.length !== draft.pax ? `Оберіть ${draft.pax - draft.seats.length} ще` : '',
    draft.address.trim().length < 5 ? 'Вкажіть адресу' : !postcodeOk(draft.postcode) ? 'Вкажіть поштовий індекс' : draft.name.trim().length < 2 ? 'Вкажіть ім’я' : !phoneOk ? 'Вкажіть телефон' : '',
    '',
  ][step];

  const submit = async () => {
    if (!dep) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await createBooking({
        departure_id: dep.id,
        pax: draft.pax,
        seats: draft.auto ? null : draft.seats,
        city: draft.city,
        address: draft.address.trim(),
        postcode: draft.postcode.trim(),
        district: draft.district.trim(),
        phone: draft.phone.trim(),
        name: draft.name.trim(),
        comment: draft.comment.trim(),
      });
      haptic('success');
      setDone({ code: res.code });
      window.scrollTo({ top: 0 });
      load();
    } catch (e) {
      haptic('error');
      setError(e instanceof Error ? e.message : 'Не вдалося забронювати');
      load(); // оновлюємо зайняті місця
    } finally {
      setSubmitting(false);
    }
  };

  // ---------- екрани ----------
  if (loadError) {
    return (
      <Centered>
        <p className="text-lg font-extrabold">Не вдалося завантажити поїздки</p>
        <p className="mt-2 text-[15px] font-semibold text-muted">{loadError.includes('Telegram') ? loadError : 'Перевірте інтернет і спробуйте ще раз. Якщо не допомагає — зачекайте хвилину: сервер прокидається.'}</p>
        <button type="button" className="btn-primary mt-6 flex w-full items-center justify-center gap-2" onClick={load}>
          <RefreshCw size={19} /> Спробувати ще раз
        </button>
      </Centered>
    );
  }
  if (!catalog) {
    return (
      <Centered>
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-line border-t-accent" aria-label="Завантаження" />
      </Centered>
    );
  }

  const manager = `https://t.me/${catalog.manager}`;
  const header = <Header theme={theme} onTheme={toggleTheme} onMy={() => setShowMy(true)} myCount={myBookings.length} />;

  const mySheet = showMy && (
    <Sheet title="Мої бронювання" onClose={() => setShowMy(false)}>
      {myBookings.length === 0 ? (
        <p className="pt-6 text-center text-[15px] font-semibold text-muted">
          {inTelegram ? 'Поки що немає майбутніх поїздок.' : 'Відкрийте застосунок через Telegram-бота, щоб побачити свої бронювання.'}
        </p>
      ) : (
        <div className="space-y-3">
          {myBookings.map((b) => {
            const t = catalog.trips.find((x) => x.id === b.trip_id);
            return (
              <div key={b.code} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="text-lg font-extrabold">
                    {t?.flag} {t?.short_title}
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${b.status === 'confirmed' ? 'bg-accent-soft text-accent' : 'bg-surface-2 text-muted'}`}>
                    {b.status === 'confirmed' ? 'Підтверджено' : 'Очікує'}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-[15px] font-semibold text-muted">
                  <div>📅 {b.label}</div>
                  {b.pickup_time && <div className="text-ink">🕐 Заберемо о {b.pickup_time}</div>}
                  <div>
                    👥 {b.pax} · місця {b.seats.join(', ')}
                    {b.auto ? ' (будь-які)' : ''}
                  </div>
                  <div>
                    📍 {b.city}, {b.address}
                    {b.postcode ? `, ${b.postcode}` : ''}
                    {b.district ? `, район ${b.district}` : ''}
                  </div>
                  <div className="text-ink">💶 {b.total} € · {b.code}</div>
                </div>
                {editing?.code === b.code ? (
                  <div className="mt-3 space-y-2.5 fade-in">
                    <input className="field" value={editing.address} onChange={(e) => setEditing({ ...editing, address: e.target.value })} placeholder="Вулиця, будинок, місто" />
                    <div className="grid grid-cols-[2fr_3fr] gap-2.5">
                      <input
                        className={`field ${editing.postcode && !postcodeOk(editing.postcode) ? 'border-danger' : ''}`}
                        value={editing.postcode}
                        inputMode="numeric"
                        onChange={(e) => setEditing({ ...editing, postcode: e.target.value.toUpperCase().slice(0, 8) })}
                        placeholder="Індекс"
                      />
                      <input className="field" value={editing.district} onChange={(e) => setEditing({ ...editing, district: e.target.value })} placeholder="Район (необов’язково)" />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={savingAddr || editing.address.trim().length < 5 || !postcodeOk(editing.postcode)}
                        onClick={saveAddress}
                        className="btn-primary flex-1"
                      >
                        {savingAddr ? 'Зберігаємо…' : 'Зберегти адресу'}
                      </button>
                      <button type="button" onClick={() => setEditing(null)} className="flex-1 rounded-2xl bg-surface-2 font-bold">
                        Скасувати
                      </button>
                    </div>
                  </div>
                ) : confirmCancel === b.code ? (
                  <div className="mt-3 flex gap-2">
                    <button type="button" disabled={cancelling} onClick={() => doCancel(b.code)} className="flex-1 rounded-xl bg-danger py-3 text-[15px] font-bold text-white disabled:opacity-50">
                      {cancelling ? 'Скасовуємо…' : 'Так, скасувати'}
                    </button>
                    <button type="button" onClick={() => setConfirmCancel(null)} className="flex-1 rounded-xl bg-surface-2 py-3 text-[15px] font-bold">
                      Ні, залишити
                    </button>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      onClick={() => setEditing({ code: b.code, address: b.address, postcode: b.postcode || '', district: b.district || '' })}
                      className="flex-1 rounded-xl border-2 border-line py-3 text-[15px] font-bold"
                    >
                      ✏️ Змінити адресу
                    </button>
                    <button type="button" onClick={() => setConfirmCancel(b.code)} className="flex-1 rounded-xl border-2 border-line py-3 text-[15px] font-bold text-danger">
                      Скасувати
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {error && <p className="text-center text-sm font-bold text-danger">{error}</p>}
          <p className="pt-2 text-center text-sm font-semibold text-muted">Безкоштовне скасування — за 3 дні до виїзду. Щоб змінити бронь, напишіть менеджеру.</p>
        </div>
      )}
    </Sheet>
  );

  const privacySheet = privacy !== null && (
    <Sheet title="Політика конфіденційності" onClose={() => setPrivacy(null)}>
      <div className="text-[15px] leading-relaxed font-medium whitespace-pre-line">{privacy}</div>
    </Sheet>
  );

  if (done && trip && dep) {
    return (
      <div className="mx-auto max-w-xl">
        {header}
        <div className="px-5 pt-8 text-center fade-in">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-accent text-accent-ink">
            <CalendarCheck size={40} />
          </div>
          <h1 className="mt-5 text-2xl font-extrabold">Заявку прийнято!</h1>
          <p className="mt-2 text-[16px] font-semibold text-muted">
            {trip.flag} {trip.short_title}, {dep.label}
            <br />
            Номер броні: <b className="text-ink">{done.code}</b>
          </p>
          <div className="card mt-6 p-5 text-left text-[15px] leading-relaxed font-semibold">
            ✅ Підтвердження вже надіслано вам у чат з ботом.
            <br />
            📞 Менеджер підтвердить бронь найближчим часом.
            <br />
            🚐 Напередодні ввечері напишемо точний час, коли під’їдемо.
          </div>
          <button type="button" className="btn-primary mt-6 w-full" onClick={() => (inTelegram ? closeApp() : (setDone(null), setDraftState({ ...EMPTY, name: userName() }), setStep(0)))}>
            {inTelegram ? 'Повернутись у чат' : 'На головну'}
          </button>
          <button type="button" className="mt-3 w-full py-3 text-[15px] font-bold text-accent" onClick={() => (setDone(null), setDraftState((d) => ({ ...EMPTY, name: d.name, phone: d.phone, address: d.address, postcode: d.postcode, district: d.district, city: d.city })), setStep(0))}>
            Забронювати ще одну поїздку
          </button>
        </div>
        {mySheet}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-xl pb-40">
      {header}
      {DEMO && (
        <div className="mx-5 mb-3 rounded-xl bg-surface-2 px-4 py-2.5 text-[13px] font-semibold text-muted">
          Демо-режим: це попередній перегляд, бронювання не надсилаються.
        </div>
      )}
      {step > 0 && <Stepper step={step} />}

      <main key={step} className="px-5 fade-in">
        {step === 0 && (
          <>
            <p className="mb-4 px-1 text-[16px] leading-snug font-semibold text-muted">
              Маленькі групи до 8 людей · забираємо від дому в Саарланді, Трірі та Люксембурзі · оплата при посадці
            </p>
            <TripList
              catalog={catalog}
              onPick={(t) => {
                const first = catalog.departures.find((d) => d.trip_id === t.id && d.free > 0);
                setDraft({ tripId: t.id, departureId: first?.id ?? null, pax: 1, seats: [], auto: true });
                go(1);
              }}
            />
          </>
        )}
        {step === 1 && trip && (
          <TripStep
            trip={trip}
            catalog={catalog}
            departures={departures}
            draft={draft}
            setDraft={setDraft}
            waitlisted={Boolean(waitlisted[trip.id])}
            onWaitlist={async () => {
              if (!inTelegram && !DEMO) return openLink(manager);
              try {
                await joinWaitlist(trip.id);
                haptic('success');
                setWaitlisted((w) => ({ ...w, [trip.id]: true }));
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Помилка');
              }
            }}
          />
        )}
        {step === 2 && dep && <SeatStep catalog={catalog} dep={dep} draft={draft} setDraft={setDraft} />}
        {step === 3 && <PickupStep catalog={catalog} draft={draft} setDraft={setDraft} />}
        {step === 4 && trip && dep && total != null && <ReviewStep trip={trip} dep={dep} draft={draft} catalog={catalog} total={total} onPrivacy={openPrivacy} />}

        {error && (
          <div role="alert" className="mt-4 rounded-2xl border-2 border-danger/40 bg-surface p-4 text-[15px] font-bold text-danger">
            {error}
          </div>
        )}

        {step === 0 && (
          <button type="button" onClick={() => openLink(manager)} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-surface py-4 text-[16px] font-bold shadow-sm">
            <MessageCircle size={20} /> Задати питання менеджеру
          </button>
        )}
      </main>

      {step > 0 && step < 4 && (trip && (departures.length > 0 || step > 1)) && (
        <BottomBar total={dep ? total : null} label="Далі" disabled={!canNext} hint={canNext ? undefined : nextHint} onClick={() => go(step + 1)} />
      )}
      {step === 4 && (
        <BottomBar
          total={total}
          label={inTelegram || DEMO ? 'Забронювати' : 'Відкрийте через Telegram'}
          loading={submitting}
          disabled={!inTelegram && !DEMO}
          onClick={submit}
          hint={!inTelegram && !DEMO ? 'Бронювання працює тільки всередині Telegram' : undefined}
        />
      )}
      {mySheet}
      {privacySheet}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto flex min-h-screen max-w-sm flex-col items-center justify-center px-6 text-center">{children}</div>;
}
