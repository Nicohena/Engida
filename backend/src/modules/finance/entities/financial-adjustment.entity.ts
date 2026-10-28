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
import { Booking } from '../../bookings/entities/booking.entity';
import { Case } from '../../admin/cases/entities/case.entity';
import { LedgerTransaction } from './ledger-transaction.entity';

export enum FinancialAdjustmentType {
  COMPENSATION = 'COMPENSATION',
  GOODWILL = 'GOODWILL',
  NEGATIVE_BALANCE_OFFSET = 'NEGATIVE_BALANCE_OFFSET',
  CHARGEBACK = 'CHARGEBACK',
  CORRECTION = 'CORRECTION',
  OTHER = 'OTHER',
}

export enum FinancialAdjustmentStatus {
  PROPOSED = 'PROPOSED',
  APPROVED = 'APPROVED',
  APPLIED = 'APPLIED',
  REJECTED = 'REJECTED',
}

@Entity('financial_adjustments')
export class FinancialAdjustment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'host_id' })
  hostId: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'host_id' })
  host: User | null;

  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'case_id' })
  caseId: string | null;

  @ManyToOne(() => Case, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'case_id' })
  case: Case | null;

  @Column({ type: 'varchar', length: 50 })
  type: FinancialAdjustmentType;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string; // Signed integer minor units

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Index()
  @Column({ type: 'varchar', length: 32, default: FinancialAdjustmentStatus.PROPOSED })
  status: FinancialAdjustmentStatus;

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

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'uuid', nullable: true, name: 'ledger_transaction_id' })
  ledgerTransactionId: string | null;

  @ManyToOne(() => LedgerTransaction, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ledger_transaction_id' })
  ledgerTransaction: LedgerTransaction | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
