import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingsAndCases1752000000000 implements MigrationInterface {
  name = 'BookingsAndCases1752000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── Booking references, cancellation metadata and policy ──────────────
    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "booking_reference_seq";
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "reference" VARCHAR(32),
      ADD COLUMN IF NOT EXISTS "cancellation_policy" VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
      ADD COLUMN IF NOT EXISTS "cancelled_by_id" UUID DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "cancelled_by_type" VARCHAR(20) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "cancelled_at" TIMESTAMPTZ DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "cancellation_reason" TEXT DEFAULT NULL;
    `);

    await queryRunner.query(`
      WITH ordered AS (
        SELECT
          "id",
          ROW_NUMBER() OVER (ORDER BY "created_at" ASC, "id" ASC) AS row_number,
          TO_CHAR(COALESCE("created_at", now()), 'YYYY') AS year
        FROM "bookings"
        WHERE "reference" IS NULL
      )
      UPDATE "bookings" booking
      SET "reference" = 'BKG-' || ordered.year || '-' || LPAD(ordered.row_number::text, 6, '0')
      FROM ordered
      WHERE booking."id" = ordered."id";
    `);

    await queryRunner.query(`
      SELECT setval(
        'booking_reference_seq',
        GREATEST((SELECT COUNT(*) FROM "bookings"), 1),
        (SELECT COUNT(*) FROM "bookings") > 0
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings" ALTER COLUMN "reference" SET NOT NULL;
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_bookings_reference" ON "bookings" ("reference");
      CREATE INDEX IF NOT EXISTS "idx_bookings_status_created" ON "bookings" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_bookings_guest_created" ON "bookings" ("guest_id", "created_at" DESC);
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "bookings"
          ADD CONSTRAINT "fk_bookings_cancelled_by"
          FOREIGN KEY ("cancelled_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ── Booking status history ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_status_history" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "from_status" VARCHAR(20) DEFAULT NULL,
        "to_status" VARCHAR(20) NOT NULL,
        "source" VARCHAR(20) NOT NULL DEFAULT 'SYSTEM',
        "actor_id" UUID DEFAULT NULL,
        "reason" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_booking_status_history_booking"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_booking_status_history_actor"
          FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_booking_status_history_booking_created"
        ON "booking_status_history" ("booking_id", "created_at" ASC);
    `);

    // ── Cancellation requests ──────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cancellation_request_status_enum" AS ENUM (
          'REQUESTED', 'APPROVED', 'REJECTED', 'WITHDRAWN'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "cancellation_request_source_enum" AS ENUM (
          'GUEST', 'HOST', 'ADMIN'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "booking_cancellation_requests" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "source" "cancellation_request_source_enum" NOT NULL DEFAULT 'ADMIN',
        "requested_by_id" UUID DEFAULT NULL,
        "reason" TEXT NOT NULL,
        "status" "cancellation_request_status_enum" NOT NULL DEFAULT 'REQUESTED',
        "policy_tier" VARCHAR(20) NOT NULL DEFAULT 'MODERATE',
        "estimated_refund_amount" NUMERIC(10,2) NOT NULL DEFAULT 0,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'ETB',
        "policy_preview" JSONB DEFAULT NULL,
        "decided_by_id" UUID DEFAULT NULL,
        "decided_at" TIMESTAMPTZ DEFAULT NULL,
        "decision_note" TEXT DEFAULT NULL,
        "idempotency_key" VARCHAR(255) DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_booking_cancellation_requests_booking"
          FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_booking_cancellation_requests_requested_by"
          FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_booking_cancellation_requests_decided_by"
          FOREIGN KEY ("decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_booking_cancellation_requests_booking"
        ON "booking_cancellation_requests" ("booking_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_booking_cancellation_requests_status"
        ON "booking_cancellation_requests" ("status", "created_at" DESC);
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_booking_cancellation_requests_idempotency"
        ON "booking_cancellation_requests" ("idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);

    // ── Availability blocks: provenance for admin-created blocks ───────────
    await queryRunner.query(`
      ALTER TABLE "availability_blocks"
      ADD COLUMN IF NOT EXISTS "source" VARCHAR(20) NOT NULL DEFAULT 'HOST',
      ADD COLUMN IF NOT EXISTS "created_by_id" UUID DEFAULT NULL;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "availability_blocks"
          ADD CONSTRAINT "fk_availability_blocks_created_by"
          FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL;
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    // ── Cases ──────────────────────────────────────────────────────────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_type_enum" AS ENUM (
          'COMPLAINT', 'DISPUTE', 'SAFETY', 'SUPPORT', 'CANCELLATION'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_category_enum" AS ENUM (
          'BOOKING', 'LISTING', 'ACCOUNT', 'REVIEW', 'PAYMENT', 'OTHER'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_priority_enum" AS ENUM (
          'LOW', 'NORMAL', 'HIGH', 'URGENT'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_severity_enum" AS ENUM (
          'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_status_enum" AS ENUM (
          'OPEN', 'IN_PROGRESS', 'WAITING_ON_REQUESTER',
          'WAITING_ON_INTERNAL', 'RESOLVED', 'CLOSED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_compensation_status_enum" AS ENUM (
          'NONE', 'PROPOSED', 'APPROVED', 'REJECTED'
        );
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE SEQUENCE IF NOT EXISTS "case_number_seq";
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "cases" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "number" VARCHAR(32) NOT NULL UNIQUE,
        "type" "case_type_enum" NOT NULL,
        "category" "case_category_enum" NOT NULL DEFAULT 'OTHER',
        "priority" "case_priority_enum" NOT NULL DEFAULT 'NORMAL',
        "severity" "case_severity_enum" NOT NULL DEFAULT 'MEDIUM',
        "status" "case_status_enum" NOT NULL DEFAULT 'OPEN',
        "subject" VARCHAR(255) NOT NULL,
        "description" TEXT NOT NULL,
        "requester_user_id" UUID DEFAULT NULL,
        "requester_name" VARCHAR(255) NOT NULL,
        "requester_email" VARCHAR(255) DEFAULT NULL,
        "assignee_id" UUID DEFAULT NULL,
        "booking_id" UUID DEFAULT NULL,
        "property_id" UUID DEFAULT NULL,
        "report_id" UUID DEFAULT NULL,
        "context" JSONB DEFAULT NULL,
        "first_response_due_at" TIMESTAMPTZ NOT NULL,
        "resolution_due_at" TIMESTAMPTZ NOT NULL,
        "first_responded_at" TIMESTAMPTZ DEFAULT NULL,
        "resolved_at" TIMESTAMPTZ DEFAULT NULL,
        "closed_at" TIMESTAMPTZ DEFAULT NULL,
        "first_response_breached_at" TIMESTAMPTZ DEFAULT NULL,
        "resolution_breached_at" TIMESTAMPTZ DEFAULT NULL,
        "escalated_at" TIMESTAMPTZ DEFAULT NULL,
        "escalation_reason" TEXT DEFAULT NULL,
        "last_message_at" TIMESTAMPTZ DEFAULT NULL,
        "compensation_amount" NUMERIC(10,2) DEFAULT NULL,
        "compensation_currency" VARCHAR(10) NOT NULL DEFAULT 'ETB',
        "compensation_status" "case_compensation_status_enum" NOT NULL DEFAULT 'NONE',
        "compensation_note" TEXT DEFAULT NULL,
        "compensation_proposed_by_id" UUID DEFAULT NULL,
        "compensation_decided_by_id" UUID DEFAULT NULL,
        "compensation_decided_at" TIMESTAMPTZ DEFAULT NULL,
        "created_by_id" UUID DEFAULT NULL,
        "idempotency_key" VARCHAR(255) DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_cases_requester_user" FOREIGN KEY ("requester_user_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_assignee" FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_report" FOREIGN KEY ("report_id") REFERENCES "reports"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_compensation_proposed_by" FOREIGN KEY ("compensation_proposed_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_compensation_decided_by" FOREIGN KEY ("compensation_decided_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_cases_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_cases_status_created" ON "cases" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_cases_assignee_status" ON "cases" ("assignee_id", "status");
      CREATE INDEX IF NOT EXISTS "idx_cases_booking" ON "cases" ("booking_id");
      CREATE INDEX IF NOT EXISTS "idx_cases_due" ON "cases" ("resolution_due_at");
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_cases_idempotency"
        ON "cases" ("idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);

    // ── Case messages, notes, attachments, events, canned replies ─────────
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_message_direction_enum" AS ENUM ('OUTBOUND', 'INBOUND');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_message_channel_enum" AS ENUM ('IN_APP', 'EMAIL', 'PHONE', 'SYSTEM');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "case_message_delivery_enum" AS ENUM ('DELIVERED_IN_APP', 'LOGGED', 'FAILED');
      EXCEPTION WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_messages" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_id" UUID NOT NULL,
        "direction" "case_message_direction_enum" NOT NULL,
        "channel" "case_message_channel_enum" NOT NULL DEFAULT 'IN_APP',
        "author_name" VARCHAR(255) NOT NULL,
        "author_email" VARCHAR(255) DEFAULT NULL,
        "body" TEXT NOT NULL,
        "delivery_status" "case_message_delivery_enum" NOT NULL DEFAULT 'LOGGED',
        "created_by_id" UUID DEFAULT NULL,
        "idempotency_key" VARCHAR(255) DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_case_messages_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_case_messages_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_case_messages_case_created"
        ON "case_messages" ("case_id", "created_at" ASC);
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_case_messages_idempotency"
        ON "case_messages" ("case_id", "idempotency_key")
        WHERE "idempotency_key" IS NOT NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_notes" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_id" UUID NOT NULL,
        "author_id" UUID DEFAULT NULL,
        "body" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_case_notes_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_case_notes_author" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_case_notes_case_created"
        ON "case_notes" ("case_id", "created_at" ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_attachments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_id" UUID NOT NULL,
        "uploaded_by_id" UUID DEFAULT NULL,
        "file_name" VARCHAR(255) NOT NULL,
        "mime_type" VARCHAR(120) NOT NULL,
        "size_bytes" INTEGER NOT NULL,
        "storage_key" TEXT NOT NULL,
        "caption" VARCHAR(500) DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_case_attachments_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_case_attachments_uploaded_by" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_case_attachments_case_created"
        ON "case_attachments" ("case_id", "created_at" ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "case_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "case_id" UUID NOT NULL,
        "actor_id" UUID DEFAULT NULL,
        "type" VARCHAR(60) NOT NULL,
        "from_value" VARCHAR(120) DEFAULT NULL,
        "to_value" VARCHAR(120) DEFAULT NULL,
        "reason" TEXT DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_case_events_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_case_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_case_events_case_created"
        ON "case_events" ("case_id", "created_at" ASC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "canned_responses" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "title" VARCHAR(160) NOT NULL,
        "body" TEXT NOT NULL,
        "category" VARCHAR(80) DEFAULT NULL,
        "created_by_id" UUID DEFAULT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_canned_responses_created_by" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_canned_responses_active"
        ON "canned_responses" ("is_active", "title");
    `);

    // ── Notification vocabulary for support work ──────────────────────────
    await queryRunner.query(`
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'CASE_ASSIGNED';
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'CASE_REPLY';
      ALTER TYPE "notification_type_enum" ADD VALUE IF NOT EXISTS 'CASE_ESCALATED';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP TABLE IF EXISTS "canned_responses";
      DROP TABLE IF EXISTS "case_events";
      DROP TABLE IF EXISTS "case_attachments";
      DROP TABLE IF EXISTS "case_notes";
      DROP TABLE IF EXISTS "case_messages";
      DROP TABLE IF EXISTS "cases";
      DROP SEQUENCE IF EXISTS "case_number_seq";
      DROP TYPE IF EXISTS "case_message_delivery_enum";
      DROP TYPE IF EXISTS "case_message_channel_enum";
      DROP TYPE IF EXISTS "case_message_direction_enum";
      DROP TYPE IF EXISTS "case_compensation_status_enum";
      DROP TYPE IF EXISTS "case_status_enum";
      DROP TYPE IF EXISTS "case_severity_enum";
      DROP TYPE IF EXISTS "case_priority_enum";
      DROP TYPE IF EXISTS "case_category_enum";
      DROP TYPE IF EXISTS "case_type_enum";
    `);

    await queryRunner.query(`
      ALTER TABLE "availability_blocks" DROP CONSTRAINT IF EXISTS "fk_availability_blocks_created_by";
      ALTER TABLE "availability_blocks"
        DROP COLUMN IF EXISTS "created_by_id",
        DROP COLUMN IF EXISTS "source";
    `);

    await queryRunner.query(`
      DROP TABLE IF EXISTS "booking_cancellation_requests";
      DROP TYPE IF EXISTS "cancellation_request_source_enum";
      DROP TYPE IF EXISTS "cancellation_request_status_enum";
      DROP TABLE IF EXISTS "booking_status_history";
      DROP TABLE IF EXISTS "booking_status_history";
    `);

    await queryRunner.query(`
      ALTER TABLE "bookings" DROP CONSTRAINT IF EXISTS "fk_bookings_cancelled_by";
      DROP INDEX IF EXISTS "idx_bookings_guest_created";
      DROP INDEX IF EXISTS "idx_bookings_status_created";
      DROP INDEX IF EXISTS "uq_bookings_reference";
      ALTER TABLE "bookings"
        DROP COLUMN IF EXISTS "cancellation_reason",
        DROP COLUMN IF EXISTS "cancelled_at",
        DROP COLUMN IF EXISTS "cancelled_by_type",
        DROP COLUMN IF EXISTS "cancelled_by_id",
        DROP COLUMN IF EXISTS "cancellation_policy",
        DROP COLUMN IF EXISTS "reference";
      DROP SEQUENCE IF EXISTS "booking_reference_seq";
    `);
  }
}
