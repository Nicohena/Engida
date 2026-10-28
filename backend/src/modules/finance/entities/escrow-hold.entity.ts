import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from './payment.entity';

export enum EscrowHoldStatus {
  HELD = 'HELD',
  PARTIALLY_REFUNDED = 'PARTIALLY_REFUNDED',
  REFUNDED = 'REFUNDED',
  RELEASED = 'RELEASED',
  FROZEN = 'FROZEN',
}

@Entity('escrow_holds')
export class EscrowHold {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string;

  @Column({ type: 'bigint', default: 0, name: 'refunded_minor' })
  refundedMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Index()
  @Column({ type: 'varchar', length: 32, default: EscrowHoldStatus.HELD })
  status: EscrowHoldStatus;

  @Index()
  @Column({ type: 'timestamptz', name: 'release_eligible_at' })
  releaseEligibleAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'released_at' })
  releasedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'frozen_at' })
  frozenAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'freeze_reason' })
  freezeReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
