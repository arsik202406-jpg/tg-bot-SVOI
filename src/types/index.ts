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
}

export interface InlineBtn {
  text: string;
  callbackData?: string;
  url?: string;
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
