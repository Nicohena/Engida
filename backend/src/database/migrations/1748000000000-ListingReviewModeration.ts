import { MigrationInterface, QueryRunner } from 'typeorm';

export class ListingReviewModeration1748000000000 implements MigrationInterface {
  name = 'ListingReviewModeration1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums if not exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE review_submission_type_enum AS ENUM ('INITIAL_PUBLISH', 'IMPORTANT_EDIT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE review_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Add moderation columns to properties
    await queryRunner.query(`
      ALTER TABLE "properties"
      ADD COLUMN IF NOT EXISTS "admin_hidden" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "admin_hidden_reason" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "admin_hidden_at" TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "admin_hidden_by_id" UUID DEFAULT NULL;
    `);

    // 3. Create listing_reviews table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "listing_reviews" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "property_id" UUID NOT NULL,
        "submission_type" review_submission_type_enum NOT NULL,
        "status" review_status_enum NOT NULL DEFAULT 'PENDING',
        "proposed_changes" JSONB DEFAULT NULL,
        "submitted_by_host_id" UUID NOT NULL,
        "submitted_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "reviewed_by_admin_id" UUID DEFAULT NULL,
        "reviewed_at" TIMESTAMPTZ DEFAULT NULL,
        "rejection_reason" TEXT DEFAULT NULL,
        "version" INT NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_listing_reviews_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_listing_reviews_submitted_by" FOREIGN KEY ("submitted_by_host_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_listing_reviews_reviewed_by" FOREIGN KEY ("reviewed_by_admin_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // 4. Create Indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_properties_admin_hidden" ON "properties" ("admin_hidden");
      CREATE INDEX IF NOT EXISTS "idx_listing_reviews_property_id" ON "listing_reviews" ("property_id");
      CREATE INDEX IF NOT EXISTS "idx_listing_reviews_status" ON "listing_reviews" ("status");
      CREATE INDEX IF NOT EXISTS "idx_listing_reviews_submission_type" ON "listing_reviews" ("submission_type");
      CREATE INDEX IF NOT EXISTS "idx_listing_reviews_submitted_by" ON "listing_reviews" ("submitted_by_host_id");
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_pending_review_per_property" ON "listing_reviews" ("property_id") WHERE "status" = 'PENDING';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_unique_pending_review_per_property";
      DROP INDEX IF EXISTS "idx_listing_reviews_submitted_by";
      DROP INDEX IF EXISTS "idx_listing_reviews_submission_type";
      DROP INDEX IF EXISTS "idx_listing_reviews_status";
      DROP INDEX IF EXISTS "idx_listing_reviews_property_id";
      DROP TABLE IF EXISTS "listing_reviews";
      DROP INDEX IF EXISTS "idx_properties_admin_hidden";
      ALTER TABLE "properties"
      DROP COLUMN IF EXISTS "admin_hidden_by_id",
      DROP COLUMN IF EXISTS "admin_hidden_at",
      DROP COLUMN IF EXISTS "admin_hidden_reason",
      DROP COLUMN IF EXISTS "admin_hidden";
      DROP TYPE IF EXISTS "review_status_enum";
      DROP TYPE IF EXISTS "review_submission_type_enum";
    `);
  }
}
