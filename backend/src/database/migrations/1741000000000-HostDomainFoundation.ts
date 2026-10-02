import { MigrationInterface, QueryRunner } from 'typeorm';

export class HostDomainFoundation1741000000000 implements MigrationInterface {
  name = 'HostDomainFoundation1741000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Enums if they do not exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "host_verification_status_enum" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "listing_type_enum" AS ENUM ('RENTAL', 'SALE');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "listing_status_enum" AS ENUM ('DRAFT', 'PUBLISHED', 'PAUSED', 'SOLD', 'ARCHIVED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create host_profiles table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "host_profiles" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "user_id" UUID NOT NULL UNIQUE,
        "display_name" VARCHAR(255),
        "bio" TEXT,
        "phone" VARCHAR(50),
        "verification_status" "host_verification_status_enum" NOT NULL DEFAULT 'UNVERIFIED',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_host_profiles_user" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_host_profiles_user_id" ON "host_profiles"("user_id");
    `);

    // 3. Extend properties table with host/sale/location fields
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN IF NOT EXISTS "listing_type" "listing_type_enum" NOT NULL DEFAULT 'RENTAL',
        ADD COLUMN IF NOT EXISTS "status" "listing_status_enum" NOT NULL DEFAULT 'PUBLISHED',
        ADD COLUMN IF NOT EXISTS "sale_price" DECIMAL(14, 2),
        ADD COLUMN IF NOT EXISTS "region" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "zone" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "sub_city" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "woreda" VARCHAR(100),
        ADD COLUMN IF NOT EXISTS "neighborhood" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "latitude" DECIMAL(10, 8),
        ADD COLUMN IF NOT EXISTS "longitude" DECIMAL(11, 8);
    `);

    // Backfill existing rows to ensure default values
    await queryRunner.query(`
      UPDATE "properties"
      SET "listing_type" = 'RENTAL'
      WHERE "listing_type" IS NULL;
    `);

    await queryRunner.query(`
      UPDATE "properties"
      SET "status" = 'PUBLISHED'
      WHERE "status" IS NULL;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_properties_listing_type" ON "properties"("listing_type");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_properties_status" ON "properties"("status");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_properties_sub_city" ON "properties"("sub_city");
    `);

    // 4. Create availability_blocks table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "availability_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "property_id" UUID NOT NULL,
        "start_date" DATE NOT NULL,
        "end_date" DATE NOT NULL,
        "reason" VARCHAR(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "fk_availability_blocks_property" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE CASCADE,
        CONSTRAINT "chk_availability_dates" CHECK ("end_date" > "start_date")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_availability_blocks_property_id" ON "availability_blocks"("property_id");
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_availability_blocks_property_dates" ON "availability_blocks"("property_id", "start_date", "end_date");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // 1. Drop availability_blocks table
    await queryRunner.query(`DROP TABLE IF EXISTS "availability_blocks" CASCADE;`);

    // 2. Drop properties columns and indexes
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_properties_sub_city";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_properties_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_properties_listing_type";`);

    await queryRunner.query(`
      ALTER TABLE "properties"
        DROP COLUMN IF EXISTS "longitude",
        DROP COLUMN IF EXISTS "latitude",
        DROP COLUMN IF EXISTS "neighborhood",
        DROP COLUMN IF EXISTS "woreda",
        DROP COLUMN IF EXISTS "sub_city",
        DROP COLUMN IF EXISTS "zone",
        DROP COLUMN IF EXISTS "region",
        DROP COLUMN IF EXISTS "sale_price",
        DROP COLUMN IF EXISTS "status",
        DROP COLUMN IF EXISTS "listing_type";
    `);

    await queryRunner.query(`DROP TYPE IF EXISTS "listing_status_enum" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "listing_type_enum" CASCADE;`);

    // 3. Drop host_profiles table
    await queryRunner.query(`DROP TABLE IF EXISTS "host_profiles" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "host_verification_status_enum" CASCADE;`);
  }
}
