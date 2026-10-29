import { MigrationInterface, QueryRunner } from 'typeorm';

export class PricingIntelligenceAndFeedback1754000000000 implements MigrationInterface {
  name = 'PricingIntelligenceAndFeedback1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create enum for host recommendation action if it doesn't exist
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "host_recommendation_action_enum" AS ENUM ('PENDING', 'ACCEPTED', 'MODIFIED', 'REJECTED');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    // 2. Create price_recommendation_logs table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "price_recommendation_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "property_id" uuid DEFAULT NULL,
        "host_id" uuid DEFAULT NULL,
        "listing_type" varchar(20) NOT NULL DEFAULT 'RENTAL',
        "property_type" varchar(50) NOT NULL,
        "city" varchar(100) NOT NULL,
        "sub_city" varchar(100) DEFAULT NULL,
        "neighborhood" varchar(150) DEFAULT NULL,
        "input_features" jsonb NOT NULL DEFAULT '{}'::jsonb,
        "recommended_price" decimal(14,2) NOT NULL,
        "price_range_min" decimal(14,2) NOT NULL,
        "price_range_max" decimal(14,2) NOT NULL,
        "confidence" decimal(4,3) NOT NULL,
        "confidence_level" varchar(20) NOT NULL DEFAULT 'MEDIUM',
        "confidence_explanation" text DEFAULT NULL,
        "valuation_source" varchar(60) NOT NULL DEFAULT 'market_calibrated_hedonic',
        "comparable_evidence" jsonb DEFAULT NULL,
        "seasonal_adjustment" jsonb DEFAULT NULL,
        "host_action" "host_recommendation_action_enum" NOT NULL DEFAULT 'PENDING',
        "chosen_price" decimal(14,2) DEFAULT NULL,
        "feedback_reason" text DEFAULT NULL,
        "was_booked" boolean NOT NULL DEFAULT false,
        "actual_booking_price" decimal(14,2) DEFAULT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "feedback_at" timestamptz DEFAULT NULL
      );
    `);

    // 3. Create indexes
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "idx_rec_logs_property_id" ON "price_recommendation_logs" ("property_id");
      CREATE INDEX IF NOT EXISTS "idx_rec_logs_host_id" ON "price_recommendation_logs" ("host_id");
      CREATE INDEX IF NOT EXISTS "idx_rec_logs_city" ON "price_recommendation_logs" ("city");
      CREATE INDEX IF NOT EXISTS "idx_rec_logs_created_at" ON "price_recommendation_logs" ("created_at");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "price_recommendation_logs" CASCADE;`);
    await queryRunner.query(`DROP TYPE IF EXISTS "host_recommendation_action_enum";`);
  }
}

