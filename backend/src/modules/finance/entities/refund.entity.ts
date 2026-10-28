import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from './payment.entity';
import { CancellationRequest } from '../../bookings/entities/cancellation-request.entity';
import { Case } from '../../admin/cases/entities/case.entity';
import { User } from '../../../users/entities/user.entity';
import { RefundEvent } from './refund-event.entity';

export enum RefundStatus {
  REQUESTED = 'REQUESTED',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

@Entity('refunds')
export class Refund {
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

  @Column({ type: 'uuid', nullable: true, name: 'cancellation_request_id' })
  cancellationRequestId: string | null;

  @ManyToOne(() => CancellationRequest, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'cancellation_request_id' })
  cancellationRequest: CancellationRequest | null;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'case_id' })
  caseId: string | null;

  @ManyToOne(() => Case, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'case_id' })
  case: Case | null;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'policy_tier' })
  policyTier: string | null;

  @Index()
  @Column({ type: 'varchar', length: 32, default: RefundStatus.REQUESTED })
  status: RefundStatus;

  @Column({ type: 'uuid', name: 'proposed_by_id' })
  proposedById: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'proposed_by_id' })
  proposedBy: User;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by_id' })
  approvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_refund_id' })
  providerRefundId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true, name: 'idempotency_key' })
  idempotencyKey: string;

  @CreateDateColumn({ name: 'requested_at' })
  requestedAt: Date;

  @Column({ type: 'timestamptz', nullable: true, name: 'approved_at' })
  approvedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'completed_at' })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'failure_code' })
  failureCode: string | null;

  @Column({ type: 'text', nullable: true, name: 'failure_message' })
  failureMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @OneToMany(() => RefundEvent, (event) => event.refund)
  events: RefundEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
