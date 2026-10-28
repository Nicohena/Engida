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
import { User } from '../../../users/entities/user.entity';
import { Payment } from './payment.entity';
import { Refund } from './refund.entity';
import { Payout } from './payout.entity';

export enum ReconciliationIssueType {
  MISSING_PAYMENT = 'MISSING_PAYMENT',
  AMOUNT_MISMATCH = 'AMOUNT_MISMATCH',
  DUPLICATE_PAYOUT = 'DUPLICATE_PAYOUT',
  MISSING_REFUND = 'MISSING_REFUND',
  UNMATCHED_SETTLEMENT = 'UNMATCHED_SETTLEMENT',
  FEE_MISMATCH = 'FEE_MISMATCH',
  OTHER = 'OTHER',
}

export enum ReconciliationIssueStatus {
  OPEN = 'OPEN',
  INVESTIGATING = 'INVESTIGATING',
  RESOLVED = 'RESOLVED',
  IGNORED = 'IGNORED',
}

@Entity('reconciliation_issues')
export class ReconciliationIssue {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 50, name: 'issue_type' })
  issueType: ReconciliationIssueType;

  @Index()
  @Column({ type: 'varchar', length: 120, nullable: true, name: 'provider_reference' })
  providerReference: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Column({ type: 'uuid', nullable: true, name: 'refund_id' })
  refundId: string | null;

  @ManyToOne(() => Refund, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'refund_id' })
  refund: Refund | null;

  @Column({ type: 'uuid', nullable: true, name: 'payout_id' })
  payoutId: string | null;

  @ManyToOne(() => Payout, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payout_id' })
  payout: Payout | null;

  @Column({ type: 'bigint', nullable: true, name: 'expected_minor' })
  expectedMinor: string | null;

  @Column({ type: 'bigint', nullable: true, name: 'actual_minor' })
  actualMinor: string | null;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, any> | null;

  @Index()
  @Column({ type: 'varchar', length: 32, default: ReconciliationIssueStatus.OPEN })
  status: ReconciliationIssueStatus;

  @Column({ type: 'uuid', nullable: true, name: 'resolved_by_id' })
  resolvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'resolved_by_id' })
  resolvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'resolved_at' })
  resolvedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'resolution_note' })
  resolutionNote: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
