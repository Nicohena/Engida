-- ================================================================
-- ENGIDA RENTAL PLATFORM - POSTGRESQL DATABASE SCHEMA
-- Database: engida_db
-- ================================================================

-- 1. Enable Required PostgreSQL Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Drop Tables if Exists (Clean Setup Script)
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS bookings CASCADE;
DROP TABLE IF EXISTS property_amenities CASCADE;
DROP TABLE IF EXISTS amenities CASCADE;
DROP TABLE IF EXISTS rooms CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS refresh_tokens CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 3. Drop Custom Enum Types if Exists
DROP TYPE IF EXISTS user_role_enum CASCADE;
DROP TYPE IF EXISTS property_type_enum CASCADE;
DROP TYPE IF EXISTS booking_status_enum CASCADE;

-- 4. Create Custom Enum Types
CREATE TYPE user_role_enum AS ENUM ('USER', 'ADMIN');
CREATE TYPE property_type_enum AS ENUM ('HOUSE', 'APARTMENT', 'VILLA', 'BEDROOM', 'STUDIO');
CREATE TYPE booking_status_enum AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED');

-- ================================================================
-- TABLE: USERS
-- ================================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    -- Nullable: accounts created through Google Sign-In have no password
    password_hash VARCHAR(255),
    role user_role_enum DEFAULT 'USER' NOT NULL,
    -- LOCAL = email/password, GOOGLE = Google Sign-In (OpenID Connect)
    auth_provider VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
    -- Identity provider subject id (Google "sub" claim)
    provider_id VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Index for User Email Lookup
CREATE INDEX idx_users_email ON users(email);

-- One external identity may only be linked to a single account
CREATE UNIQUE INDEX idx_users_provider_identity ON users(auth_provider, provider_id);

-- ================================================================
-- TABLE: REFRESH_TOKENS
-- ================================================================
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_revoked BOOLEAN DEFAULT FALSE NOT NULL,
    replaced_by_token VARCHAR(255),
    user_agent VARCHAR(255),
    ip_address VARCHAR(45),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_refresh_tokens_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);

-- ================================================================
-- TABLE: PROPERTIES (House and Bedroom Rental Listings)
-- ================================================================
CREATE TABLE properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    property_type property_type_enum DEFAULT 'HOUSE' NOT NULL,
    address VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    country VARCHAR(100) DEFAULT 'Ethiopia' NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    max_guests INT DEFAULT 1 NOT NULL,
    bedrooms INT DEFAULT 1 NOT NULL,
    bathrooms INT DEFAULT 1 NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    cover_image VARCHAR(500),
    images TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_properties_host_id ON properties(host_id);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_type ON properties(property_type);

-- ================================================================
-- TABLE: ROOMS (Individual Rooms/Bedrooms within a Property)
-- ================================================================
CREATE TABLE rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    title VARCHAR(150) NOT NULL,
    room_number VARCHAR(50) NOT NULL,
    capacity INT DEFAULT 1 NOT NULL,
    price_per_night DECIMAL(10, 2) NOT NULL,
    is_available BOOLEAN DEFAULT TRUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_rooms_property_id ON rooms(property_id);

-- ================================================================
-- TABLE: AMENITIES & PROPERTY_AMENITIES
-- ================================================================
CREATE TABLE amenities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    icon VARCHAR(100)
);

CREATE TABLE property_amenities (
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    amenity_id UUID NOT NULL REFERENCES amenities(id) ON DELETE CASCADE,
    PRIMARY KEY (property_id, amenity_id)
);

-- ================================================================
-- TABLE: BOOKINGS
-- ================================================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
    guest_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    check_in_date DATE NOT NULL,
    check_out_date DATE NOT NULL,
    guest_count INTEGER NOT NULL DEFAULT 1 CHECK (guest_count BETWEEN 1 AND 50),
    total_price DECIMAL(10, 2) NOT NULL,
    status booking_status_enum DEFAULT 'PENDING' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_bookings_guest_id ON bookings(guest_id);
CREATE INDEX idx_bookings_property_id ON bookings(property_id);
CREATE INDEX idx_bookings_dates ON bookings(check_in_date, check_out_date);

-- ================================================================
-- TABLE: REVIEWS
-- ================================================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX idx_reviews_property_id ON reviews(property_id);
CREATE UNIQUE INDEX idx_reviews_property_user_unique ON reviews(property_id, user_id);

-- ================================================================
-- INITIAL SEED DATA
-- ================================================================

-- Seed Initial Amenities
INSERT INTO amenities (name, icon) VALUES
('Wi-Fi', 'wifi'),
('Free Parking', 'local_parking'),
('Air Conditioning', 'ac_unit'),
('Kitchen', 'kitchen'),
('Washing Machine', 'local_laundry_service'),
('Swimming Pool', 'pool'),
('TV', 'tv'),
('Hot Water', 'hot_tub');

-- Seed the controlled administrator account only (Password: Admin123! hashed with bcrypt)
INSERT INTO users (id, name, email, password_hash, role) VALUES
('a0000000-0000-0000-0000-000000000001', 'Engida Admin', 'admin@engida.com', '$2b$10$zF1uNeWfROT3HMQd7ZNGCO4qGOu5NPibgnS2VfExo/TmbAjd1nApa', 'ADMIN');
