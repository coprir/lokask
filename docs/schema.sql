-- ================================================================
-- LOKASK — Complete PostgreSQL / Supabase Schema
-- Run in Supabase SQL Editor (in order)
-- ================================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- fuzzy text search

-- ──────────────────────────────────────────────────────────────
-- ENUMS
-- ──────────────────────────────────────────────────────────────

CREATE TYPE user_role AS ENUM ('customer', 'provider', 'both', 'admin');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'succeeded', 'failed', 'refunded');
CREATE TYPE message_type AS ENUM ('text', 'image', 'location', 'system');
CREATE TYPE notification_type AS ENUM ('booking', 'message', 'payment', 'review', 'system');
CREATE TYPE price_unit AS ENUM ('hourly', 'fixed', 'daily');
CREATE TYPE service_category AS ENUM (
  'cleaning', 'tutoring', 'delivery', 'handyman', 'beauty',
  'tech_support', 'childcare', 'pet_care', 'cooking',
  'translation', 'fitness', 'photography', 'other'
);

-- ──────────────────────────────────────────────────────────────
-- USERS (extends Supabase auth.users)
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT UNIQUE NOT NULL,
  phone         TEXT,
  full_name     TEXT NOT NULL,
  avatar_url    TEXT,
  role          user_role NOT NULL DEFAULT 'customer',
  is_verified   BOOLEAN NOT NULL DEFAULT FALSE,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  language      TEXT NOT NULL DEFAULT 'en',
  stripe_customer_id  TEXT,
  stripe_account_id   TEXT,   -- Stripe Connect for providers
  location      GEOGRAPHY(POINT, 4326),
  address       TEXT,
  city          TEXT DEFAULT 'Nicosia',
  fcm_token     TEXT,         -- Firebase push token
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- PROVIDER PROFILES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.provider_profiles (
  id                      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id                 UUID NOT NULL UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
  bio                     TEXT,
  tagline                 TEXT,
  skills                  TEXT[] NOT NULL DEFAULT '{}',
  languages               TEXT[] NOT NULL DEFAULT '{en}',
  nationality             TEXT,
  id_verified             BOOLEAN NOT NULL DEFAULT FALSE,
  background_checked      BOOLEAN NOT NULL DEFAULT FALSE,
  rating_avg              NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count            INTEGER NOT NULL DEFAULT 0,
  completed_jobs          INTEGER NOT NULL DEFAULT 0,
  response_time_minutes   INTEGER,
  portfolio_urls          TEXT[] NOT NULL DEFAULT '{}',
  is_available            BOOLEAN NOT NULL DEFAULT TRUE,
  availability_schedule   JSONB,   -- { monday: { enabled, start, end }, ... }
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ──────────────────────────────────────────────────────────────
-- SERVICES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.services (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  provider_id       UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title             TEXT NOT NULL,
  description       TEXT NOT NULL,
  category          service_category NOT NULL,
  price             NUMERIC(10,2) NOT NULL,
  price_unit        price_unit NOT NULL DEFAULT 'hourly',
  currency          TEXT NOT NULL DEFAULT 'EUR',
  duration_minutes  INTEGER,
  images            TEXT[] NOT NULL DEFAULT '{}',
  tags              TEXT[] NOT NULL DEFAULT '{}',
  location          GEOGRAPHY(POINT, 4326),
  service_area_km   INTEGER DEFAULT 10,
  is_remote         BOOLEAN NOT NULL DEFAULT FALSE,
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  rating_avg        NUMERIC(3,2) NOT NULL DEFAULT 0,
  review_count      INTEGER NOT NULL DEFAULT 0,
  view_count        INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Full-text search
CREATE INDEX idx_services_fts ON public.services
  USING GIN(to_tsvector('english', title || ' ' || description));

-- Geo index
CREATE INDEX idx_services_location ON public.services USING GIST(location);

-- Category + active filter
CREATE INDEX idx_services_category_active ON public.services(category, is_active);

-- Provider lookup
CREATE INDEX idx_services_provider ON public.services(provider_id);

-- ──────────────────────────────────────────────────────────────
-- BOOKINGS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.bookings (
  id                    UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  service_id            UUID NOT NULL REFERENCES public.services(id),
  customer_id           UUID NOT NULL REFERENCES public.users(id),
  provider_id           UUID NOT NULL REFERENCES public.users(id),
  status                booking_status NOT NULL DEFAULT 'pending',
  scheduled_at          TIMESTAMPTZ NOT NULL,
  duration_minutes      INTEGER NOT NULL,
  address               TEXT,
  location              GEOGRAPHY(POINT, 4326),
  notes                 TEXT,
  total_amount          NUMERIC(10,2) NOT NULL,
  currency              TEXT NOT NULL DEFAULT 'EUR',
  payment_id            UUID,
  payment_status        payment_status NOT NULL DEFAULT 'pending',
  cancelled_at          TIMESTAMPTZ,
  cancelled_by          UUID REFERENCES public.users(id),
  cancellation_reason   TEXT,
  completed_at          TIMESTAMPTZ,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_bookings_customer ON public.bookings(customer_id, status);
CREATE INDEX idx_bookings_provider ON public.bookings(provider_id, status);
CREATE INDEX idx_bookings_service ON public.bookings(service_id);
CREATE INDEX idx_bookings_scheduled ON public.bookings(scheduled_at);

-- ──────────────────────────────────────────────────────────────
-- CONVERSATIONS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.conversations (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  participants      UUID[] NOT NULL,   -- [customer_id, provider_id]
  booking_id        UUID REFERENCES public.bookings(id),
  last_message_at   TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_conversations_participants ON public.conversations USING GIN(participants);

-- ──────────────────────────────────────────────────────────────
-- MESSAGES
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.messages (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id   UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id         UUID NOT NULL REFERENCES public.users(id),
  type              message_type NOT NULL DEFAULT 'text',
  content           TEXT NOT NULL,
  image_url         TEXT,
  location_data     JSONB,  -- { lat, lng, address }
  is_read           BOOLEAN NOT NULL DEFAULT FALSE,
  read_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_messages_conversation ON public.messages(conversation_id, created_at DESC);
CREATE INDEX idx_messages_sender ON public.messages(sender_id);

-- ──────────────────────────────────────────────────────────────
-- REVIEWS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.reviews (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    UUID NOT NULL UNIQUE REFERENCES public.bookings(id),
  reviewer_id   UUID NOT NULL REFERENCES public.users(id),
  reviewee_id   UUID NOT NULL REFERENCES public.users(id),
  service_id    UUID NOT NULL REFERENCES public.services(id),
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  tags          TEXT[] NOT NULL DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reviews_reviewee ON public.reviews(reviewee_id, created_at DESC);
CREATE INDEX idx_reviews_service ON public.reviews(service_id);

-- ──────────────────────────────────────────────────────────────
-- PAYMENTS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.payments (
  id                          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id                  UUID NOT NULL REFERENCES public.bookings(id),
  customer_id                 UUID NOT NULL REFERENCES public.users(id),
  provider_id                 UUID NOT NULL REFERENCES public.users(id),
  stripe_payment_intent_id    TEXT NOT NULL UNIQUE,
  stripe_transfer_id          TEXT,
  amount                      NUMERIC(10,2) NOT NULL,
  currency                    TEXT NOT NULL DEFAULT 'EUR',
  status                      payment_status NOT NULL DEFAULT 'pending',
  provider_amount             NUMERIC(10,2) NOT NULL,  -- = amount (no platform cut)
  metadata                    JSONB,
  created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_payments_booking ON public.payments(booking_id);
CREATE INDEX idx_payments_stripe ON public.payments(stripe_payment_intent_id);
CREATE INDEX idx_payments_provider ON public.payments(provider_id, status);

-- ──────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ──────────────────────────────────────────────────────────────

CREATE TABLE public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type        notification_type NOT NULL,
  title       TEXT NOT NULL,
  body        TEXT NOT NULL,
  data        JSONB,
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read, created_at DESC);

-- ──────────────────────────────────────────────────────────────
-- TRIGGERS: auto-update timestamps
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_services_updated_at
  BEFORE UPDATE ON public.services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trg_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: sync rating averages on new review
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION sync_ratings_on_review()
RETURNS TRIGGER AS $$
BEGIN
  -- Update provider profile
  UPDATE public.provider_profiles
  SET
    rating_avg   = (SELECT AVG(rating) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE reviewee_id = NEW.reviewee_id)
  WHERE user_id = NEW.reviewee_id;

  -- Update service rating
  UPDATE public.services
  SET
    rating_avg   = (SELECT AVG(rating) FROM public.reviews WHERE service_id = NEW.service_id),
    review_count = (SELECT COUNT(*) FROM public.reviews WHERE service_id = NEW.service_id)
  WHERE id = NEW.service_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_sync_ratings
  AFTER INSERT ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION sync_ratings_on_review();

-- ──────────────────────────────────────────────────────────────
-- TRIGGER: auto-create user record on auth signup
-- ──────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION handle_new_auth_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trg_new_auth_user
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_auth_user();

-- ──────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY POLICIES
-- ──────────────────────────────────────────────────────────────

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.provider_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- USERS: public read, self write
CREATE POLICY "users_public_read" ON public.users FOR SELECT USING (TRUE);
CREATE POLICY "users_self_update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- PROVIDER PROFILES: public read, self write
CREATE POLICY "profiles_public_read" ON public.provider_profiles FOR SELECT USING (TRUE);
CREATE POLICY "profiles_self_write" ON public.provider_profiles
  FOR ALL USING (auth.uid() = user_id);

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

-- CONVERSATIONS: only participants
CREATE POLICY "conversations_participants" ON public.conversations
  FOR ALL USING (auth.uid() = ANY(participants));

-- MESSAGES: only participants of the conversation
CREATE POLICY "messages_participants" ON public.messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = conversation_id AND auth.uid() = ANY(c.participants)
    )
  );

-- REVIEWS: public read, reviewer manages own
CREATE POLICY "reviews_public_read" ON public.reviews FOR SELECT USING (TRUE);
CREATE POLICY "reviews_reviewer_write" ON public.reviews
  FOR INSERT WITH CHECK (reviewer_id = auth.uid());

-- PAYMENTS: only involved parties
CREATE POLICY "payments_participant_read" ON public.payments
  FOR SELECT USING (customer_id = auth.uid() OR provider_id = auth.uid());

-- NOTIFICATIONS: only owner
CREATE POLICY "notifications_owner" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ──────────────────────────────────────────────────────────────
-- SUPABASE REALTIME: enable for messages + notifications
-- ──────────────────────────────────────────────────────────────

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;

-- ──────────────────────────────────────────────────────────────
-- UTILITY FUNCTIONS (callable via RPC)
-- ──────────────────────────────────────────────────────────────

-- Find services within radius (km)
CREATE OR REPLACE FUNCTION find_nearby_services(
  p_lat        FLOAT,
  p_lng        FLOAT,
  p_radius_km  FLOAT DEFAULT 10,
  p_category   service_category DEFAULT NULL,
  p_limit      INT DEFAULT 20
)
RETURNS TABLE (
  id              UUID,
  title           TEXT,
  price           NUMERIC,
  price_unit      price_unit,
  rating_avg      NUMERIC,
  review_count    INT,
  distance_km     FLOAT,
  provider_name   TEXT,
  provider_avatar TEXT,
  image_url       TEXT,
  category        service_category
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    s.id,
    s.title,
    s.price,
    s.price_unit,
    s.rating_avg,
    s.review_count,
    ST_Distance(s.location, ST_MakePoint(p_lng, p_lat)::geography) / 1000 AS distance_km,
    u.full_name AS provider_name,
    u.avatar_url AS provider_avatar,
    (s.images)[1] AS image_url,
    s.category
  FROM public.services s
  JOIN public.users u ON u.id = s.provider_id
  WHERE
    s.is_active = TRUE
    AND (p_category IS NULL OR s.category = p_category)
    AND (
      s.is_remote = TRUE
      OR s.location IS NULL
      OR ST_DWithin(
        s.location,
        ST_MakePoint(p_lng, p_lat)::geography,
        p_radius_km * 1000
      )
    )
  ORDER BY
    CASE WHEN s.location IS NOT NULL
      THEN ST_Distance(s.location, ST_MakePoint(p_lng, p_lat)::geography)
      ELSE 999999
    END ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

-- Mark all notifications as read for a user
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
-- INSERT INTO storage.buckets (id, name, public) VALUES ('portfolio', 'portfolio', true);
