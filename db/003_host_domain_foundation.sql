-- ================================================================
-- STEP 2: HOST DATABASE & DOMAIN FOUNDATION MIGRATION
-- Migration: 003_host_domain_foundation.sql
-- ================================================================

-- 1. Create Enums if they do not exist
DO $$ BEGIN
  CREATE TYPE host_verification_status_enum AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_type_enum AS ENUM ('RENTAL', 'SALE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE listing_status_enum AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD', 'ARCHIVED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create host_profiles table
CREATE TABLE IF NOT EXISTS host_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name VARCHAR(255),
  bio TEXT,
  phone VARCHAR(50),
  verification_status host_verification_status_enum NOT NULL DEFAULT 'UNVERIFIED',
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_host_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_host_profiles_user_id ON host_profiles(user_id);

-- 3. Extend properties table with host, sale, and location hierarchy fields
ALTER TABLE properties
  ADD COLUMN IF NOT EXISTS listing_type listing_type_enum NOT NULL DEFAULT 'RENTAL',
  ADD COLUMN IF NOT EXISTS status listing_status_enum NOT NULL DEFAULT 'PUBLISHED',
  ADD COLUMN IF NOT EXISTS sale_price DECIMAL(14, 2),
  ADD COLUMN IF NOT EXISTS region VARCHAR(100),
  ADD COLUMN IF NOT EXISTS zone VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sub_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS woreda VARCHAR(100),
  ADD COLUMN IF NOT EXISTS neighborhood VARCHAR(150),
  ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8),
  ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);

-- Backfill existing properties to ensure consistent defaults
UPDATE properties
SET listing_type = 'RENTAL'
WHERE listing_type IS NULL;

UPDATE properties
SET status = 'PUBLISHED'
WHERE status IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_listing_type ON properties(listing_type);
CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);
CREATE INDEX IF NOT EXISTS idx_properties_sub_city ON properties(sub_city);

-- 4. Create availability_blocks table
CREATE TABLE IF NOT EXISTS availability_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_availability_blocks_property FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE,
  CONSTRAINT chk_availability_dates CHECK (end_date > start_date)
);

CREATE INDEX IF NOT EXISTS idx_availability_blocks_property_id ON availability_blocks(property_id);
CREATE INDEX IF NOT EXISTS idx_availability_blocks_property_dates ON availability_blocks(property_id, start_date, end_date);
