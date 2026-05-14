-- ================================================================
-- LOKASK — PostgreSQL / Supabase Schema (Phase 2 MVP)
-- Run in Supabase SQL Editor (in order)
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy text search

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────

CREATE TYPE user_type AS ENUM ('provider', 'customer', 'both');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE booking_payment_status AS ENUM ('unpaid', 'held', 'released', 'refunded');
CREATE TYPE payment_status AS ENUM ('pending', 'captured', 'held', 'released', 'refunded', 'failed');
CREATE TYPE service_category AS ENUM (
  'cleaning', 'tutoring', 'beauty', 'fitness', 'delivery',
  'cooking', 'photography', 'handyman', 'childcare', 'pet_care',
  'translation', 'tech'
);
CREATE TYPE price_type AS ENUM ('hourly', 'fixed');

-- ──────────────────────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id                  UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name                TEXT NOT NULL,
  email               TEXT UNIQUE NOT NULL,
  phone               TEXT UNIQUE,
  user_type           user_type NOT NULL,
  profile_image       TEXT,
  bio                 TEXT CHECK (char_length(bio) <= 280),
  location_lat        FLOAT8,
  location_lng        FLOAT8,
  location_label      TEXT,
  nationality         TEXT,
  language            TEXT NOT NULL DEFAULT 'en',
  rating              NUMERIC(3,2) NOT NULL DEFAULT 0,
  total_bookings      INT NOT NULL DEFAULT 0,
  is_premium          BOOL NOT NULL DEFAULT false,
  stripe_customer_id  TEXT,
  stripe_account_id   TEXT,
  fcm_token           TEXT,
  deleted_at          TIMESTAMPTZ,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON public.users(email);
CREATE INDEX idx_users_deleted ON public.users(deleted_at) WHERE deleted_at IS NULL;

-- ──────────────────────────────────────────────────────────────
-- SERVICES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.services (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id   UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT CHECK (char_length(description) <= 1000),
  category      service_category NOT NULL,
  price_type    price_type NOT NULL,
  price         NUMERIC(10,2) NOT NULL,
  images        TEXT[] NOT NULL DEFAULT '{}',
  availability  JSONB,
  is_active     BOOL NOT NULL DEFAULT true,
  is_featured   BOOL NOT NULL DEFAULT false,
  rating        NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count  INT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_services_provider ON public.services(provider_id);
CREATE INDEX idx_services_category_active ON public.services(category, is_active);
CREATE INDEX idx_services_featured ON public.services(is_featured) WHERE is_featured = true;
CREATE INDEX idx_services_fts ON public.services
  USING GIN(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- ──────────────────────────────────────────────────────────────
-- BOOKINGS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.bookings (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id       UUID NOT NULL REFERENCES public.services(id),
  customer_id      UUID NOT NULL REFERENCES public.users(id),
  provider_id      UUID NOT NULL REFERENCES public.users(id),
  scheduled_date   DATE NOT NULL,
  scheduled_time   TIME NOT NULL,
  duration_hours   NUMERIC(4,2),
  status           booking_status NOT NULL DEFAULT 'pending',
  payment_status   booking_payment_status NOT NULL DEFAULT 'unpaid',
  total_amount     NUMERIC(10,2) NOT NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer ON public.bookings(customer_id, status);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id, status);
CREATE INDEX idx_bookings_service ON public.bookings(service_id);
CREATE INDEX idx_bookings_date ON public.bookings(scheduled_date);

-- ──────────────────────────────────────────────────────────────
-- MESSAGES (direct, no conversations table)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.messages (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id   UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  sender_id    UUID NOT NULL REFERENCES public.users(id),
  receiver_id  UUID NOT NULL REFERENCES public.users(id),
  content      TEXT,
  image_url    TEXT,
  location     JSONB,
  is_read      BOOL NOT NULL DEFAULT false,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_thread ON public.messages(sender_id, receiver_id, created_at ASC);
CREATE INDEX idx_messages_receiver_unread ON public.messages(receiver_id, is_read) WHERE is_read = false;
CREATE INDEX idx_messages_booking ON public.messages(booking_id) WHERE booking_id IS NOT NULL;

-- ──────────────────────────────────────────────────────────────
-- REVIEWS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.reviews (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id      UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
  reviewer_id     UUID NOT NULL REFERENCES public.users(id),
  reviewee_id     UUID NOT NULL REFERENCES public.users(id),
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT CHECK (char_length(comment) <= 280),
  provider_reply  TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id, created_at DESC);
CREATE INDEX idx_reviews_booking ON public.reviews(booking_id);

-- ──────────────────────────────────────────────────────────────
-- PAYMENTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id                UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
  stripe_payment_intent_id  TEXT UNIQUE,
  amount                    NUMERIC(10,2) NOT NULL,
  platform_fee              NUMERIC(10,2) NOT NULL,
  customer_fee              NUMERIC(10,2) NOT NULL,
  provider_earnings         NUMERIC(10,2) NOT NULL,
  status                    payment_status NOT NULL DEFAULT 'pending',
  released_at               TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_stripe ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_status ON public.payments(status);

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        TEXT NOT NULL CHECK (type IN ('booking', 'message', 'payment', 'review', 'system')),
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOL NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create user record on auth signup
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name, user_type)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'user_type', 'customer')::user_type
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: recalculate user rating and total_bookings on review
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_user_rating_on_review()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.users
  SET
    rating         = (SELECT ROUND(AVG(rating)::NUMERIC, 2) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id),
    total_bookings = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE id = NEW.reviewee_id;

  -- Also update service rating
  UPDATE public.services
  SET
    rating       = (
      SELECT ROUND(AVG(r.rating)::NUMERIC, 2)
      FROM public.reviews r
      JOIN public.bookings b ON b.id = r.booking_id
      WHERE b.service_id = services.id
    ),
    review_count = (
      SELECT COUNT(r.id)
      FROM public.reviews r
      JOIN public.bookings b ON b.id = r.booking_id
      WHERE b.service_id = services.id
    )
  WHERE provider_id = NEW.reviewee_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_ratings
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION sync_user_rating_on_review();

-- ──────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- USERS: public read (non-deleted), self update
CREATE POLICY "users_public_read" ON public.users
  FOR SELECT USING (deleted_at IS NULL);
CREATE POLICY "users_self_update" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- SERVICES: public read active, provider manages own
CREATE POLICY "services_public_read" ON public.services
  FOR SELECT USING (is_active = TRUE OR provider_id = auth.uid());
CREATE POLICY "services_provider_write" ON public.services
  FOR ALL USING (provider_id = auth.uid());

-- BOOKINGS: customer or provider can see their own
CREATE POLICY "bookings_participant_read" ON public.bookings
  FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid());
