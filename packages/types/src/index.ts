// ============================================================
// LOKASK — Shared Types Package (Phase 2 MVP)
// packages/types/src/index.ts
// ============================================================

export type UserType = 'customer' | 'provider' | 'both';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type BookingPaymentStatus = 'unpaid' | 'held' | 'released' | 'refunded';
export type PaymentStatus = 'pending' | 'captured' | 'held' | 'released' | 'refunded' | 'failed';
export type ServiceCategory =
  | 'cleaning'
  | 'tutoring'
  | 'beauty'
  | 'fitness'
  | 'delivery'
  | 'cooking'
  | 'photography'
  | 'handyman'
  | 'childcare'
  | 'pet_care'
  | 'translation'
  | 'tech';
export type PriceType = 'hourly' | 'fixed';

export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  user_type: UserType;
  profile_image?: string;
  bio?: string;
  location_lat?: number;
  location_lng?: number;
  location_label?: string;
  nationality?: string;
  language: string;
  rating: number;
  total_bookings: number;
  is_premium: boolean;
  stripe_customer_id?: string;
  stripe_account_id?: string;
  fcm_token?: string;
  deleted_at?: string;
  created_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  provider?: User;
  title: string;
  description: string;
  category: ServiceCategory;
  price_type: PriceType;
  price: number;
  images: string[];
  availability?: ServiceAvailability;
  is_active: boolean;
  is_featured: boolean;
  rating: number;
  review_count: number;
  created_at: string;
}

export interface ServiceAvailability {
  days: ('mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun')[];
  slots: string[]; // "09:00"
}

export interface Booking {
  id: string;
  service_id: string;
  service?: Service;
  customer_id: string;
  customer?: User;
  provider_id: string;
  provider?: User;
  scheduled_date: string; // "YYYY-MM-DD"
  scheduled_time: string; // "HH:MM"
  duration_hours?: number;
  status: BookingStatus;
  payment_status: BookingPaymentStatus;
  total_amount: number;
  notes?: string;
  created_at: string;
}

export interface Message {
  id: string;
  booking_id?: string;
  sender_id: string;
  sender?: Pick<User, 'id' | 'name' | 'profile_image'>;
  receiver_id: string;
  content?: string;
  image_url?: string;
  location?: { lat: number; lng: number };
  is_read: boolean;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewer?: Pick<User, 'id' | 'name' | 'profile_image'>;
  reviewee_id: string;
  rating: number;
  comment?: string;
  provider_reply?: string;
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  platform_fee: number;
  customer_fee: number;
  provider_earnings: number;
  status: PaymentStatus;
  released_at?: string;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'booking' | 'message' | 'payment' | 'review' | 'system';
  title: string;
  body: string;
  data?: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

// Commission constants
export const PLATFORM_COMMISSION_RATE = 0.15;       // 15% default
export const PREMIUM_COMMISSION_RATE = 0.10;        // 10% for premium providers
export const CUSTOMER_BOOKING_FEE_RATE = 0.02;      // 2%
export const CUSTOMER_BOOKING_FEE_MIN = 0.50;
export const CUSTOMER_BOOKING_FEE_MAX = 5.00;
export const CUSTOMER_FEE_WAIVED_BOOKINGS = 3;      // waived for first 3 bookings
export const FEATURED_BOOST_PRICE = 4.90;
export const PREMIUM_SUBSCRIPTION_PRICE = 9.90;
