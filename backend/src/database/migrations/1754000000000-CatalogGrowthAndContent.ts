import { MigrationInterface, QueryRunner } from 'typeorm';

export class CatalogGrowthAndContent1754000000000 implements MigrationInterface {
  name = 'CatalogGrowthAndContent1754000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Property Categories
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "property_categories" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "name_amharic" VARCHAR(150),
        "description" TEXT,
        "icon" VARCHAR(60) NOT NULL DEFAULT 'Building2',
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_property_categories_slug" ON "property_categories"("slug");
      CREATE INDEX IF NOT EXISTS "idx_property_categories_is_active" ON "property_categories"("is_active");
    `);

    // 2. Destinations
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "destinations" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" VARCHAR(100) NOT NULL UNIQUE,
        "name" VARCHAR(120) NOT NULL,
        "name_amharic" VARCHAR(150),
        "region" VARCHAR(120) NOT NULL,
        "tagline" TEXT,
        "image_url" VARCHAR(500),
        "latitude" DECIMAL(10, 6),
        "longitude" DECIMAL(10, 6),
        "is_featured" BOOLEAN NOT NULL DEFAULT false,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_destinations_slug" ON "destinations"("slug");
      CREATE INDEX IF NOT EXISTS "idx_destinations_is_featured" ON "destinations"("is_featured");
      CREATE INDEX IF NOT EXISTS "idx_destinations_is_active" ON "destinations"("is_active");
    `);

    // 3. Enhance Amenities Table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "amenity_category_enum" AS ENUM ('ESSENTIALS', 'KITCHEN', 'SAFETY', 'OUTDOOR', 'WELLNESS', 'SERVICES');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      ALTER TABLE "amenities"
        ADD COLUMN IF NOT EXISTS "name_amharic" VARCHAR(150),
        ADD COLUMN IF NOT EXISTS "category" "amenity_category_enum" DEFAULT 'ESSENTIALS',
        ADD COLUMN IF NOT EXISTS "display_order" INT DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN DEFAULT true,
        ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP;

      CREATE INDEX IF NOT EXISTS "idx_amenities_category" ON "amenities"("category");
      CREATE INDEX IF NOT EXISTS "idx_amenities_is_active" ON "amenities"("is_active");
    `);

    // 4. Coupons Table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "coupon_discount_type_enum" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "coupons" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" VARCHAR(50) NOT NULL UNIQUE,
        "description" VARCHAR(255),
        "discount_type" "coupon_discount_type_enum" NOT NULL DEFAULT 'PERCENTAGE',
        "discount_value" BIGINT NOT NULL,
        "currency" VARCHAR(10) NOT NULL DEFAULT 'ETB',
        "min_booking_amount_minor" BIGINT NOT NULL DEFAULT 0,
        "max_discount_amount_minor" BIGINT,
        "starts_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "expires_at" TIMESTAMPTZ,
        "max_redemptions" INT,
        "redemptions_count" INT NOT NULL DEFAULT 0,
        "per_user_limit" INT NOT NULL DEFAULT 1,
        "is_active" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_coupons_code" ON "coupons"("code");
      CREATE INDEX IF NOT EXISTS "idx_coupons_is_active" ON "coupons"("is_active");
    `);

    // 5. Coupon Redemptions Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "coupon_redemptions" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "coupon_id" UUID NOT NULL REFERENCES "coupons"("id") ON DELETE CASCADE,
        "user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
        "booking_id" UUID,
        "discount_amount_minor" BIGINT NOT NULL,
        "redeemed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_coupon_id" ON "coupon_redemptions"("coupon_id");
      CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_user_id" ON "coupon_redemptions"("user_id");
      CREATE INDEX IF NOT EXISTS "idx_coupon_redemptions_booking_id" ON "coupon_redemptions"("booking_id");
    `);

    // 6. FAQ Items Table
    await queryRunner.query(`
      DO $$ BEGIN
        CREATE TYPE "faq_category_enum" AS ENUM ('BOOKING', 'PAYMENTS', 'HOSTING', 'SAFETY', 'GENERAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;

      CREATE TABLE IF NOT EXISTS "faq_items" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "category" "faq_category_enum" NOT NULL DEFAULT 'GENERAL',
        "question" VARCHAR(300) NOT NULL,
        "question_amharic" VARCHAR(350),
        "answer" TEXT NOT NULL,
        "answer_amharic" TEXT,
        "display_order" INT NOT NULL DEFAULT 0,
        "is_published" BOOLEAN NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_faq_items_category" ON "faq_items"("category");
      CREATE INDEX IF NOT EXISTS "idx_faq_items_is_published" ON "faq_items"("is_published");
    `);

    // 7. Content Blocks Table
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "content_blocks" (
        "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "slug" VARCHAR(120) NOT NULL UNIQUE,
        "title" VARCHAR(255) NOT NULL,
        "content" TEXT NOT NULL,
        "meta_description" VARCHAR(300),
        "is_published" BOOLEAN NOT NULL DEFAULT true,
        "published_at" TIMESTAMPTZ,
        "last_edited_by_admin_id" UUID,
        "version" INT NOT NULL DEFAULT 1,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS "idx_content_blocks_slug" ON "content_blocks"("slug");
      CREATE INDEX IF NOT EXISTS "idx_content_blocks_is_published" ON "content_blocks"("is_published");
    `);

    // 8. Add coupon fields to Bookings
    await queryRunner.query(`
      ALTER TABLE "bookings"
        ADD COLUMN IF NOT EXISTS "coupon_code" VARCHAR(50),
        ADD COLUMN IF NOT EXISTS "discount_amount" DECIMAL(10, 2) NOT NULL DEFAULT 0;
    `);

    // 9. Initial Seed Data
    await queryRunner.query(`
      INSERT INTO "property_categories" ("slug", "name", "name_amharic", "description", "icon", "display_order", "is_active")
      VALUES
        ('villas', 'Luxury Villas', 'ቪላዎች', 'Expansive private compounds with lush gardens and dedicated security', 'Castle', 1, true),
        ('apartments', 'Modern Apartments', 'አፓርታማዎች', 'Centrally located residences tailored for urban stays and executives', 'Building2', 2, true),
        ('penthouses', 'Penthouses', 'ፔንትሃውስ', 'Panoramic skyline vistas, bespoke interiors, and private terrace spaces', 'Sparkles', 3, true),
        ('eco-lodges', 'Eco Lodges', 'የተፈጥሮ ሎጆች', 'Sustainable architectural sanctuaries nested in mountains and nature', 'Trees', 4, true),
        ('lakefront', 'Lakefront Stays', 'የሐይቅ ዳር ማረፊያዎች', 'Waterfront villas, lakeside balconies, and tranquil crater views', 'Waves', 5, true),
        ('traditional', 'Traditional Homes', 'ባህላዊ ቤቶች', 'Heritage-rich Ethiopian architecture with artisanal touches and courtyards', 'Home', 6, true)
      ON CONFLICT ("slug") DO NOTHING;

      INSERT INTO "destinations" ("slug", "name", "name_amharic", "region", "tagline", "image_url", "latitude", "longitude", "is_featured", "display_order", "is_active")
      VALUES
        ('addis-ababa', 'Addis Ababa', 'አዲስ አበባ', 'Shewa / Central', 'The diplomatic heartbeat, mountain breezes, and rich architectural culture', 'https://images.unsplash.com/photo-1576085898323-218337e3e43c?auto=format&fit=crop&w=1200&q=80', 9.030000, 38.740000, true, 1, true),
        ('bishoftu', 'Bishoftu', 'ቢሾፍቱ', 'Oromia / Rift Valley', 'Volcanic crater lakes, tranquil resorts, and weekend escapes 45 mins away', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?auto=format&fit=crop&w=1200&q=80', 8.750000, 38.980000, true, 2, true),
        ('hawassa', 'Hawassa', 'ሐዋሳ', 'Sidama', 'Sunlit lakeside boulevards, fresh tilapia markets, and botanical wonders', 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1200&q=80', 7.050000, 38.480000, true, 3, true),
        ('bahir-dar', 'Bahir Dar', 'ባሕር ዳር', 'Amhara / Lake Tana', 'Monastic island sanctuaries and the dramatic Blue Nile waterfalls', 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=1200&q=80', 11.590000, 37.390000, true, 4, true),
        ('lalibela', 'Lalibela', 'ላሊበላ', 'Amhara / Lasta', 'Extraordinary 12th-century rock-hewn monolithic churches and highlands', 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1200&q=80', 12.030000, 39.040000, true, 5, true)
      ON CONFLICT ("slug") DO NOTHING;

      INSERT INTO "coupons" ("code", "description", "discount_type", "discount_value", "currency", "min_booking_amount_minor", "max_discount_amount_minor", "starts_at", "max_redemptions", "per_user_limit", "is_active")
      VALUES
        ('WELCOME10', 'Welcome gift: 10% discount on your first curated stay', 'PERCENTAGE', 10, 'ETB', 200000, 250000, CURRENT_TIMESTAMP, 500, 1, true),
        ('ENGIDA500', 'Special promotional ETB 500 flat discount for weekend getaways', 'FIXED_AMOUNT', 50000, 'ETB', 300000, NULL, CURRENT_TIMESTAMP, 200, 1, true)
      ON CONFLICT ("code") DO NOTHING;

      INSERT INTO "content_blocks" ("slug", "title", "content", "meta_description", "is_published", "published_at")
      VALUES
        ('terms-and-conditions', 'ENGIDA Platform Terms & Rental Agreement', '## 1. Introduction\nWelcome to ENGIDA ("Guest" in Amharic). By using our architectural marketplace, you agree to these transparent booking terms and hospitality commitments.\n\n## 2. Booking & Escrow\nAll guest payments are held securely in double-entry escrow clearing and are released to verified hosts 24 hours post-check-in.\n\n## 3. Host Integrity\nHosts guarantee accurate representation of amenities, security protocols, and cancellation conditions.', 'Official terms and conditions for ENGIDA property rental marketplace.', true, CURRENT_TIMESTAMP),
        ('privacy-policy', 'Privacy & Data Protection Policy', '## 1. Respect for Personal Information\nENGIDA stores personal identifiers in strict adherence to data protection standards. Sensitive host banking information is encrypted using industry-standard AES-256-GCM.\n\n## 2. Audit Trail\nAll administrative actions involving personal data undergo cryptographic append-only audit logging.', 'Comprehensive privacy and data protection policies for ENGIDA.', true, CURRENT_TIMESTAMP),
        ('rental-guidelines', 'Guest & Host Hospitality Guidelines', '## The Spirit of Engida (እንግዳ)\nIn Ethiopian culture, a guest is treated with reverence and dignity. We expect all travelers and hosts to uphold mutual respect, cultural awareness, and clear communication.', 'Hospitality standards and community expectations across the ENGIDA ecosystem.', true, CURRENT_TIMESTAMP)
      ON CONFLICT ("slug") DO NOTHING;

      INSERT INTO "faq_items" ("category", "question", "question_amharic", "answer", "answer_amharic", "display_order", "is_published")
      VALUES
        ('BOOKING', 'How does the reservation inquiry and confirmation process work?', 'የቦታ ማስያዝ እና ማረጋገጫ ሂደት እንዴት ይሰራል?', 'Select your preferred dates and guest count. Once submitted, your reservation quote is locked and bound server-side. Once confirmed and paid, booking confirmation is sent via in-app alert and email.', 'የተመረጡትን ቀናት እና የእንግዶች ቁጥር ይምረጡ። ክፍያው እንደተፈጸመ ማረጋገጫ በኢሜይል እና በመተግበሪያው ይደርስዎታል።', 1, true),
        ('PAYMENTS', 'Is my payment protected in escrow until check-in?', 'ክፍያዬ እስከ መግቢያዬ ቀን ድረስ በአስተማማኝ ሁኔታ ተጠብቆ ይቆያል?', 'Yes. ENGIDA uses automated escrow holding. Funds are never released to the host until 24 hours after your successful check-in, ensuring complete peace of mind.', 'አዎ! እንግዳ የክፍያ ጥበቃ ሥርዓት (Escrow) ይጠቀማል። ገንዘቡ ለአስተናጋጁ የሚለቀቀው በተሳካ ሁኔታ ከገቡ ከ24 ሰዓት በኋላ ብቻ ነው።', 2, true),
        ('HOSTING', 'What documentation is required to list a property as a verified host?', 'በእንግዳ ላይ ንብረት ለማከራየት ምን ዓይነት ሰነዶች ያስፈልጋሉ?', 'We require a valid national Fayda ID or passport, proof of property authorization or ownership, and high-resolution verified photographs of the space.', 'የፋይዳ ብሔራዊ መታወቂያ ወይም ፓስፖርት፣ የባለቤትነት ወይም የማከራየት ፈቃድ ማስረጃ፣ እና ጥራት ያላቸው ፎቶዎች ያስፈልጋሉ።', 3, true),
        ('SAFETY', 'What should I do if a property does not match its description?', 'ቦታው ከተገለጸው መግለጫ ጋር ካልተዛመደ ምን ማድረግ አለብኝ?', 'You can report an issue immediately through the support portal or booking details page. Our safety team holds host escrow release while an investigation is conducted.', 'በቦታው ዝርዝር ገጽ ወይም በድጋፍ መስጫው በኩል ወዲያውኑ ሪፖርት ማድረግ ይችላሉ። የደህንነት ቡድናችን ጉዳዩ እስኪጣራ ክፍያውን ይይዛል።', 4, true)
      ON CONFLICT DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "bookings" DROP COLUMN IF EXISTS "discount_amount", DROP COLUMN IF EXISTS "coupon_code";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "content_blocks";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "faq_items";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "faq_category_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupon_redemptions";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "coupons";`);
    await queryRunner.query(`DROP TYPE IF EXISTS "coupon_discount_type_enum";`);
    await queryRunner.query(`
      ALTER TABLE "amenities"
        DROP COLUMN IF EXISTS "updated_at",
        DROP COLUMN IF EXISTS "created_at",
        DROP COLUMN IF EXISTS "is_active",
        DROP COLUMN IF EXISTS "display_order",
        DROP COLUMN IF EXISTS "category",
        DROP COLUMN IF EXISTS "name_amharic";
    `);
    await queryRunner.query(`DROP TYPE IF EXISTS "amenity_category_enum";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "destinations";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "property_categories";`);
  }
}
