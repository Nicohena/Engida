import { MigrationInterface, QueryRunner } from 'typeorm';

export class SystemSettingsAndPhase5175500000000 implements MigrationInterface {
  name = 'SystemSettingsAndPhase5175500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "system_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(120) NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "category" VARCHAR(40) NOT NULL DEFAULT 'GENERAL',
        "type" VARCHAR(20) NOT NULL DEFAULT 'string',
        "description" TEXT,
        "is_public" BOOLEAN NOT NULL DEFAULT false,
        "updated_by_id" UUID REFERENCES "users"("id") ON DELETE SET NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_system_settings_key" ON "system_settings"("key");
      CREATE INDEX IF NOT EXISTS "idx_system_settings_category" ON "system_settings"("category");
    `);

    // Seed default configuration parameters
    await queryRunner.query(`
      INSERT INTO "system_settings" ("key", "value", "category", "type", "description", "is_public")
      VALUES
        ('maintenance.enabled', 'false', 'GENERAL', 'boolean', 'Master toggle to put the marketplace in maintenance mode', true),
        ('maintenance.banner_message', 'ENGIDA is undergoing brief scheduled maintenance. Booking operations will resume shortly.', 'GENERAL', 'string', 'Public banner notification message displayed to users during maintenance', true),
        ('bookings.default_check_in_time', '15:00', 'BOOKINGS', 'string', 'Default check-in time for listings when unspecified', true),
        ('bookings.default_check_out_time', '11:00', 'BOOKINGS', 'string', 'Default check-out time for listings when unspecified', true),
        ('bookings.min_lead_hours', '2', 'BOOKINGS', 'number', 'Minimum hours of advance notice required before check-in', false),
        ('bookings.max_advance_days', '365', 'BOOKINGS', 'number', 'Maximum number of calendar days in advance guests can book', false),
        ('bookings.instant_book_default', 'true', 'BOOKINGS', 'boolean', 'Default instant booking preference enabled for newly published listings', false),
        ('finance.platform_service_fee_percent', '12', 'FINANCE', 'number', 'Standard platform take-rate percentage deducted from gross booking quote', false),
        ('finance.tax_vat_percent', '15', 'FINANCE', 'number', 'Applicable value-added tax rate percentage for services in Ethiopia', false),
        ('finance.min_payout_amount_etb', '500', 'FINANCE', 'number', 'Minimum host payout threshold in ETB required for automated batch clearing', false),
        ('finance.auto_payout_cutoff_time', '02:00', 'FINANCE', 'string', 'Scheduled Addis Ababa timezone batch execution time for host disbursement', false),
        ('localization.default_currency', 'ETB', 'LOCALIZATION', 'string', 'Default monetary currency code for catalog pricing and ledger operations', true),
        ('localization.supported_currencies', '["ETB", "USD"]', 'LOCALIZATION', 'json', 'JSON list of currencies accepted for guest payment conversions', true),
        ('localization.default_timezone', 'Africa/Addis_Ababa', 'LOCALIZATION', 'string', 'Default regional timezone used for calendar cutoffs and cron schedules', true),
        ('notifications.sms_enabled', 'true', 'NOTIFICATIONS', 'boolean', 'Enable automated SMS transactional dispatches for booking confirmations and OTPs', false),
        ('notifications.email_enabled', 'true', 'NOTIFICATIONS', 'boolean', 'Enable transactional email delivery for reservation receipts and host alerts', false),
        ('notifications.support_email', 'support@engida.com', 'NOTIFICATIONS', 'string', 'Official support contact address shown to guests and hosts', true),
        ('security.session_timeout_minutes', '1440', 'SECURITY', 'number', 'Administrative console inactivity timeout in minutes (24 hours default)', false),
        ('security.max_login_attempts', '5', 'SECURITY', 'number', 'Maximum failed login attempts before temporary exponential backoff', false)
      ON CONFLICT ("key") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "system_settings";`);
  }
}
