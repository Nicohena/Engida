-- ================================================================
-- PROPERTY DETAILS MIGRATION
-- Adds columns for property area, parking, and user consultant fields
-- Adds property presentation fields and standard amenity reference values
-- ================================================================

-- 1. Add new columns to properties table
ALTER TABLE properties ADD COLUMN IF NOT EXISTS area_sqm INT DEFAULT 0;
ALTER TABLE properties ADD COLUMN IF NOT EXISTS parking_spaces INT DEFAULT 0;

-- 2. Add new consultant/host profile columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE users ADD COLUMN IF NOT EXISTS title VARCHAR(150);
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar VARCHAR(500);
ALTER TABLE users ADD COLUMN IF NOT EXISTS office_location VARCHAR(150);

-- 3. Add more amenities for detailed features
INSERT INTO amenities (name, icon) VALUES
('Swimming Pool', 'pool'),
('Air Conditioning', 'ac_unit'),
('Security', 'security'),
('Elevator', 'elevator'),
('Fitness Center', 'fitness_center'),
('Wine Cellar', 'wine_bar'),
('Smart Home', 'smart_home'),
('Garden', 'yard')
ON CONFLICT (name) DO NOTHING;
