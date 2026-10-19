export interface TripItem {
  id: string;
  title: string;
  shortTitle: string;
  price: number;
  currency: string;
  duration: string;
  badge: string;
  image: string;
  highlights: string[];
  description: string;
  pickupSaarbruecken: string;
  departureDates?: string[];
  category?: 'weekend' | 'express' | 'relax' | 'combo';
}

export interface InlineBtn {
  text: string;
  callbackData?: string;
  url?: string;
  variant?: 'primary' | 'secondary' | 'reserve' | 'manager' | 'channel' | 'partner';
}

export interface SimMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  time: string;
  photoUrl?: string;
  inlineKeyboard?: InlineBtn[][];
  edited?: boolean;
}

export interface LeadItem {
  id: string;
  type: 'booking' | 'feedback';
  bookingCode?: string;
  tripTitle?: string;
  duration?: string;
  selectedDate?: string;
  seatType?: string;
  basePrice?: number;
  seatFee?: number;
  totalCost?: number;
  meetingPoint?: string;
  userName: string;
  userHandle: string;
  userId: number | string;
  text?: string;
  timestamp: string;
  status: 'new' | 'processing' | 'confirmed' | 'archived';
}

export interface PythonCodeFile {
  name: string;
  path: string;
  language: string;
  description: string;
  content: string;
}

export interface ReviewItem {
  id: string;
  author: string;
  city: string;
  trip: string;
  rating: number;
  date: string;
  text: string;
  verified?: boolean;
  avatar?: string;
  highlight?: string;
}
