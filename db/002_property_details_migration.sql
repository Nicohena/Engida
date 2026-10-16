-- ================================================================
-- PROPERTY DETAILS MIGRATION
-- Adds columns for property area, parking, and user consultant fields
-- Also seeds 4 related luxury properties for the details page
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

-- 3. Update existing seed property with new fields
UPDATE properties SET
  area_sqm = 220,
  parking_spaces = 1
WHERE id = 'c0000000-0000-0000-0000-000000000001';

-- 4. Update existing host with consultant profile
UPDATE users SET
  phone = '+251 911 234 890',
  title = 'Senior Property Consultant',
  bio = 'Abebe has over a decade of verified experience in luxury residential and prime metropolitan properties across Ethiopia. His client-first methodology and comprehensive market insights provide an unmatched bespoke journey for buyers and renters.',
  avatar = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDxknKoUW7P36f-lE2P7BXH1loEt4sNBtWxQq-YpFUO2J5gknUYVgweT_RCJ1Da1lJ70AUimqr7RF09P6tGZy1ZqPsjMbhYYb6K9ro0GdKUoejBOxLO4Xy7WI1anbTapUOypBPwZ0ynO-PFKVw0k8o7OKeDynqJSvRAsKDA-qYlmWogfFZqzJlpu1gysTyAlHlbjqGTQdbfhqnwd2dMRkaG2_u7_oipi34kV1lRNmBiiX9Zo2GrSUU40Q',
  office_location = 'Addis Ababa & Hawassa'
WHERE id = 'b0000000-0000-0000-0000-000000000002';

-- 5. Update the main property with cover image and gallery images
UPDATE properties SET
  cover_image = 'https://lh3.googleusercontent.com/aida-public/AB6AXuCkz2OG6oE8xWZHZkQBsfXBgI2gioKNMBSOfW5AJFgpMJ96qmbxt9Xjs9KnrrlgHmSC5HqhehkaETbqVTb37boq5fhlaT-qjqiZXsL4bQZ5z8waLri8TfQSdogqXmc9lkeabctZpgsYT1oEeY8bnW3dbWeXrPjDcuBhvCj_SGAfnNRZ0LiZvr2Dv-dSVKMRIQ0hPo_8N8XdNfKEMu9xdQMHOuWNSNTwBbFld0-Cj--rTkx39QREYun-ag',
  images = ARRAY[
    'https://lh3.googleusercontent.com/aida-public/AB6AXuCkz2OG6oE8xWZHZkQBsfXBgI2gioKNMBSOfW5AJFgpMJ96qmbxt9Xjs9KnrrlgHmSC5HqhehkaETbqVTb37boq5fhlaT-qjqiZXsL4bQZ5z8waLri8TfQSdogqXmc9lkeabctZpgsYT1oEeY8bnW3dbWeXrPjDcuBhvCj_SGAfnNRZ0LiZvr2Dv-dSVKMRIQ0hPo_8N8XdNfKEMu9xdQMHOuWNSNTwBbFld0-Cj--rTkx39QREYun-ag'
  ],
  description = 'Welcome to this exquisite coastal residence designed to offer the ultimate luxury experience. Nestled in a premium secluded enclave, this property boasts panoramic uninterrupted views of the coastline, complemented by opulent natural light filling every corner through floor-to-ceiling glass expanses.

The open-concept layout features bespoke architectural millwork, an expansive chef''s gourmet kitchen with state-of-the-art marble islands, and a custom wine gallery. The master suite is a private retreat with its own private terrace, deep walk-in wardrobes, and an artisan spa bathroom adorned with high-end fixtures.

Outdoor living spaces seamlessly transition from the grand salon to an expansive sun terrace, infinity edge swimming pool, and pristine landscaped gardens. Crafted with top-tier finishes and eco-friendly smart home technologies, this property represents rare sophistication and timeless elegance.'
WHERE id = 'c0000000-0000-0000-0000-000000000001';

-- 6. Add more amenities for detailed features
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

-- 7. Link more amenities to the main property
INSERT INTO property_amenities (property_id, amenity_id)
SELECT 'c0000000-0000-0000-0000-000000000001', id FROM amenities
WHERE name IN ('Swimming Pool', 'Air Conditioning', 'Security', 'Garden', 'Smart Home')
ON CONFLICT (property_id, amenity_id) DO NOTHING;

