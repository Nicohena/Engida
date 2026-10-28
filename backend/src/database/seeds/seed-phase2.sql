BEGIN;

-- The original local seed used an all-zero UUID for the first administrator.
-- Normalize it to a valid v4 UUID and move every foreign reference with it.
DO $$
DECLARE
  old_admin uuid := 'a0000000-0000-0000-0000-000000000001';
  new_admin uuid := 'a0000000-0000-4000-8000-000000000001';
  ref record;
BEGIN
  PERFORM set_config('session_replication_role', 'replica', true);
  IF EXISTS (SELECT 1 FROM users WHERE id = old_admin) THEN
    UPDATE users SET id = new_admin WHERE id = old_admin;
  END IF;
  FOR ref IN
    SELECT tc.table_name, kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
     AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage ccu
      ON ccu.constraint_name = tc.constraint_name
     AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY'
      AND ccu.table_name = 'users'
      AND ccu.column_name = 'id'
  LOOP
    EXECUTE format('UPDATE %I SET %I = $1 WHERE %I = $2',
      ref.table_name, ref.column_name, ref.column_name)
      USING new_admin, old_admin;
  END LOOP;
  PERFORM set_config('session_replication_role', 'origin', true);
END $$;

-- Remove only the deterministic demo records so this script can be rerun.
DELETE FROM cases WHERE id IN (
  'f0000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'f0000000-0000-4000-8000-000000000003',
  'f0000000-0000-4000-8000-000000000004',
  'f0000000-0000-4000-8000-000000000005',
  'f0000000-0000-4000-8000-000000000006',
  'f0000000-0000-4000-8000-000000000007'
);
DELETE FROM booking_cancellation_requests WHERE booking_id IN (
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000005',
  'e0000000-0000-4000-8000-000000000006',
  'e0000000-0000-4000-8000-000000000007'
);
DELETE FROM booking_status_history WHERE booking_id IN (
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000005',
  'e0000000-0000-4000-8000-000000000006',
  'e0000000-0000-4000-8000-000000000007'
);
DELETE FROM availability_blocks WHERE property_id IN (
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004'
);
DELETE FROM bookings WHERE id IN (
  'e0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003',
  'e0000000-0000-4000-8000-000000000004',
  'e0000000-0000-4000-8000-000000000005',
  'e0000000-0000-4000-8000-000000000006',
  'e0000000-0000-4000-8000-000000000007'
);
DELETE FROM properties WHERE id IN (
  'd0000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  'd0000000-0000-4000-8000-000000000003',
  'd0000000-0000-4000-8000-000000000004'
);
DELETE FROM canned_responses WHERE id IN (
  'aa000000-0000-4000-8000-000000000001',
  'aa000000-0000-4000-8000-000000000002',
  'aa000000-0000-4000-8000-000000000003',
  'aa000000-0000-4000-8000-000000000004'
);
DELETE FROM users WHERE id IN (
  'a0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000002',
  'c0000000-0000-4000-8000-000000000001',
  'c0000000-0000-4000-8000-000000000002'
);

-- People
INSERT INTO users (id, name, email, password_hash, role, is_active, phone, admin_role, created_at, updated_at)
SELECT 'a0000000-0000-4000-8000-000000000002', 'Sara Support', 'sara@engida.com', password_hash, 'ADMIN', true, '+251 911 555 202', 'SUPPORT_AGENT', now() - interval '80 days', now()
FROM users WHERE email = 'admin@engida.com';

