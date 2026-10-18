-- Preserve existing review rows. This migration intentionally stops if duplicate
-- guest/property pairs need a data owner to resolve them before uniqueness applies.
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM reviews
    GROUP BY property_id, user_id
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'Cannot enforce one review per guest and property: duplicate review rows exist';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_property_user_unique
  ON reviews(property_id, user_id);
