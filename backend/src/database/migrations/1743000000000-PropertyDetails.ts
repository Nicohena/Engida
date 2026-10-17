import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Brings the property details SQL migration into the application migration
 * chain so TypeORM-managed environments receive every column used by the
 * property and host listing entities.
 */
export class PropertyDetails1743000000000 implements MigrationInterface {
  name = 'PropertyDetails1743000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "properties"
        ADD COLUMN IF NOT EXISTS "area_sqm" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "parking_spaces" INT DEFAULT 0;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
        ADD COLUMN IF NOT EXISTS "phone" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "title" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "bio" TEXT,
        ADD COLUMN IF NOT EXISTS "avatar" VARCHAR(500),
        ADD COLUMN IF NOT EXISTS "office_location" VARCHAR(150);
    `);

    await queryRunner.query(
      `INSERT INTO "amenities" ("name", "icon") VALUES
        ('Swimming Pool', 'pool'),
        ('Air Conditioning', 'ac_unit'),
        ('Security', 'security'),
        ('Elevator', 'elevator'),
        ('Fitness Center', 'fitness_center'),
        ('Wine Cellar', 'wine_bar'),
        ('Smart Home', 'smart_home'),
        ('Garden', 'yard')
       ON CONFLICT ("name") DO NOTHING`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Preserve amenity reference values and user/property data during rollback.
    // The added columns are retained because they may contain application data.
    void queryRunner;
  }
}
