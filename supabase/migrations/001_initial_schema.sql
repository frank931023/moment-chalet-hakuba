-- Moment Chalet Hakuba 民宿預訂系統
-- Initial Schema Migration

-- ============================================================
-- properties（民宿）
-- ============================================================
CREATE TABLE properties (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 TEXT NOT NULL,
  description          TEXT,
  location             TEXT NOT NULL,
  lat                  FLOAT NOT NULL,
  lng                  FLOAT NOT NULL,
  images               TEXT[] DEFAULT '{}',
  ical_url             TEXT,
  has_breakfast_option BOOLEAN DEFAULT FALSE,
  is_active            BOOLEAN DEFAULT TRUE,
  created_at           TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- room_types（房型）
-- ============================================================
CREATE TABLE room_types (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id     UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  name            TEXT NOT NULL,
  capacity        INT NOT NULL,
  price_per_night NUMERIC(10, 2) NOT NULL,
  breakfast_price NUMERIC(10, 2) DEFAULT 0,
  amenities       TEXT[] DEFAULT '{}',
  images          TEXT[] DEFAULT '{}',
  is_active       BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- bookings（訂單）
-- ============================================================
CREATE TABLE bookings (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  room_type_id      UUID NOT NULL REFERENCES room_types(id),
  guest_name        TEXT NOT NULL,
  guest_email       TEXT NOT NULL,
  guest_phone       TEXT NOT NULL,
  check_in          DATE NOT NULL,
  check_out         DATE NOT NULL,
  include_breakfast BOOLEAN DEFAULT FALSE,
  total_amount      NUMERIC(10, 2) NOT NULL,
  status            TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending', 'confirmed', 'cancelled', 'refunded')),
  paypal_order_id   TEXT,
  paypal_capture_id TEXT,
  special_requests  TEXT,
  created_at        TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (check_out > check_in)
);

-- ============================================================
-- blocked_dates（已佔用日期）
-- ============================================================
CREATE TABLE blocked_dates (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  start_date  DATE NOT NULL,
  end_date    DATE NOT NULL,
  source      TEXT NOT NULL CHECK (source IN ('ical', 'manual')),
  synced_at   TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_blocked_dates CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX idx_blocked_dates_unique
  ON blocked_dates(property_id, start_date, end_date, source);