-- 8. Seed 4 related properties
INSERT INTO properties (id, host_id, title, description, property_type, address, city, price_per_night, max_guests, bedrooms, bathrooms, area_sqm, parking_spaces, cover_image, images) VALUES
(
  'd0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000002',
  'Hillside Minimalist Villa',
  'A stunning minimalist villa with breathtaking views of the Entoto mountains. Features clean lines, natural materials, and floor-to-ceiling windows that frame the landscape.',
  'VILLA',
  'Entoto Hills, North Addis',
  'Addis Ababa',
  345.00, 8, 4, 3, 380, 2,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuDoerE6yNADEE4L07QLGRJG1e4O-Dj5XutS0xRZLAJIBqtoh0Kv0eS0PS21GyXhnGFKHviUgn4dxpy2jUGmi5UWKyrD2uGPsni8RcyxvqdpZ8TkNmsgTMaLQjUYw_OxrmI3dIK2rGWTjLj3hSJ7gXntTjZBjO1a8iba7HXryKc83-ijjS0mQUQ97A4D2f86EWRMnsh-GMK-XdTzJfcQfuAr2-X2Gr3A6lkucUxIcWvXKvd0JoB6sJ7Rvw',
  '{}'
),
(
  'd0000000-0000-0000-0000-000000000002',
  'b0000000-0000-0000-0000-000000000002',
  'Skyline Panorama Suite',
  'A stunning penthouse suite offering panoramic views of the city skyline. Features modern amenities, private terrace, and premium finishes throughout.',
  'APARTMENT',
  'Bole Medhanialem, Tower 12',
  'Addis Ababa',
  285.00, 6, 3, 2, 190, 1,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCD9YC9LX0yAmsB0rZ9SCGkjL5YzUVJMozYhj1KnYdMRaf2_3Vkw4U0-77uvDsnjubCBnmtiE4Js-NOehKP-H6m51ZAwajG6_GigX4eL_ffyL5DpZt7tSp441bQcblIuPenTKTcngUMcIfW65di23QgbcWMynNlvswCqRPg2oQqhqv7jtic026hOYky60ASF7qG84Cer198EtbzcFaSsFmm5TFGK93IDGJYE1S_yKXznM74Kvv37AQgtw',
  '{}'
),
(
  'd0000000-0000-0000-0000-000000000003',
  'b0000000-0000-0000-0000-000000000002',
  'The Palm Sanctuary',
  'A tropical paradise retreat surrounded by lush gardens and natural springs. Features an outdoor dining area, private pool, and traditional Ethiopian hospitality.',
  'HOUSE',
  'Lake Hawassa Shore Road',
  'Hawassa',
  412.00, 10, 5, 4, 450, 3,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCWb-zNCPTotyBn6DsH750-rNTwzxG5p9rsKAA3r87enJxxmU87-dTW7LEEMgxtDtLU5jTqvRqkVIuNTJ3DaBcCYDEPgd6zfJep5aF9-84kXcnDlBf-zNGyXkDPb7pTi_SMmSg637iGf8w0xcNDhrsImQGrH5V2wo-d_kLoAJK0WZ2H6BsxlSr8XiVLLaEDdt-Y_8k7xjc2kdb69cvGj9aH54mqv_giQkBTmKVULHPtERfOZy-GRhzvWA',
  '{}'
),
(
  'd0000000-0000-0000-0000-000000000004',
  'b0000000-0000-0000-0000-000000000002',
  'Glass Pavilion Residence',
  'An architectural masterpiece featuring glass pavilion design, smart home automation, and seamless indoor-outdoor living. Perfect for those who appreciate cutting-edge design.',
  'VILLA',
  'Old Airport Road, Lideta',
  'Addis Ababa',
  520.00, 8, 4, 5, 500, 2,
  'https://lh3.googleusercontent.com/aida-public/AB6AXuCSLpDNiC2MVR2ZzfZBQX8mEsKix2gnavtN0drMzfT1qQDBIwWnb-F0X1ewBYeQ0bkPsFk4Ng4Y6FdlzitQd_BG68UupCkxuQmobonWRHEoz__QwqIDQ3ld0KhF3D5uegW1KEFehLj1jBObBAttnV2ZtAoDI3CcpdKdcivb2r1dBnmIxIN9ESZvNkXA26ABljVUDUBi_6cXu8ctibvGXe38ne8oQyu7BeQjSTcjiP7IPxz2NQCXwh_x9w',
  '{}'
)
ON CONFLICT (id) DO NOTHING;

-- 9. Link amenities to related properties
INSERT INTO property_amenities (property_id, amenity_id)
SELECT 'd0000000-0000-0000-0000-000000000001', id FROM amenities WHERE name IN ('Wi-Fi', 'Free Parking', 'Swimming Pool', 'Air Conditioning', 'Kitchen')
ON CONFLICT DO NOTHING;

INSERT INTO property_amenities (property_id, amenity_id)
SELECT 'd0000000-0000-0000-0000-000000000002', id FROM amenities WHERE name IN ('Wi-Fi', 'Air Conditioning', 'Elevator', 'Security', 'Fitness Center')
ON CONFLICT DO NOTHING;

INSERT INTO property_amenities (property_id, amenity_id)
SELECT 'd0000000-0000-0000-0000-000000000003', id FROM amenities WHERE name IN ('Wi-Fi', 'Free Parking', 'Swimming Pool', 'Garden', 'Hot Water')
ON CONFLICT DO NOTHING;

INSERT INTO property_amenities (property_id, amenity_id)
SELECT 'd0000000-0000-0000-0000-000000000004', id FROM amenities WHERE name IN ('Wi-Fi', 'Smart Home', 'Security', 'Wine Cellar', 'Swimming Pool')
ON CONFLICT DO NOTHING;
