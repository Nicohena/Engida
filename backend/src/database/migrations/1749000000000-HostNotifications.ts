import { MigrationInterface, QueryRunner } from 'typeorm';

export class HostNotifications1749000000000 implements MigrationInterface {
  name = 'HostNotifications1749000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE notification_type_enum AS ENUM (
          'BOOKING_REQUESTED',
          'BOOKING_CONFIRMED',
          'BOOKING_CANCELLED',
          'BOOKING_COMPLETED',
          'LISTING_APPROVED',
          'LISTING_REJECTED'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "notifications" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL,
        "type" notification_type_enum NOT NULL,
        "title" VARCHAR(255) NOT NULL,
        "message" TEXT NOT NULL,
        "link" VARCHAR(255) DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "is_read" BOOLEAN NOT NULL DEFAULT false,
        "idempotency_key" VARCHAR(255) DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_notifications_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_created_at" ON "notifications" ("user_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_notifications_user_id_is_read" ON "notifications" ("user_id", "is_read");
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_notifications_user_idempotency" ON "notifications" ("user_id", "idempotency_key") WHERE "idempotency_key" IS NOT NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_notifications_user_idempotency";
      DROP INDEX IF EXISTS "idx_notifications_user_id_is_read";
      DROP INDEX IF EXISTS "idx_notifications_user_id_created_at";
      DROP TABLE IF EXISTS "notifications";
      DROP TYPE IF EXISTS "notification_type_enum";
    `);
  }
}
