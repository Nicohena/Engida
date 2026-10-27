import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Booking } from './booking.entity';
import { User } from '../../../users/entities/user.entity';
import { CancellationPolicyTier } from './cancellation-policy';

export enum CancellationRequestStatus {
  REQUESTED = 'REQUESTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  WITHDRAWN = 'WITHDRAWN',
}

export enum CancellationRequestSource {
  GUEST = 'GUEST',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
}

/**
 * A recorded request to cancel a reservation. Phase 2 does not move money; the
 * amount stored here is a policy-derived estimate for the finance phase.
 */
@Entity('booking_cancellation_requests')
@Index('idx_booking_cancellation_requests_booking', ['bookingId', 'createdAt'])
@Index('idx_booking_cancellation_requests_status', ['status', 'createdAt'])
export class CancellationRequest {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({
    type: 'enum',
    enum: CancellationRequestSource,
    enumName: 'cancellation_request_source_enum',
    default: CancellationRequestSource.ADMIN,
  })
  source: CancellationRequestSource;

  @Column({ type: 'uuid', name: 'requested_by_id', nullable: true })
  requestedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'requested_by_id' })
  requestedBy: User | null;

  @Column({ type: 'text' })
  reason: string;

  @Column({
    type: 'enum',
    enum: CancellationRequestStatus,
    enumName: 'cancellation_request_status_enum',
    default: CancellationRequestStatus.REQUESTED,
  })
  status: CancellationRequestStatus;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'policy_tier',
    default: CancellationPolicyTier.MODERATE,
  })
  policyTier: CancellationPolicyTier;

  @Column({
    type: 'decimal',
    precision: 10,
    scale: 2,
    name: 'estimated_refund_amount',
    default: 0,
  })
  estimatedRefundAmount: string;

  @Column({ type: 'varchar', length: 10, default: 'ETB' })
  currency: string;

  @Column({ type: 'jsonb', name: 'policy_preview', nullable: true })
  policyPreview: Record<string, unknown> | null;

  @Column({ type: 'uuid', name: 'decided_by_id', nullable: true })
  decidedById: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'decided_by_id' })
  decidedBy: User | null;

  @Column({ type: 'timestamptz', name: 'decided_at', nullable: true })
  decidedAt: Date | null;

  @Column({ type: 'text', name: 'decision_note', nullable: true })
  decisionNote: string | null;

  @Column({
    type: 'varchar',
    length: 255,
    name: 'idempotency_key',
    nullable: true,
  })
  idempotencyKey: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamptz', name: 'updated_at' })
  updatedAt: Date;
}