CREATE POLICY "bookings_customer_create" ON public.bookings
  FOR INSERT WITH CHECK (customer_id = auth.uid());
CREATE POLICY "bookings_participant_update" ON public.bookings
  FOR UPDATE USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- MESSAGES: only sender or receiver
CREATE POLICY "messages_participant_read" ON public.messages
  FOR SELECT USING (sender_id = auth.uid() OR receiver_id = auth.uid());
CREATE POLICY "messages_sender_insert" ON public.messages
  FOR INSERT WITH CHECK (sender_id = auth.uid());
CREATE POLICY "messages_receiver_update" ON public.messages
  FOR UPDATE USING (receiver_id = auth.uid());

-- REVIEWS: public read, reviewer inserts, reviewee updates (reply)
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_reviewer_insert" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());
CREATE POLICY "reviews_reviewee_update" ON public.reviews
  FOR UPDATE USING (reviewee_id = auth.uid());

-- PAYMENTS: only booking participants
CREATE POLICY "payments_participant_read" ON public.payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.id = booking_id
        AND (b.customer_id = auth.uid() OR b.provider_id = auth.uid())
    )
  );

-- NOTIFICATIONS: only owner
CREATE POLICY "notifications_owner" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- SUPABASE REALTIME: enable for messages and notifications
-- ──────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ──────────────────────────────────────────────────────────────
-- UTILITY FUNCTION: mark all notifications read for a user
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION mark_notifications_read(p_user_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE public.notifications
  SET is_read = TRUE
  WHERE user_id = p_user_id AND is_read = FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ──────────────────────────────────────────────────────────────
-- STORAGE BUCKETS (run in Supabase dashboard or via CLI)
-- ──────────────────────────────────────────────────────────────
-- INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('service-images', 'service-images', true);
-- INSERT INTO storage.buckets (id, name, public) VALUES ('chat-images', 'chat-images', false);
