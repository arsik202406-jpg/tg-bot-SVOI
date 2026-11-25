export interface Trip {
  id: string;
  title: string;
  short_title: string;
  country: string;
  flag: string;
  price: number;
  duration: string;
  days: number;
  image: string;
  highlights: string[];
  description: string;
  program: string[];
  pickup_time: string;
}

export interface Departure {
  id: number;
  trip_id: string;
  date: string;
  label: string;
  free: number;
  booked?: number;
  taken: number[];
  status: string;
}

export interface Seat {
  no: number;
  row: number;
  label: string;
  fee: number;
}

export interface PickupCity {
  id: string;
  name: string;
  hint: string;
}

export interface Catalog {
  trips: Trip[];
  departures: Departure[];
  seats: Seat[];
  capacity: number;
  pickup_cities: PickupCity[];
  manager: string;
  van_photos?: string[];
  min_pax?: number;
  bot_username?: string;
  reviews?: Record<string, { avg: number; count: number; items: { name: string; rating: number; text: string }[] }>;
}

export interface MyBooking {
  code: string;
  status: string;
  trip_id: string;
  date: string;
  label: string;
  pax: number;
  seats: number[];
  auto: boolean;
  total: number;
  city: string;
  address: string;
  postcode?: string | null;
  district?: string | null;
  pickup_time?: string | null;
}

export interface SavedContact {
  phone: string | null;
  city: string | null;
  address: string | null;
  postcode?: string | null;
  district?: string | null;
}

export interface Draft {
  tripId: string | null;
  departureId: number | null;
  pax: number;
  seats: number[];
  auto: boolean;
  city: string;
  address: string;
  postcode: string;
  district: string;
  phone: string;
  name: string;
  comment: string;
}
