import { MigrationInterface, QueryRunner } from 'typeorm';

export class HostPayoutSettings1746000000000 implements MigrationInterface {
  name = 'HostPayoutSettings1746000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "host_profiles"
      ADD COLUMN IF NOT EXISTS "payout_provider" VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_account_name" VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_account_number" VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_phone" VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_bank_branch" VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_swift_bic" VARCHAR(50) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_email" VARCHAR(255) DEFAULT NULL,
      ADD COLUMN IF NOT EXISTS "payout_currency" VARCHAR(10) NOT NULL DEFAULT 'ETB'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "host_profiles"
      DROP COLUMN IF EXISTS "payout_provider",
      DROP COLUMN IF EXISTS "payout_account_name",
      DROP COLUMN IF EXISTS "payout_account_number",
      DROP COLUMN IF EXISTS "payout_phone",
      DROP COLUMN IF EXISTS "payout_bank_branch",
      DROP COLUMN IF EXISTS "payout_swift_bic",
      DROP COLUMN IF EXISTS "payout_email",
      DROP COLUMN IF EXISTS "payout_currency"
    `);
  }
}
