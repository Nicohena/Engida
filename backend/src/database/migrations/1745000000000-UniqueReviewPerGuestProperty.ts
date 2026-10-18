import { MigrationInterface, QueryRunner } from 'typeorm';

export class UniqueReviewPerGuestProperty1745000000000 implements MigrationInterface {
  name = 'UniqueReviewPerGuestProperty1745000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM "reviews"
          GROUP BY "property_id", "user_id"
          HAVING COUNT(*) > 1
        ) THEN
          RAISE EXCEPTION 'Cannot enforce one review per guest and property: duplicate review rows exist';
        END IF;
      END $$;
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "idx_reviews_property_user_unique"
      ON "reviews" ("property_id", "user_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_reviews_property_user_unique"`);
  }
}
