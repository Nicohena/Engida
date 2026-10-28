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
  })
  discountType: CouponDiscountType;

  /**
   * For PERCENTAGE: integer between 1 and 100 (e.g. 15 for 15%).
   * For FIXED_AMOUNT: minor units (e.g. 50000 = 500 ETB).
   */
  @Column({ type: 'bigint' })
  discountValue: number;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  currency: string;

  @Column({ type: 'bigint', default: 0 })
  minBookingAmountMinor: number;

  @Column({ type: 'bigint', nullable: true })
  maxDiscountAmountMinor: number | null;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  startsAt: Date;

  @Column({ type: 'timestamptz', nullable: true })
  expiresAt: Date | null;

  @Column({ type: 'int', nullable: true })
  maxRedemptions: number | null;

  @Column({ type: 'int', default: 0 })
  redemptionsCount: number;

  @Column({ type: 'int', default: 1 })
  perUserLimit: number;

  @Column({ type: 'boolean', default: true })
  isActive: boolean;

  @OneToMany(() => CouponRedemption, (redemption) => redemption.coupon)
  redemptions: CouponRedemption[];

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt: Date;
}
