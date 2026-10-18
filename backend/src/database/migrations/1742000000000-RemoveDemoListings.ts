import { MigrationInterface, QueryRunner } from 'typeorm';

const SEEDED_HOST_ID = 'b0000000-0000-0000-0000-000000000002';
const SEEDED_HOST_EMAIL = 'abebe@engida.com';
const DEMO_PROPERTY_IDS = [
  'c0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000001',
  'd0000000-0000-0000-0000-000000000002',
  'd0000000-0000-0000-0000-000000000003',
  'd0000000-0000-0000-0000-000000000004',
  'd0000000-0000-0000-0000-000000000005',
  'd0000000-0000-0000-0000-000000000006',
  'd0000000-0000-0000-0000-000000000007',
  'd0000000-0000-0000-0000-000000000008',
  'd0000000-0000-0000-0000-000000000009',
  'd0000000-0000-0000-0000-000000000010',
  'd0000000-0000-0000-0000-000000000011',
];

export class RemoveDemoListings1742000000000 implements MigrationInterface {
  name = 'RemoveDemoListings1742000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "properties" AS property
       WHERE property."id" = ANY($1::uuid[])
         AND property."host_id" = $2
         AND NOT EXISTS (
           SELECT 1 FROM "bookings" booking WHERE booking."property_id" = property."id"
         )
         AND NOT EXISTS (
           SELECT 1 FROM "reviews" review WHERE review."property_id" = property."id"
         )`,
      [DEMO_PROPERTY_IDS, SEEDED_HOST_ID],
    );

    await queryRunner.query(
      `DELETE FROM "users" AS sample_user
       WHERE sample_user."id" = $1
         AND sample_user."email" = $2
         AND sample_user."role" = 'USER'
         AND NOT EXISTS (SELECT 1 FROM "properties" property WHERE property."host_id" = sample_user."id")
         AND NOT EXISTS (SELECT 1 FROM "host_profiles" profile WHERE profile."user_id" = sample_user."id")
         AND NOT EXISTS (SELECT 1 FROM "bookings" booking WHERE booking."guest_id" = sample_user."id")
         AND NOT EXISTS (SELECT 1 FROM "reviews" review WHERE review."user_id" = sample_user."id")
         AND NOT EXISTS (SELECT 1 FROM "refresh_tokens" token WHERE token."user_id" = sample_user."id")`,
      [SEEDED_HOST_ID, SEEDED_HOST_EMAIL],
    );
  }

  public async down(): Promise<void> {
    // Removed sample content is intentionally not restored by a rollback.
  }
}
