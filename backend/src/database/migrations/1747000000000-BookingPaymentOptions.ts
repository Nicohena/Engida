import { MigrationInterface, QueryRunner } from 'typeorm';

export class BookingPaymentOptions1747000000000 implements MigrationInterface {
  name = 'BookingPaymentOptions1747000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "payment_method" VARCHAR(50) DEFAULT 'CASH_ON_ARRIVAL',
      ADD COLUMN IF NOT EXISTS "payment_status" VARCHAR(50) DEFAULT 'PENDING',
      ADD COLUMN IF NOT EXISTS "payment_reference" VARCHAR(100),
      ADD COLUMN IF NOT EXISTS "payment_currency" VARCHAR(10) DEFAULT 'ETB',
      ADD COLUMN IF NOT EXISTS "paid_at" TIMESTAMPTZ;
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_bookings_payment_status" ON "bookings"("payment_status");
      CREATE INDEX IF NOT EXISTS "idx_bookings_payment_method" ON "bookings"("payment_method");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DROP INDEX IF EXISTS "idx_bookings_payment_method";
      DROP INDEX IF EXISTS "idx_bookings_payment_status";
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "paid_at",
      DROP COLUMN IF EXISTS "payment_currency",
      DROP COLUMN IF EXISTS "payment_reference",
      DROP COLUMN IF EXISTS "payment_status",
      DROP COLUMN IF EXISTS "payment_method";
    `);
  }
}
