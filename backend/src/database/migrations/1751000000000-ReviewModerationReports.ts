import { MigrationInterface, QueryRunner } from 'typeorm';

export class ReviewModerationReports1751000000000 implements MigrationInterface {
  name = 'ReviewModerationReports1751000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reviews_moderation_status_enum" AS ENUM ('VISIBLE', 'HIDDEN');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "reviews"
      ADD COLUMN IF NOT EXISTS "moderation_status" "reviews_moderation_status_enum" NOT NULL DEFAULT 'VISIBLE',
      ADD COLUMN IF NOT EXISTS "moderation_reason" TEXT DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "moderated_by_id" UUID DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "moderated_at" TIMESTAMPTZ DEFAULT NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "reviews"
          ADD CONSTRAINT "fk_reviews_moderated_by"
          FOREIGN KEY ("moderated_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reviews_moderation_status"
        ON "reviews" ("moderation_status");
    `);

    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'REVIEW_HIDDEN';
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'REVIEW_RESTORED';
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_target_type_enum" AS ENUM ('LISTING', 'REVIEW');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_reason_enum" AS ENUM (
          'SCAM',
          'MISREPRESENTATION',
          'SAFETY',
          'OFFENSIVE',
          'SPAM',
          'OTHER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "reports_status_enum" AS ENUM (
          'OPEN',
          'INVESTIGATING',
          'RESOLVED',
          'DISMISSED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reports" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "target_type" "reports_target_type_enum" NOT NULL,
        "target_id" UUID NOT NULL,
        "reporter_id" UUID DEFAULT NULL,
        "reporter_email" VARCHAR(255) DEFAULT NULL,
        "reason" "reports_reason_enum" NOT NULL,
        "details" TEXT DEFAULT NULL,
        "status" "reports_status_enum" NOT NULL DEFAULT 'OPEN',
        "resolution_note" TEXT DEFAULT NULL,
        "resolved_by_id" UUID DEFAULT NULL,
        "resolved_at" TIMESTAMPTZ DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_reports_reporter" FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_reports_resolved_by" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_reports_status_created"
        ON "reports" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_reports_target"
        ON "reports" ("target_type", "target_id");
      CREATE INDEX IF NOT EXISTS "idx_reports_reporter_created"
        ON "reports" ("reporter_id", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_reports_reporter_created";
      DROP INDEX IF EXISTS "idx_reports_target";
      DROP INDEX IF EXISTS "idx_reports_status_created";
      DROP TABLE IF EXISTS "reports";
      DROP TYPE IF EXISTS "reports_status_enum";
      DROP TYPE IF EXISTS "reports_reason_enum";
      DROP TYPE IF EXISTS "reports_target_type_enum";
    `);

    // PostgreSQL cannot remove individual enum values cheaply. The two
    // notification types are harmless if the down migration leaves them in place.

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_reviews_moderation_status";
      ALTER TABLE "reviews" DROP CONSTRAINT IF EXISTS "fk_reviews_moderated_by";
      ALTER TABLE "reviews"
        DROP COLUMN IF EXISTS "moderated_at",
        DROP COLUMN IF EXISTS "moderated_by_id",
        DROP COLUMN IF EXISTS "moderation_reason",
        DROP COLUMN IF EXISTS "moderation_status";
      DROP TYPE IF EXISTS "reviews_moderation_status_enum";
    `);
  }
}
