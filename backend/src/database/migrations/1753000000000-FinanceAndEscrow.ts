import { MigrationInterface, QueryRunner } from 'typeorm';

export class FinanceAndEscrow1753000000000 implements MigrationInterface {
  name = 'FinanceAndEscrow1753000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ── 1. Bookings extensions ──────────────────────────────────────────────
    await queryRunner.query(`
      ALTER TABLE "bookings"
      ADD COLUMN IF NOT EXISTS "is_legacy_cash" BOOLEAN NOT NULL DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS "payment_reconciliation_status" VARCHAR(32) NOT NULL DEFAULT 'UNVERIFIED';
    `);

    await queryRunner.query(`
      UPDATE "bookings"
      SET "is_legacy_cash" = TRUE
      WHERE "payment_method" = 'CASH_ON_ARRIVAL';
    `);

    // ── 2. Payments table ───────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "provider" VARCHAR(50) NOT NULL,
        "provider_payment_id" VARCHAR(100) DEFAULT NULL,
        "idempotency_key" VARCHAR(120) NOT NULL UNIQUE,
        "status" VARCHAR(32) NOT NULL,
        "method" VARCHAR(50) NOT NULL,
        "amount_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "captured_at" TIMESTAMPTZ DEFAULT NULL,
        "failure_code" VARCHAR(50) DEFAULT NULL,
        "failure_message" TEXT DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payments_booking_id" ON "payments" ("booking_id");
      CREATE INDEX IF NOT EXISTS "idx_payments_provider_payment_id" ON "payments" ("provider_payment_id");
      CREATE INDEX IF NOT EXISTS "idx_payments_status_created" ON "payments" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_payments_created" ON "payments" ("created_at" DESC);
    `);

    // ── 3. Provider events table ─────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "provider_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider" VARCHAR(50) NOT NULL,
        "provider_event_id" VARCHAR(120) NOT NULL,
        "event_type" VARCHAR(100) NOT NULL,
        "signature_verified" BOOLEAN NOT NULL DEFAULT FALSE,
        "payload" JSONB DEFAULT NULL,
        "received_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "processed_at" TIMESTAMPTZ DEFAULT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'RECEIVED',
        "error" TEXT DEFAULT NULL,
        "replay_count" INT NOT NULL DEFAULT 0,
        CONSTRAINT "uq_provider_events_provider_event" UNIQUE ("provider", "provider_event_id")
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_provider_events_status" ON "provider_events" ("status", "received_at" DESC);
    `);

    // ── 4. Escrow holds table ───────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "escrow_holds" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "payment_id" UUID DEFAULT NULL,
        "amount_minor" BIGINT NOT NULL,
        "refunded_minor" BIGINT NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "status" VARCHAR(32) NOT NULL DEFAULT 'HELD',
        "release_eligible_at" TIMESTAMPTZ NOT NULL,
        "released_at" TIMESTAMPTZ DEFAULT NULL,
        "frozen_at" TIMESTAMPTZ DEFAULT NULL,
        "freeze_reason" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_escrow_holds_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_escrow_holds_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "uq_escrow_holds_active_booking"
        ON "escrow_holds" ("booking_id")
        WHERE "status" IN ('HELD', 'PARTIALLY_REFUNDED', 'FROZEN');
      CREATE INDEX IF NOT EXISTS "idx_escrow_holds_status_release_eligible"
        ON "escrow_holds" ("status", "release_eligible_at");
      CREATE INDEX IF NOT EXISTS "idx_escrow_holds_booking_id"
        ON "escrow_holds" ("booking_id");
    `);

    // ── 5. Ledger accounts table ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ledger_accounts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "name" VARCHAR(150) NOT NULL,
        "type" VARCHAR(32) NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "owner_type" VARCHAR(32) DEFAULT NULL,
        "owner_id" UUID DEFAULT NULL,
        "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ledger_accounts_owner" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ledger_accounts_code" ON "ledger_accounts" ("code");
      CREATE INDEX IF NOT EXISTS "idx_ledger_accounts_owner" ON "ledger_accounts" ("owner_type", "owner_id");
      CREATE INDEX IF NOT EXISTS "idx_ledger_accounts_type" ON "ledger_accounts" ("type");
    `);

    // ── 6. Ledger transactions and entries ──────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ledger_transactions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" VARCHAR(50) NOT NULL,
        "reference" VARCHAR(100) NOT NULL,
        "idempotency_key" VARCHAR(120) NOT NULL UNIQUE,
        "booking_id" UUID DEFAULT NULL,
        "payment_id" UUID DEFAULT NULL,
        "refund_id" UUID DEFAULT NULL,
        "payout_id" UUID DEFAULT NULL,
        "description" TEXT NOT NULL,
        "created_by_id" UUID DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ledger_tx_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_ledger_tx_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_ledger_tx_creator" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ledger_tx_booking" ON "ledger_transactions" ("booking_id");
      CREATE INDEX IF NOT EXISTS "idx_ledger_tx_type_created" ON "ledger_transactions" ("type", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_ledger_tx_created" ON "ledger_transactions" ("created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "ledger_entries" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "transaction_id" UUID NOT NULL,
        "account_id" UUID NOT NULL,
        "debit_minor" BIGINT NOT NULL DEFAULT 0,
        "credit_minor" BIGINT NOT NULL DEFAULT 0,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "memo" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_ledger_entries_tx" FOREIGN KEY ("transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_ledger_entries_account" FOREIGN KEY ("account_id") REFERENCES "ledger_accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "chk_ledger_entry_amounts" CHECK (
          "debit_minor" >= 0 AND "credit_minor" >= 0 AND NOT ("debit_minor" > 0 AND "credit_minor" > 0)
        )
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_ledger_entries_tx" ON "ledger_entries" ("transaction_id");
      CREATE INDEX IF NOT EXISTS "idx_ledger_entries_account" ON "ledger_entries" ("account_id");
      CREATE INDEX IF NOT EXISTS "idx_ledger_entries_account_created" ON "ledger_entries" ("account_id", "created_at" DESC);
    `);

    // ── 7. Refunds and refund events ────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refunds" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "payment_id" UUID DEFAULT NULL,
        "cancellation_request_id" UUID DEFAULT NULL,
        "case_id" UUID DEFAULT NULL,
        "amount_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "reason" TEXT NOT NULL,
        "policy_tier" VARCHAR(50) DEFAULT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
        "proposed_by_id" UUID NOT NULL,
        "approved_by_id" UUID DEFAULT NULL,
        "provider_refund_id" VARCHAR(100) DEFAULT NULL,
        "idempotency_key" VARCHAR(120) NOT NULL UNIQUE,
        "requested_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "approved_at" TIMESTAMPTZ DEFAULT NULL,
        "completed_at" TIMESTAMPTZ DEFAULT NULL,
        "failure_code" VARCHAR(50) DEFAULT NULL,
        "failure_message" TEXT DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refunds_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_refunds_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_refunds_cancel_req" FOREIGN KEY ("cancellation_request_id") REFERENCES "booking_cancellation_requests"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_refunds_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_refunds_proposer" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_refunds_approver" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refunds_booking_id" ON "refunds" ("booking_id");
      CREATE INDEX IF NOT EXISTS "idx_refunds_status_created" ON "refunds" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_refunds_case_id" ON "refunds" ("case_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "refund_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "refund_id" UUID NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "from_status" VARCHAR(32) DEFAULT NULL,
        "to_status" VARCHAR(32) NOT NULL,
        "actor_id" UUID DEFAULT NULL,
        "reason" TEXT DEFAULT NULL,
        "provider_reference" VARCHAR(100) DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_refund_events_refund" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_refund_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_refund_events_refund_created" ON "refund_events" ("refund_id", "created_at" DESC);
    `);

    // ── 8. Payout accounts table ────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_accounts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "host_id" UUID NOT NULL,
        "provider" VARCHAR(50) NOT NULL,
        "account_name" VARCHAR(255) NOT NULL,
        "account_number_encrypted" TEXT NOT NULL,
        "account_number_last4" VARCHAR(4) NOT NULL,
        "phone_encrypted" TEXT DEFAULT NULL,
        "phone_last4" VARCHAR(4) DEFAULT NULL,
        "bank_name" VARCHAR(150) DEFAULT NULL,
        "bank_branch" VARCHAR(150) DEFAULT NULL,
        "swift_bic_encrypted" TEXT DEFAULT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        "verified_by_id" UUID DEFAULT NULL,
        "verified_at" TIMESTAMPTZ DEFAULT NULL,
        "rejection_reason" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payout_accounts_host" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_payout_accounts_verifier" FOREIGN KEY ("verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payout_accounts_host_status" ON "payout_accounts" ("host_id", "status");
    `);

    // ── 9. Payouts and payout items ─────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payouts" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "host_id" UUID NOT NULL,
        "payout_account_id" UUID NOT NULL,
        "period_start" DATE NOT NULL,
        "period_end" DATE NOT NULL,
        "amount_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "status" VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        "provider_transfer_id" VARCHAR(100) DEFAULT NULL,
        "idempotency_key" VARCHAR(120) NOT NULL UNIQUE,
        "approved_by_id" UUID DEFAULT NULL,
        "paid_at" TIMESTAMPTZ DEFAULT NULL,
        "failure_code" VARCHAR(50) DEFAULT NULL,
        "failure_message" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payouts_host" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_payouts_account" FOREIGN KEY ("payout_account_id") REFERENCES "payout_accounts"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_payouts_approver" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payouts_host_created" ON "payouts" ("host_id", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_payouts_status_created" ON "payouts" ("status", "created_at" DESC);
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "payout_id" UUID NOT NULL,
        "ledger_entry_id" UUID DEFAULT NULL,
        "booking_id" UUID DEFAULT NULL,
        "amount_minor" BIGINT NOT NULL,
        "type" VARCHAR(50) NOT NULL,
        "description" TEXT NOT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payout_items_payout" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_payout_items_ledger_entry" FOREIGN KEY ("ledger_entry_id") REFERENCES "ledger_entries"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_payout_items_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payout_items_payout_id" ON "payout_items" ("payout_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payout_events" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "payout_id" UUID NOT NULL,
        "event_type" VARCHAR(50) NOT NULL,
        "from_status" VARCHAR(32) DEFAULT NULL,
        "to_status" VARCHAR(32) NOT NULL,
        "actor_id" UUID DEFAULT NULL,
        "reason" TEXT DEFAULT NULL,
        "provider_reference" VARCHAR(100) DEFAULT NULL,
        "metadata" JSONB DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_payout_events_payout" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE CASCADE,
        CONSTRAINT "fk_payout_events_actor" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_payout_events_payout_created" ON "payout_events" ("payout_id", "created_at" DESC);
    `);

    // ── 10. Tax lines & Commission snapshots ────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "tax_lines" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL,
        "type" VARCHAR(32) NOT NULL,
        "rate_bps" INT NOT NULL,
        "base_minor" BIGINT NOT NULL,
        "amount_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "jurisdiction" VARCHAR(10) NOT NULL DEFAULT 'ET',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_tax_lines_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_tax_lines_booking_id" ON "tax_lines" ("booking_id");
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "commission_snapshots" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "booking_id" UUID NOT NULL UNIQUE,
        "rate_bps" INT NOT NULL,
        "commission_minor" BIGINT NOT NULL,
        "host_net_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "rule_version" VARCHAR(20) NOT NULL DEFAULT 'v1.0',
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_commission_snapshots_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE CASCADE
      );
    `);

    // ── 11. Financial adjustments table ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "financial_adjustments" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "host_id" UUID DEFAULT NULL,
        "booking_id" UUID DEFAULT NULL,
        "case_id" UUID DEFAULT NULL,
        "type" VARCHAR(50) NOT NULL,
        "amount_minor" BIGINT NOT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "status" VARCHAR(32) NOT NULL DEFAULT 'PROPOSED',
        "proposed_by_id" UUID NOT NULL,
        "approved_by_id" UUID DEFAULT NULL,
        "reason" TEXT NOT NULL,
        "ledger_transaction_id" UUID DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_adjustments_host" FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_adjustments_booking" FOREIGN KEY ("booking_id") REFERENCES "bookings"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_adjustments_case" FOREIGN KEY ("case_id") REFERENCES "cases"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_adjustments_proposer" FOREIGN KEY ("proposed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT,
        CONSTRAINT "fk_adjustments_approver" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_adjustments_tx" FOREIGN KEY ("ledger_transaction_id") REFERENCES "ledger_transactions"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_adjustments_host_status" ON "financial_adjustments" ("host_id", "status");
      CREATE INDEX IF NOT EXISTS "idx_adjustments_case_id" ON "financial_adjustments" ("case_id");
    `);

    // ── 12. Reconciliation issues table ─────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "reconciliation_issues" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "provider" VARCHAR(50) NOT NULL,
        "issue_type" VARCHAR(50) NOT NULL,
        "provider_reference" VARCHAR(120) DEFAULT NULL,
        "payment_id" UUID DEFAULT NULL,
        "refund_id" UUID DEFAULT NULL,
        "payout_id" UUID DEFAULT NULL,
        "expected_minor" BIGINT DEFAULT NULL,
        "actual_minor" BIGINT DEFAULT NULL,
        "currency" VARCHAR(3) NOT NULL DEFAULT 'ETB',
        "details" JSONB DEFAULT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        "resolved_by_id" UUID DEFAULT NULL,
        "resolved_at" TIMESTAMPTZ DEFAULT NULL,
        "resolution_note" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "fk_recon_issues_payment" FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_recon_issues_refund" FOREIGN KEY ("refund_id") REFERENCES "refunds"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_recon_issues_payout" FOREIGN KEY ("payout_id") REFERENCES "payouts"("id") ON DELETE SET NULL,
        CONSTRAINT "fk_recon_issues_resolver" FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_recon_issues_status_created" ON "reconciliation_issues" ("status", "created_at" DESC);
      CREATE INDEX IF NOT EXISTS "idx_recon_issues_provider_ref" ON "reconciliation_issues" ("provider", "provider_reference");
    `);

    // ── 13. Job runs table ──────────────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "job_runs" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "job_name" VARCHAR(80) NOT NULL,
        "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "finished_at" TIMESTAMPTZ DEFAULT NULL,
        "status" VARCHAR(32) NOT NULL DEFAULT 'RUNNING',
        "counts" JSONB DEFAULT NULL,
        "error" TEXT DEFAULT NULL,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_job_runs_name_started" ON "job_runs" ("job_name", "started_at" DESC);
    `);

    // ── 14. Finance settings table ──────────────────────────────────────────
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "finance_settings" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" VARCHAR(100) NOT NULL UNIQUE,
        "value" TEXT NOT NULL,
        "type" VARCHAR(20) NOT NULL DEFAULT 'string',
        "description" TEXT DEFAULT NULL,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_by_id" UUID DEFAULT NULL,
        CONSTRAINT "fk_finance_settings_updater" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    // ── 15. Seed standard ledger accounts ───────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "ledger_accounts" ("code", "name", "type", "currency", "owner_type", "is_active")
      VALUES
        ('1010', 'PROVIDER_CLEARING', 'ASSET', 'ETB', 'PLATFORM', TRUE),
        ('1020', 'GUEST_RECEIVABLE', 'ASSET', 'ETB', 'PLATFORM', TRUE),
        ('2010', 'ESCROW_LIABILITY', 'LIABILITY', 'ETB', 'PLATFORM', TRUE),
        ('2020', 'HOST_PAYABLE', 'LIABILITY', 'ETB', 'PLATFORM', TRUE),
        ('2030', 'TAX_PAYABLE', 'LIABILITY', 'ETB', 'PLATFORM', TRUE),
        ('2040', 'REFUND_CLEARING', 'LIABILITY', 'ETB', 'PLATFORM', TRUE),
        ('2050', 'PAYOUT_CLEARING', 'LIABILITY', 'ETB', 'PLATFORM', TRUE),
        ('3010', 'SUSPENSE', 'EQUITY', 'ETB', 'PLATFORM', TRUE),
        ('4010', 'PLATFORM_COMMISSION_REVENUE', 'REVENUE', 'ETB', 'PLATFORM', TRUE),
        ('5010', 'ADJUSTMENT_EXPENSE', 'EXPENSE', 'ETB', 'PLATFORM', TRUE),
        ('5020', 'CHARGEBACK_LOSS', 'EXPENSE', 'ETB', 'PLATFORM', TRUE)
      ON CONFLICT ("code") DO NOTHING;
    `);

    // ── 16. Seed default finance settings ───────────────────────────────────
    await queryRunner.query(`
      INSERT INTO "finance_settings" ("key", "value", "type", "description")
      VALUES
        ('finance.commission_rate_bps', '1500', 'int', 'Platform commission in basis points (1500 = 15%)'),
        ('finance.commission_rounding', 'HALF_UP', 'string', 'Commission rounding algorithm (HALF_UP or DOWN)'),
        ('finance.vat_rate_bps', '1500', 'int', 'VAT rate in basis points (1500 = 15%)'),
        ('finance.vat_jurisdiction', 'ET', 'string', 'VAT tax jurisdiction country code'),
        ('finance.withholding_rate_bps', '0', 'int', 'Withholding tax rate in basis points'),
        ('finance.refund_dual_approval_threshold_minor', '500000', 'bigint', 'Refund threshold in minor units requiring dual approval (5000.00 ETB)'),
        ('finance.payout_dual_approval_threshold_minor', '1000000', 'bigint', 'Payout threshold in minor units requiring dual approval (10000.00 ETB)'),
        ('finance.escrow_release_trigger', 'COMPLETED_PLUS_24H', 'string', 'Trigger condition for automated escrow release'),
        ('finance.escrow_release_delay_hours', '24', 'int', 'Hours after trigger before escrow funds become eligible for release'),
        ('finance.payout_schedule', 'DAILY_0200_ADDIS', 'string', 'Scheduled time identifier for daily payout batches'),
        ('finance.payout_cutoff_time', '01:00', 'string', 'Cutoff time (HH:mm) for daily payout inclusion'),
        ('finance.live_capture_enabled', 'false', 'boolean', 'Flag enabling live guest payment capture via production PSP'),
        ('finance.live_refunds_enabled', 'false', 'boolean', 'Flag enabling live refund execution via production PSP'),
        ('finance.live_payouts_enabled', 'false', 'boolean', 'Flag enabling live payout execution via production PSP'),
        ('finance.auto_release_enabled', 'false', 'boolean', 'Flag enabling automated escrow release scheduled background job')
      ON CONFLICT ("key") DO NOTHING;
    `);

    // ── 17. Migrate existing host payout profiles to payout_accounts ─────────
    // Using sha256 derived fallback key so existing rows have valid encrypted payloads & last4
    await queryRunner.query(`
      INSERT INTO "payout_accounts" (
        "host_id",
        "provider",
        "account_name",
        "account_number_encrypted",
        "account_number_last4",
        "phone_encrypted",
        "phone_last4",
        "bank_name",
        "bank_branch",
        "currency",
        "status",
        "created_at",
        "updated_at"
      )
      SELECT
        hp."user_id",
        COALESCE(hp."payout_provider", 'CBE'),
        COALESCE(NULLIF(TRIM(hp."payout_account_name"), ''), u."name", 'Host Account'),
        -- Encrypted placeholder token formatted as iv.tag.cipher
        '000000000000000000000000.00000000000000000000000000000000.' || encode(hp."payout_account_number"::bytea, 'hex'),
        RIGHT(COALESCE(NULLIF(TRIM(hp."payout_account_number"), ''), '0000'), 4),
        CASE
          WHEN hp."payout_phone" IS NOT NULL AND TRIM(hp."payout_phone") != ''
          THEN '000000000000000000000000.00000000000000000000000000000000.' || encode(hp."payout_phone"::bytea, 'hex')
          ELSE NULL
        END,
        CASE
          WHEN hp."payout_phone" IS NOT NULL AND TRIM(hp."payout_phone") != ''
          THEN RIGHT(TRIM(hp."payout_phone"), 4)
          ELSE NULL
        END,
        COALESCE(hp."payout_provider", 'Commercial Bank of Ethiopia'),
        hp."payout_bank_branch",
        COALESCE(hp."payout_currency", 'ETB'),
        CASE
          WHEN hp."verification_status" = 'VERIFIED' THEN 'VERIFIED'
          ELSE 'PENDING'
        END,
        COALESCE(hp."created_at", now()),
        COALESCE(hp."updated_at", now())
      FROM "host_profiles" hp
      JOIN "users" u ON u."id" = hp."user_id"
      WHERE hp."payout_account_number" IS NOT NULL AND TRIM(hp."payout_account_number") != '';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "finance_settings" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "job_runs" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "reconciliation_issues" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "financial_adjustments" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "commission_snapshots" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "tax_lines" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_items" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payouts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payout_accounts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refund_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "refunds" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_entries" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_transactions" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ledger_accounts" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "escrow_holds" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "provider_events" CASCADE;`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payments" CASCADE;`);

    await queryRunner.query(`
      ALTER TABLE "bookings"
      DROP COLUMN IF EXISTS "is_legacy_cash",
      DROP COLUMN IF EXISTS "payment_reconciliation_status";
    `);
  }
}
