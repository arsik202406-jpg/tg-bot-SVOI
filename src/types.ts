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
}

export interface SavedContact {
  phone: string | null;
  city: string | null;
  address: string | null;
}

export interface Draft {
  tripId: string | null;
  departureId: number | null;
  pax: number;
  seats: number[];
  auto: boolean;
  city: string;
  address: string;
  phone: string;
  name: string;
  comment: string;
}
