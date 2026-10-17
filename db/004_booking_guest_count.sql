-- Persist the guest count selected during a reservation request.
-- Existing bookings are backfilled as one guest.
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS guest_count INTEGER NOT NULL DEFAULT 1;

DO $$ BEGIN
  ALTER TABLE bookings
    ADD CONSTRAINT bookings_guest_count_range
    CHECK (guest_count BETWEEN 1 AND 50);
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
