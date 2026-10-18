import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingGuestCount1744000000000 implements MigrationInterface {
  name = 'BookingGuestCount1744000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "guest_count" INTEGER NOT NULL DEFAULT 1
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "bookings"
          ADD CONSTRAINT "bookings_guest_count_range"
          CHECK ("guest_count" BETWEEN 1 AND 50);
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "guest_count"`);
  }
}
