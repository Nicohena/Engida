import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  Index,
} from 'typeorm';
import { CouponRedemption } from './coupon-redemption.entity';

export enum CouponDiscountType {
  PERCENTAGE = 'PERCENTAGE',
  FIXED_AMOUNT = 'FIXED_AMOUNT',
}

@Entity('coupons')
@Index('idx_coupons_code', ['code'], { unique: true })
@Index('idx_coupons_is_active', ['isActive'])
export class Coupon {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  description: string | null;

  @Column({
    type: 'enum',
    enum: CouponDiscountType,
    default: CouponDiscountType.PERCENTAGE,
    name: 'discount_type',
  })
  discountType: CouponDiscountType;

  /**
   * For PERCENTAGE: integer between 1 and 100 (e.g. 15 for 15%).
   * For FIXED_AMOUNT: minor units (e.g. 50000 = 500 ETB).
   */
  @Column({ type: 'bigint', name: 'discount_value' })
  discountValue: number;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  currency: string;

  @Column({ type: 'bigint', default: 0, name: 'min_booking_amount_minor' })
  minBookingAmountMinor: number;

  @Column({ type: 'bigint', nullable: true, name: 'max_discount_amount_minor' })
  maxDiscountAmountMinor: number | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP', name: 'starts_at' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'expires_at' })
  expiresAt: Date | null;

  @Column({ type: 'int', nullable: true, name: 'max_redemptions' })
  maxRedemptions: number | null;

  @Column({ type: 'int', default: 0, name: 'redemptions_count' })
  redemptionsCount: number;

  @Column({ type: 'int', default: 1, name: 'per_user_limit' })
  perUserLimit: number;

  @Column({ type: 'boolean', default: true, name: 'is_active' })
  isActive: boolean;

  @OneToMany(() => CouponRedemption, (redemption) => redemption.coupon)
  redemptions: CouponRedemption[];

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
