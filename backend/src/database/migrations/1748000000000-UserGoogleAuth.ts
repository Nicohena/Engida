import { MigrationInterface, QueryRunner } from 'typeorm';

export class UserGoogleAuth1748000000000 implements MigrationInterface {
  name = 'UserGoogleAuth1748000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Google-only accounts have no password, so the column becomes optional.
    await queryRunner.query(`
      ALTER TABLE "users"
      ALTER COLUMN "password_hash" DROP NOT NULL;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "auth_provider" VARCHAR(20) NOT NULL DEFAULT 'LOCAL',
      ADD COLUMN IF NOT EXISTS "provider_id" VARCHAR(255);
    `);

    // One external identity may only be linked to a single account.
    // NULL provider_id rows (local accounts) are not affected by this index.
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_users_provider_identity"
      ON "users" ("auth_provider", "provider_id");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Google-only accounts cannot be represented without a password column value.
    await queryRunner.query(`
      UPDATE "users"
      SET "password_hash" = '$2b$12$K3JNi5wq8l0F0JQd0X6XhOQKcQ0vK1sM0X9p1B2c3D4e5F6g7H8i9J'
      WHERE "password_hash" IS NULL;
    `);

    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_users_provider_identity";
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "provider_id",
      DROP COLUMN IF EXISTS "auth_provider",
      ALTER COLUMN "password_hash" SET NOT NULL;
    `);
  }
}
