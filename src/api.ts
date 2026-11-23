import type { Catalog, Departure, MyBooking, SavedContact } from './types';
import { tg } from './tg';
import demoTrips from '../bot_code/data/trips.json';

const params = new URLSearchParams(window.location.search);
// Адресу сервера бот передає в посиланні (?api=...). Запасний варіант — змінна збірки.
export const API_URL = (params.get('api') || import.meta.env.VITE_API_URL || '').replace(/\/$/, '');
export const DEMO = params.has('demo');

const initData = (): string => tg?.initData || '';

async function request<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json', 'X-Init-Data': initData() } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({ ok: false, error: 'Сервер не відповідає' }));
  if (!res.ok || !data.ok) throw new Error(data.error || 'Щось пішло не так');
  return data as T;
}

// ---------- Демо-дані, щоб подивитись застосунок у браузері без сервера ----------

function demoCatalog(): Catalog {
  const d = new Date();
  const addDays = (n: number) => {
    const x = new Date(d);
    x.setDate(x.getDate() + n);
    return x;
  };
  const months = ['січня', 'лютого', 'березня', 'квітня', 'травня', 'червня', 'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'];
  const wd = ['нд', 'пн', 'вт', 'ср', 'чт', 'пт', 'сб'];
  const mk = (id: number, trip: string, n: number, taken: number[]): Departure => {
    const x = addDays(n);
    return { id, trip_id: trip, date: x.toISOString().slice(0, 10), label: `${wd[x.getDay()]}, ${x.getDate()} ${months[x.getMonth()]}`, free: 8 - taken.length, booked: taken.length, taken, status: 'open' };
  };
  return {
    trips: demoTrips as Catalog['trips'],
    departures: [mk(1, 'paris', 8, [1, 2, 7]), mk(2, 'paris', 22, []), mk(3, 'bruges', 9, [3, 4]), mk(4, 'neuschwanstein', 15, [1, 2, 3, 4, 5, 6, 7, 8]), mk(5, 'como_milan', 29, [5])],
    seats: [
      { no: 1, row: 1, label: 'Спереду, біля вікна', fee: 5 },
      { no: 2, row: 1, label: 'Спереду, біля водія', fee: 5 },
      { no: 3, row: 2, label: '2-й ряд, вікно', fee: 5 },
      { no: 4, row: 2, label: '2-й ряд, центр', fee: 5 },
      { no: 5, row: 2, label: '2-й ряд, вікно', fee: 5 },
      { no: 6, row: 3, label: '3-й ряд, вікно', fee: 5 },
      { no: 7, row: 3, label: '3-й ряд, центр', fee: 0 },
      { no: 8, row: 3, label: '3-й ряд, вікно', fee: 5 },
    ],
    capacity: 8,
    pickup_cities: [
      { id: 'saarland', name: 'Саарланд', hint: 'забираємо від дому' },
      { id: 'trier', name: 'Трір', hint: 'забираємо від дому' },
      { id: 'luxembourg', name: 'Люксембург', hint: 'забираємо від дому' },
      { id: 'other', name: 'Інше місто', hint: 'Хомбург, Кайзерслаутерн, Мангейм… уточнимо' },
    ],
    manager: 'SVOI_travel_admin',
    min_pax: 5,
    bot_username: 'Svoi_TravelEU_bot',
    reviews: { paris: { avg: 5, count: 1, items: [{ name: 'Приклад', rating: 5, text: 'Так виглядатиме відгук пасажира (демо).' }] } },
  };
}

// ---------- Публічні функції ----------

export async function loadCatalog(): Promise<Catalog> {
  if (DEMO) return demoCatalog();
  if (!API_URL) throw new Error('Відкрийте застосунок через кнопку «Забронювати» в нашому Telegram-боті @Svoi_TravelEU_bot.');
  return request<Catalog>('/api/catalog');
}

export async function loadMe(): Promise<{ saved: SavedContact | null; bookings: MyBooking[] }> {
  if (DEMO || !initData()) return { saved: null, bookings: [] };
  return request('/api/me', { initData: initData() });
}

export interface BookingPayload {
  departure_id: number;
  pax: number;
  seats: number[] | null;
  city: string;
  address: string;
  phone: string;
  name: string;
  comment: string;
}

export async function createBooking(p: BookingPayload): Promise<{ code: string; total: number; seats: number[] }> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 700));
    return { code: 'SVOI-DEMO', total: 0, seats: p.seats || [] };
  }
  const data = await request<{ booking: { code: string; total: number; seats: number[] } }>('/api/bookings', { ...p, initData: initData() });
  return data.booking;
}

export async function joinWaitlist(tripId: string): Promise<void> {
  if (DEMO) return;
  await request('/api/waitlist', { trip_id: tripId, initData: initData() });
}

export async function sendDateRequest(tripId: string, text: string): Promise<void> {
  if (DEMO) {
    await new Promise((r) => setTimeout(r, 500));
    return;
  }
  await request('/api/date-request', { trip_id: tripId, text, initData: initData() });
}

export async function cancelBooking(code: string): Promise<void> {
  if (DEMO) return;
  await request('/api/bookings/cancel', { code, initData: initData() });
}

export async function loadPrivacy(): Promise<string> {
  if (DEMO || !API_URL) return 'Політика конфіденційності доступна в боті: команда /privacy';
  const res = await fetch(`${API_URL}/api/privacy`);
  const data = await res.json();
  return data.text || '';
}