INSERT INTO users (id, name, email, password_hash, role, is_active, phone, created_at, updated_at) VALUES
('b0000000-0000-4000-8000-000000000001', 'Hanna Bekele', 'hanna.bekele@engida.local', NULL, 'USER', true, '+251 911 555 101', now() - interval '210 days', now()),
('b0000000-0000-4000-8000-000000000002', 'Yonas Girma', 'yonas.girma@engida.local', NULL, 'USER', true, '+251 911 555 102', now() - interval '180 days', now()),
('c0000000-0000-4000-8000-000000000001', 'Selam Tesfaye', 'selam.tesfaye@engida.local', NULL, 'USER', true, '+251 911 555 201', now() - interval '90 days', now()),
('c0000000-0000-4000-8000-000000000002', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', NULL, 'USER', true, '+251 911 555 303', now() - interval '60 days', now());

INSERT INTO host_profiles (id, user_id, display_name, bio, phone, verification_status, created_at, updated_at)
VALUES
('b1000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'Hanna Bekele', 'Third-generation host in Addis Ababa. Calm spaces, clear communication.', '+251 911 555 101', 'VERIFIED', now() - interval '209 days', now()),
('b1000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'Yonas Girma', 'Hosting lakeside stays in Bahir Dar and garden homes in Addis.', '+251 911 555 102', 'VERIFIED', now() - interval '179 days', now());

-- Published properties
INSERT INTO properties (id, host_id, title, description, property_type, address, city, region, country, price_per_night, max_guests, bedrooms, bathrooms, status, cover_image, images, created_at, updated_at)
VALUES
(
  'd0000000-0000-4000-8000-000000000001',
  'b0000000-0000-4000-8000-000000000001',
  'Bole Medhanialem Penthouse',
  'A bright three-bedroom penthouse above the Bole business district. Deep balconies, a proper coffee corner and space for the whole family.',
  'APARTMENT',
  'Bole Medhanialem, near Edna Mall',
  'Addis Ababa',
  'Addis Ababa',
  'Ethiopia',
  8500,
  4,
  3,
  2,
  'PUBLISHED',
  'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
  ARRAY['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80'],
  now() - interval '120 days',
  now() - interval '3 days'
),
(
  'd0000000-0000-4000-8000-000000000002',
  'b0000000-0000-4000-8000-000000000002',
  'Lake Tana Garden Villa',
  'A quiet villa with a walled garden, papyrus-lined lake path and a long breakfast table for slow mornings in Bahir Dar.',
  'VILLA',
  'Tana Lakefront Road',
  'Bahir Dar',
  'Amhara',
  'Ethiopia',
  5200,
  6,
  3,
  3,
  'PUBLISHED',
  'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80',
  ARRAY['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?auto=format&fit=crop&w=1200&q=80'],
  now() - interval '100 days',
  now() - interval '8 days'
),
(
  'd0000000-0000-4000-8000-000000000003',
  'b0000000-0000-4000-8000-000000000001',
  'Hawassa Lakeview Loft',
  'A compact loft for two with a wide western window over the lake. Walk to the fish market and the promenade in ten minutes.',
  'APARTMENT',
  'Lake Hawassa Promenade',
  'Hawassa',
  'Sidama',
  'Ethiopia',
  3800,
  2,
  1,
  1,
  'PUBLISHED',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
  ARRAY['https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'],
  now() - interval '75 days',
  now() - interval '2 days'
),
(
  'd0000000-0000-4000-8000-000000000004',
  'b0000000-0000-4000-8000-000000000002',
  'Entoto Garden House',
  'A low stone house at the edge of Entoto with a mature garden, a fireplace and room to breathe above the city.',
  'HOUSE',
  'Entoto Park edge',
  'Addis Ababa',
  'Addis Ababa',
  'Ethiopia',
  4600,
  5,
  2,
  2,
  'PUBLISHED',
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80',
  ARRAY['https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=80'],
  now() - interval '65 days',
  now() - interval '11 days'
);

-- Bookings
INSERT INTO bookings (id, property_id, guest_id, check_in_date, check_out_date, total_price, status, created_at, updated_at, guest_count, payment_method, payment_status, payment_reference, payment_currency, paid_at, reference, cancellation_policy, cancelled_by_id, cancelled_by_type, cancelled_at, cancellation_reason)
VALUES
(
  'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000001',
  '2026-11-10', '2026-11-14', 34000, 'PENDING', now() - interval '5 hours', now() - interval '5 hours', 2,
  'CASH_ON_ARRIVAL', 'PENDING', NULL, 'ETB', NULL, 'BKG-2026-000101', 'MODERATE', NULL, NULL, NULL, NULL
),
(
  'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000002',
  '2026-11-20', '2026-11-24', 20800, 'CONFIRMED', now() - interval '2 days', now() - interval '46 hours', 4,
  'CHAPA', 'PAID', 'CHP-784120', 'ETB', now() - interval '47 hours', 'BKG-2026-000102', 'STRICT', NULL, NULL, NULL, NULL
),
(
  'e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003', 'c0000000-0000-4000-8000-000000000001',
  '2026-12-02', '2026-12-06', 15200, 'CONFIRMED', now() - interval '1 day', now() - interval '20 hours', 2,
  'TELEBIRR', 'PAID', 'TB-992014', 'ETB', now() - interval '23 hours', 'BKG-2026-000103', 'MODERATE', NULL, NULL, NULL, NULL
),
(
  'e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
  '2026-10-10', '2026-10-13', 25500, 'COMPLETED', now() - interval '20 days', now() - interval '12 days', 3,
  'CASH_ON_ARRIVAL', 'PAID', NULL, 'ETB', now() - interval '12 days', 'BKG-2026-000104', 'MODERATE', NULL, NULL, NULL, NULL
),
(
  'e0000000-0000-4000-8000-000000000005', 'd0000000-0000-4000-8000-000000000004', 'c0000000-0000-4000-8000-000000000001',
  '2026-10-01', '2026-10-03', 9200, 'CANCELLED', now() - interval '28 days', now() - interval '26 days', 2,
  'CASH_ON_ARRIVAL', 'PENDING', NULL, 'ETB', NULL, 'BKG-2026-000105', 'FLEXIBLE', 'c0000000-0000-4000-8000-000000000001', 'GUEST', now() - interval '26 days', 'Family emergency meant the trip had to move.'
),
(
  'e0000000-0000-4000-8000-000000000006', 'd0000000-0000-4000-8000-000000000001', 'c0000000-0000-4000-8000-000000000002',
  '2026-10-30', '2026-11-01', 17000, 'PENDING', now() - interval '1 day', now() - interval '2 hours', 2,
  'CASH_ON_ARRIVAL', 'PENDING', NULL, 'ETB', NULL, 'BKG-2026-000106', 'MODERATE', NULL, NULL, NULL, NULL
),
(
  'e0000000-0000-4000-8000-000000000007', 'd0000000-0000-4000-8000-000000000002', 'c0000000-0000-4000-8000-000000000001',
  '2026-11-25', '2026-11-28', 15600, 'CONFIRMED', now() - interval '4 days', now() - interval '3 days', 2,
  'CBE_BIRR', 'PAID', 'CBE-442109', 'ETB', now() - interval '3 days', 'BKG-2026-000107', 'MODERATE', NULL, NULL, NULL, NULL
);

INSERT INTO booking_status_history (booking_id, from_status, to_status, source, actor_id, reason, created_at) VALUES
('e0000000-0000-4000-8000-000000000001', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000001', 'Booking request submitted.', now() - interval '5 hours'),
('e0000000-0000-4000-8000-000000000002', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000002', 'Booking request submitted.', now() - interval '2 days'),
('e0000000-0000-4000-8000-000000000002', 'PENDING', 'CONFIRMED', 'HOST', 'b0000000-0000-4000-8000-000000000002', 'Host accepted the request and confirmed the lake transfer.', now() - interval '46 hours'),
('e0000000-0000-4000-8000-000000000003', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000001', 'Booking request submitted.', now() - interval '1 day'),
('e0000000-0000-4000-8000-000000000003', 'PENDING', 'CONFIRMED', 'HOST', 'b0000000-0000-4000-8000-000000000001', 'Host accepted.', now() - interval '20 hours'),
('e0000000-0000-4000-8000-000000000004', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000002', 'Booking request submitted.', now() - interval '20 days'),
('e0000000-0000-4000-8000-000000000004', 'PENDING', 'CONFIRMED', 'HOST', 'b0000000-0000-4000-8000-000000000001', 'Host accepted.', now() - interval '19 days'),
('e0000000-0000-4000-8000-000000000004', 'CONFIRMED', 'COMPLETED', 'SYSTEM', NULL, 'Check-out date passed.', now() - interval '12 days'),
('e0000000-0000-4000-8000-000000000005', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000001', 'Booking request submitted.', now() - interval '28 days'),
('e0000000-0000-4000-8000-000000000005', 'PENDING', 'CANCELLED', 'GUEST', 'c0000000-0000-4000-8000-000000000001', 'Family emergency meant the trip had to move.', now() - interval '26 days'),
('e0000000-0000-4000-8000-000000000006', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000002', 'Booking request submitted.', now() - interval '1 day'),
('e0000000-0000-4000-8000-000000000007', NULL, 'PENDING', 'GUEST', 'c0000000-0000-4000-8000-000000000001', 'Booking request submitted.', now() - interval '4 days'),
('e0000000-0000-4000-8000-000000000007', 'PENDING', 'CONFIRMED', 'HOST', 'b0000000-0000-4000-8000-000000000002', 'Host accepted.', now() - interval '3 days');

INSERT INTO booking_cancellation_requests (id, booking_id, source, requested_by_id, reason, status, policy_tier, estimated_refund_amount, currency, policy_preview, created_at, updated_at)
VALUES (
  'e1000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000006',
  'GUEST',
  'c0000000-0000-4000-8000-000000000002',
  'A work trip has moved to Dire Dawa and the dates can no longer work.',
  'REQUESTED',
  'MODERATE',
  8500,
  'ETB',
  '{"policyLabel":"Moderate","policyTier":"MODERATE","refundPercent":50,"refundAmount":"8500.00","hoursUntilCheckIn":74,"currency":"ETB"}'::jsonb,
  now() - interval '2 hours',
  now() - interval '2 hours'
);

INSERT INTO availability_blocks (id, property_id, start_date, end_date, reason, source, created_by_id, created_at, updated_at)
VALUES (
  'd1000000-0000-4000-8000-000000000001',
  'd0000000-0000-4000-8000-000000000002',
  '2026-11-26',
  '2026-11-27',
  'Emergency plumbing repair between stays',
  'ADMIN',
  'a0000000-0000-4000-8000-000000000001',
  now() - interval '1 day',
  now() - interval '1 day'
);

-- Support cases
INSERT INTO cases (
  id, number, type, category, priority, severity, status, subject, description,
  requester_user_id, requester_name, requester_email, assignee_id, booking_id, property_id,
  first_response_due_at, resolution_due_at, first_responded_at, resolved_at, closed_at,
  first_response_breached_at, resolution_breached_at, escalated_at, escalation_reason,
  last_message_at, compensation_amount, compensation_currency, compensation_status,
  compensation_note, compensation_proposed_by_id, compensation_decided_by_id,
  created_by_id, created_at, updated_at
) VALUES
(
  'f0000000-0000-4000-8000-000000000001', 'CASE-2026-000101', 'COMPLAINT', 'BOOKING', 'URGENT', 'HIGH', 'OPEN',
  'Host asked us to cancel after accepting the stay',
  'The host accepted our booking three days ago and then called me directly to say the villa is not available. I have already paid in full and booked flights for four people. We need either the confirmed stay or a clear alternative.',
  'c0000000-0000-4000-8000-000000000002', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', NULL,
  'e0000000-0000-4000-8000-000000000002', 'd0000000-0000-4000-8000-000000000002',
  now() - interval '32 hours', now() - interval '8 hours', NULL, NULL, NULL,
  now() - interval '28 hours', now() - interval '7 hours', now() - interval '7 hours',
  'Resolution SLA breached while the case remained unassigned.',
  now() - interval '20 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '32 hours', now() - interval '20 hours'
),
(
  'f0000000-0000-4000-8000-000000000002', 'CASE-2026-000102', 'DISPUTE', 'PAYMENT', 'HIGH', 'MEDIUM', 'IN_PROGRESS',
  'Deposit appears to have been charged twice',
  'My Telebirr statement shows two identical deposit charges for the Hawassa loft. One of them is marked pending. I have attached the transfer confirmation and need the duplicate reviewed.',
  'c0000000-0000-4000-8000-000000000001', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'a0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000003', 'd0000000-0000-4000-8000-000000000003',
  now() - interval '8 hours', now() + interval '30 hours', now() - interval '7 hours', NULL, NULL,
  NULL, NULL, NULL, NULL,
  now() - interval '5 hours', 1200, 'ETB', 'PROPOSED',
  'A small service gesture for the payment investigation delay. Approval is operational only; finance follow-up happens outside this console.',
  'a0000000-0000-4000-8000-000000000001', NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '10 hours', now() - interval '5 hours'
),
(
  'f0000000-0000-4000-8000-000000000003', 'CASE-2026-000103', 'SUPPORT', 'BOOKING', 'NORMAL', 'MEDIUM', 'WAITING_ON_REQUESTER',
  'Need the exact check-in instructions for the penthouse',
  'The confirmation says check-in is after 3pm but I cannot find the gate number or the name of the person meeting us. Could you share the final access details?',
  'c0000000-0000-4000-8000-000000000001', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'a0000000-0000-4000-8000-000000000002',
  'e0000000-0000-4000-8000-000000000001', 'd0000000-0000-4000-8000-000000000001',
  now() - interval '12 hours', now() + interval '6 hours', now() - interval '16 hours', NULL, NULL,
  NULL, NULL, NULL, NULL,
  now() - interval '3 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '20 hours', now() - interval '3 hours'
),
(
  'f0000000-0000-4000-8000-000000000004', 'CASE-2026-000104', 'COMPLAINT', 'BOOKING', 'LOW', 'LOW', 'RESOLVED',
  'Late check-out request was declined',
  'We asked for a two-hour late check-out because our flight moved. The host declined even though the calendar showed the next night was free. We would like the decision reviewed.',
  'c0000000-0000-4000-8000-000000000002', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', 'a0000000-0000-4000-8000-000000000001',
  'e0000000-0000-4000-8000-000000000004', 'd0000000-0000-4000-8000-000000000001',
  now() - interval '72 hours', now() - interval '48 hours', now() - interval '69 hours', now() - interval '52 hours', NULL,
  NULL, NULL, NULL, NULL,
  now() - interval '52 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '3 days', now() - interval '52 hours'
),
(
  'f0000000-0000-4000-8000-000000000005', 'CASE-2026-000105', 'SAFETY', 'LISTING', 'NORMAL', 'HIGH', 'CLOSED',
  'Broken outdoor step at the Entoto house',
  'The bottom garden step has cracked and one guest caught their foot on it. Nobody was hurt, but the host should block the path or repair it before the next stay.',
  'c0000000-0000-4000-8000-000000000001', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'a0000000-0000-4000-8000-000000000001',
  NULL, 'd0000000-0000-4000-8000-000000000004',
  now() - interval '120 hours', now() - interval '96 hours', now() - interval '116 hours', now() - interval '100 hours', now() - interval '98 hours',
  NULL, NULL, NULL, NULL,
  now() - interval '100 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '5 days', now() - interval '98 hours'
),
(
  'f0000000-0000-4000-8000-000000000006', 'CASE-2026-000106', 'SAFETY', 'LISTING', 'HIGH', 'CRITICAL', 'OPEN',
  'Unsafe wiring reported at the lake villa',
  'There is a exposed wire beside the outdoor socket near the garden table. We have switched off the breaker but the host has not replied. Please treat this as urgent and keep the next guests safe.',
  'c0000000-0000-4000-8000-000000000002', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', NULL,
  NULL, 'd0000000-0000-4000-8000-000000000002',
  now() + interval '2 hours', now() + interval '18 hours', NULL, NULL, NULL,
  NULL, NULL, NULL, NULL,
  now() - interval '5 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '6 hours', now() - interval '5 hours'
),
(
  'f0000000-0000-4000-8000-000000000007', 'CASE-2026-000107', 'DISPUTE', 'REVIEW', 'NORMAL', 'MEDIUM', 'WAITING_ON_INTERNAL',
  'Guest believes a review was removed unfairly',
  'My review described a noisy construction site next door. It disappeared after the host replied. I did not use offensive language and I can send the original text.',
  'c0000000-0000-4000-8000-000000000001', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'a0000000-0000-4000-8000-000000000001',
  NULL, 'd0000000-0000-4000-8000-000000000003',
  now() - interval '14 hours', now() + interval '3 hours', now() - interval '16 hours', NULL, NULL,
  NULL, NULL, NULL, NULL,
  now() - interval '10 hours', NULL, 'ETB', 'NONE', NULL, NULL, NULL,
  'a0000000-0000-4000-8000-000000000001', now() - interval '18 hours', now() - interval '10 hours'
);

INSERT INTO case_messages (case_id, direction, channel, author_name, author_email, body, delivery_status, created_by_id, created_at) VALUES
('f0000000-0000-4000-8000-000000000001', 'INBOUND', 'EMAIL', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', 'I have called the villa twice and there is no answer. The listing still shows as confirmed in my account. Please tell me whether we should book another place.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '30 hours'),
('f0000000-0000-4000-8000-000000000001', 'INBOUND', 'EMAIL', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', 'Any update? Our flights leave in nine days and we still do not know where we are staying.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '20 hours'),
('f0000000-0000-4000-8000-000000000002', 'INBOUND', 'EMAIL', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'I can see both charges in my statement. The first one is settled and the second is still pending. I have attached the screenshot.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '9 hours'),
('f0000000-0000-4000-8000-000000000002', 'OUTBOUND', 'IN_APP', 'Sara Support', 'sara@engida.com', 'Thank you, Selam. I have the confirmation image and have asked the payments team to trace both references. No additional payment is needed while we investigate.', 'DELIVERED_IN_APP', 'a0000000-0000-4000-8000-000000000002', now() - interval '7 hours'),
('f0000000-0000-4000-8000-000000000002', 'INBOUND', 'EMAIL', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'Understood. I will not make another transfer. Please let me know if you need the bank statement as well.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '5 hours'),
('f0000000-0000-4000-8000-000000000003', 'INBOUND', 'EMAIL', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'Could you send the gate number and the name of the person who will meet us? We arrive after dark.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '19 hours'),
('f0000000-0000-4000-8000-000000000003', 'OUTBOUND', 'IN_APP', 'Sara Support', 'sara@engida.com', 'I have asked the host for the final access details and the guard’s name. I will send them here as soon as the host confirms. If you are arriving after 8pm, please use the Bole Medhanialem gate.', 'DELIVERED_IN_APP', 'a0000000-0000-4000-8000-000000000002', now() - interval '3 hours'),
('f0000000-0000-4000-8000-000000000004', 'INBOUND', 'EMAIL', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', 'The host says a late check-out is not possible, but the calendar was empty. Could you review the decision?', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '3 days'),
('f0000000-0000-4000-8000-000000000004', 'OUTBOUND', 'IN_APP', 'Engida Admin', 'admin@engida.com', 'We reviewed the calendar and the host had an early arrival booked after your stay. The decline was reasonable. We have explained the same to the host and closed the review.', 'DELIVERED_IN_APP', 'a0000000-0000-4000-8000-000000000001', now() - interval '52 hours'),
('f0000000-0000-4000-8000-000000000005', 'INBOUND', 'EMAIL', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'The bottom garden step is cracked. Nobody was hurt, but it is hard to see at night.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '5 days'),
('f0000000-0000-4000-8000-000000000005', 'OUTBOUND', 'IN_APP', 'Engida Admin', 'admin@engida.com', 'Thank you for flagging this. The host has blocked the path, booked a repair for tomorrow morning and sent a note to the next guests. We are closing this case with the safety check recorded.', 'DELIVERED_IN_APP', 'a0000000-0000-4000-8000-000000000001', now() - interval '100 hours'),
('f0000000-0000-4000-8000-000000000006', 'INBOUND', 'EMAIL', 'Daniel Mekonnen', 'daniel.mekonnen@engida.local', 'The cable is beside the outdoor socket and the casing is split. We switched off the breaker and moved the table away from it.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '5 hours'),
('f0000000-0000-4000-8000-000000000007', 'INBOUND', 'EMAIL', 'Selam Tesfaye', 'selam.tesfaye@engida.local', 'The review was factual and I can send the exact text. I would like it restored or at least an explanation.', 'LOGGED', 'a0000000-0000-4000-8000-000000000001', now() - interval '17 hours'),
('f0000000-0000-4000-8000-000000000007', 'OUTBOUND', 'IN_APP', 'Engida Admin', 'admin@engida.com', 'I have the original review text and have sent it to the moderation team for a second look. I will update you once they compare it with the listing evidence.', 'DELIVERED_IN_APP', 'a0000000-0000-4000-8000-000000000001', now() - interval '10 hours');

INSERT INTO case_notes (case_id, author_id, body, created_at) VALUES
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'Payments team confirmed the first charge is settled and the second is an authorization hold. They are tracing the hold; do not ask the guest to pay again.', now() - interval '6 hours'),
('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Checked the host calendar: a same-day arrival was already confirmed for the following night. The late check-out decline was consistent with the listing rules.', now() - interval '55 hours'),
('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'Waiting for the moderation team to compare the review text against the host’s evidence. Do not reply to the guest until that comparison is complete.', now() - interval '11 hours');

INSERT INTO case_events (case_id, actor_id, type, from_value, to_value, reason, metadata, created_at) VALUES
('f0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Case opened from a guest complaint.', '{}'::jsonb, now() - interval '32 hours'),
('f0000000-0000-4000-8000-000000000001', NULL, 'SLA_ESCALATED', NULL, NULL, 'Resolution SLA breached while the case remained unassigned.', '{"kind":"resolution"}'::jsonb, now() - interval '7 hours'),
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Case opened from a payment dispute.', '{}'::jsonb, now() - interval '10 hours'),
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'ASSIGNED', NULL, 'a0000000-0000-4000-8000-000000000002', 'Assigned to the support desk.', '{}'::jsonb, now() - interval '9 hours'),
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'STATUS_CHANGED', 'OPEN', 'IN_PROGRESS', 'Owner picked up the investigation.', '{}'::jsonb, now() - interval '8 hours'),
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000002', 'MESSAGE_SENT', NULL, 'IN_APP', 'Replied with the investigation status.', '{}'::jsonb, now() - interval '7 hours'),
('f0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'COMPENSATION_PROPOSED', NULL, 'PROPOSED', 'Proposed a service gesture for the delay.', '{}'::jsonb, now() - interval '4 hours'),
('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Case opened from a check-in support request.', '{}'::jsonb, now() - interval '20 hours'),
('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'ASSIGNED', NULL, 'a0000000-0000-4000-8000-000000000002', 'Assigned to the support desk.', '{}'::jsonb, now() - interval '18 hours'),
('f0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'STATUS_CHANGED', 'IN_PROGRESS', 'WAITING_ON_REQUESTER', 'Waiting for the host to confirm the final access details.', '{}'::jsonb, now() - interval '3 hours'),
('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Case opened from a booking complaint.', '{}'::jsonb, now() - interval '3 days'),
('f0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'STATUS_CHANGED', 'IN_PROGRESS', 'RESOLVED', 'Calendar evidence reviewed and the outcome explained.', '{}'::jsonb, now() - interval '52 hours'),
('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Safety report opened from a guest message.', '{}'::jsonb, now() - interval '5 days'),
('f0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'STATUS_CHANGED', 'IN_PROGRESS', 'CLOSED', 'Host repaired the step and blocked the path.', '{}'::jsonb, now() - interval '98 hours'),
('f0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Urgent safety report opened from a guest message.', '{}'::jsonb, now() - interval '6 hours'),
('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'CASE_CREATED', NULL, 'OPEN', 'Review dispute opened for moderation review.', '{}'::jsonb, now() - interval '18 hours'),
('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'ASSIGNED', NULL, 'a0000000-0000-4000-8000-000000000001', 'Assigned to the operations lead.', '{}'::jsonb, now() - interval '16 hours'),
('f0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'STATUS_CHANGED', 'IN_PROGRESS', 'WAITING_ON_INTERNAL', 'Waiting for moderation evidence.', '{}'::jsonb, now() - interval '10 hours');

INSERT INTO case_attachments (id, case_id, uploaded_by_id, file_name, mime_type, size_bytes, storage_key, caption, created_at)
VALUES (
  'ae000000-0000-4000-8000-000000000001',
  'f0000000-0000-4000-8000-000000000002',
  'a0000000-0000-4000-8000-000000000002',
  'telebirr-transfer-confirmation.png',
  'image/png',
  48210,
  'f0000000-0000-4000-8000-000000000002/telebirr-transfer-confirmation.png',
  'Transfer confirmation supplied by the guest for the duplicate deposit review.',
  now() - interval '9 hours'
);

INSERT INTO canned_responses (id, title, body, category, created_by_id, is_active, created_at, updated_at) VALUES
(
  'aa000000-0000-4000-8000-000000000001',
  'Request the booking reference',
  'Thank you for getting in touch. Please reply with your booking reference (it begins with BKG) and the email address on the reservation so we can look at the right stay.',
  'Booking',
  'a0000000-0000-4000-8000-000000000001',
  true,
  now() - interval '30 days',
  now() - interval '3 days'
),
(
  'aa000000-0000-4000-8000-000000000002',
  'Payment investigation acknowledgement',
  'Thank you for sending the evidence. We have passed both references to the payments team and will update you here as soon as the investigation is complete. Please do not send another payment while the review is open.',
  'Payments',
  'a0000000-0000-4000-8000-000000000001',
  true,
  now() - interval '20 days',
  now() - interval '20 days'
),
(
  'aa000000-0000-4000-8000-000000000003',
  'Safety report acknowledgement',
  'Thank you for reporting this. Please keep yourself and other guests away from the area and let us know immediately if anyone is in danger. We have alerted the host and our safety lead, and we will update you here.',
  'Safety',
  'a0000000-0000-4000-8000-000000000001',
  true,
  now() - interval '18 days',
  now() - interval '18 days'
),
(
  'aa000000-0000-4000-8000-000000000004',
  'Explain a cancellation estimate',
  'The refund preview in your cancellation request is an estimate based on the cancellation policy and the time remaining before check-in. It is not a processed refund. A member of the team will review the request and explain the next step.',
  'Cancellations',
  'a0000000-0000-4000-8000-000000000001',
  true,
  now() - interval '12 days',
  now() - interval '12 days'
);

SELECT setval('booking_reference_seq', 1000, true);
SELECT setval('case_number_seq', 1000, true);



COMMIT;
