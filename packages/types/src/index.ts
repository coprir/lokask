// ============================================================
// LOKASK — Shared Types Package
// packages/types/src/index.ts
// ============================================================

// ─── Enums ───────────────────────────────────────────────────

export type UserRole = 'customer' | 'provider' | 'both' | 'admin';
export type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded';
export type MessageType = 'text' | 'image' | 'location' | 'system';
export type NotificationType = 'booking' | 'message' | 'payment' | 'review' | 'system';
export type ServiceCategory =
  | 'cleaning'
  | 'tutoring'
  | 'delivery'
  | 'handyman'
  | 'beauty'
  | 'tech_support'
  | 'childcare'
  | 'pet_care'
  | 'cooking'
  | 'translation'
  | 'fitness'
  | 'photography'
  | 'other';

// ─── Core Models ─────────────────────────────────────────────

export interface User {
  id: string;
  email: string;
  phone?: string;
  full_name: string;
  avatar_url?: string;
  role: UserRole;
  is_verified: boolean;
  is_active: boolean;
  language: string;
  stripe_customer_id?: string;
  stripe_account_id?: string; // Stripe Connect for providers
  location?: GeoPoint;
  address?: string;
  city?: string;
  created_at: string;
  updated_at: string;
}

export interface ProviderProfile {
  id: string;
  user_id: string;
  bio?: string;
  tagline?: string;
  skills: string[];
  languages: string[];
  nationality?: string;
  id_verified: boolean;
  background_checked: boolean;
  rating_avg: number;
  review_count: number;
  completed_jobs: number;
  response_time_minutes?: number;
  portfolio_urls: string[];
  is_available: boolean;
  availability_schedule?: AvailabilitySchedule;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  provider_id: string;
  provider?: User;
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  price_unit: 'hourly' | 'fixed' | 'daily';
  currency: string;
  duration_minutes?: number;
  images: string[];
  tags: string[];
  location?: GeoPoint;
  service_area_km?: number;
  is_remote: boolean;
  is_active: boolean;
  rating_avg: number;
  review_count: number;
  created_at: string;
  updated_at: string;
}

export interface Booking {
  id: string;
  service_id: string;
  service?: Service;
  customer_id: string;
  customer?: User;
  provider_id: string;
  provider?: User;
  status: BookingStatus;
  scheduled_at: string;
  duration_minutes: number;
  address?: string;
  location?: GeoPoint;
  notes?: string;
  total_amount: number;
  currency: string;
  payment_id?: string;
  payment_status: PaymentStatus;
  cancelled_at?: string;
  cancelled_by?: string;
  cancellation_reason?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  sender?: User;
  type: MessageType;
  content: string;
  image_url?: string;
  location?: GeoPoint;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface Conversation {
  id: string;
  participants: string[];
  last_message?: Message;
  last_message_at?: string;
  booking_id?: string;
  created_at: string;
}

export interface Review {
  id: string;
  booking_id: string;
  reviewer_id: string;
  reviewer?: User;
  reviewee_id: string;
  service_id: string;
  rating: number; // 1–5
  comment?: string;
  tags: string[];
  created_at: string;
}

export interface Payment {
  id: string;
  booking_id: string;
  customer_id: string;
  provider_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  stripe_transfer_id?: string;
  provider_amount: number; // amount - stripe fee (no platform cut)
  metadata?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: Record<string, string>;
  is_read: boolean;
  created_at: string;
}

// ─── Utility Types ───────────────────────────────────────────

export interface GeoPoint {
  lat: number;
  lng: number;
}

export interface AvailabilitySchedule {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  enabled: boolean;
  start: string; // "09:00"
  end: string;   // "18:00"
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface ApiResponse<T = void> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ─── Request/Filter Types ─────────────────────────────────────

export interface ServiceFilter {
  category?: ServiceCategory;
  min_price?: number;
  max_price?: number;
  rating_min?: number;
  is_remote?: boolean;
  lat?: number;
  lng?: number;
  radius_km?: number;
  query?: string;
  page?: number;
  limit?: number;
}

export interface CreateServiceInput {
  title: string;
  description: string;
  category: ServiceCategory;
  price: number;
  price_unit: 'hourly' | 'fixed' | 'daily';
  duration_minutes?: number;
  images?: string[];
  tags?: string[];
  lat?: number;
  lng?: number;
  service_area_km?: number;
  is_remote?: boolean;
}

export interface CreateBookingInput {
  service_id: string;
  scheduled_at: string;
  duration_minutes?: number;
  address?: string;
  lat?: number;
  lng?: number;
  notes?: string;
}

export interface CreateReviewInput {
  booking_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
}
