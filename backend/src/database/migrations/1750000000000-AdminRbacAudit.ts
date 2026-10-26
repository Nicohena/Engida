import { MigrationInterface, QueryRunner } from 'typeorm';

export class AdminRbacAudit1750000000000 implements MigrationInterface {
  name = 'AdminRbacAudit1750000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "users_admin_role_enum" AS ENUM (
          'SUPER_ADMIN',
          'BOOKING_MANAGER',
          'SUPPORT_AGENT',
          'PROPERTY_MODERATOR',
          'FINANCE_MANAGER'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "admin_role" "users_admin_role_enum" DEFAULT NULL;
    `);

    // Existing administrators keep full access after the role split.
    await queryRunner.query(`
      UPDATE "users"
      SET "admin_role" = 'SUPER_ADMIN'
      WHERE "role" = 'ADMIN' AND "admin_role" IS NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "audit_logs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "actor_id" UUID DEFAULT NULL,
        "actor_email" VARCHAR(255) DEFAULT NULL,
        "actor_role" VARCHAR(50) DEFAULT NULL,
        "action" VARCHAR(120) NOT NULL,
        "entity_type" VARCHAR(80) NOT NULL,
        "entity_id" VARCHAR(120) DEFAULT NULL,
        "before_state" JSONB DEFAULT NULL,
        "after_state" JSONB DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "ip_address" VARCHAR(64) DEFAULT NULL,
        "user_agent" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_audit_logs_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_actor_created"
        ON "audit_logs" ("actor_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_entity"
        ON "audit_logs" ("entity_type", "entity_id");
      CREATE INDEX IF NOT EXISTS "idx_audit_logs_action_created"
        ON "audit_logs" ("action", "created_at" DESC);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_audit_logs_action_created";
      DROP INDEX IF EXISTS "idx_audit_logs_entity";
      DROP INDEX IF EXISTS "idx_audit_logs_actor_created";
      DROP TABLE IF EXISTS "audit_logs";
    `);

    await queryRunner.query(`
      ALTER TABLE "users" DROP COLUMN IF EXISTS "admin_role";
      DROP TYPE IF EXISTS "users_admin_role_enum";
    `);
  }
}
