import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Coupon } from './coupon.entity';
import { User } from '../../../users/entities/user.entity';

@Entity('coupon_redemptions')
@Index('idx_coupon_redemptions_coupon_id', ['couponId'])
@Index('idx_coupon_redemptions_user_id', ['userId'])
@Index('idx_coupon_redemptions_booking_id', ['bookingId'])
export class CouponRedemption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'coupon_id' })
  couponId: string;

  @ManyToOne(() => Coupon, (coupon) => coupon.redemptions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'coupon_id' })
  coupon: Coupon;

  @Column({ type: 'uuid', name: 'user_id' })
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'uuid', name: 'booking_id', nullable: true })
  bookingId: string | null;

  @Column({ type: 'bigint' })
  discountAmountMinor: number;

  @CreateDateColumn({ type: 'timestamptz' })
  redeemedAt: Date;
}
