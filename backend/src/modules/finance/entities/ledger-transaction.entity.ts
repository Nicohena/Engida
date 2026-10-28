import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';
import { Payment } from './payment.entity';
import { User } from '../../../users/entities/user.entity';
import { LedgerEntry } from './ledger-entry.entity';

export enum LedgerTransactionType {
  PAYMENT_CAPTURE = 'PAYMENT_CAPTURE',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  REFUND = 'REFUND',
  PAYOUT = 'PAYOUT',
  ADJUSTMENT = 'ADJUSTMENT',
  CHARGEBACK = 'CHARGEBACK',
  TAX = 'TAX',
  COMMISSION = 'COMMISSION',
  REVERSAL = 'REVERSAL',
  OPENING_BALANCE = 'OPENING_BALANCE',
}

@Entity('ledger_transactions')
export class LedgerTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'varchar', length: 50 })
  type: LedgerTransactionType;

  @Column({ type: 'varchar', length: 100 })
  reference: string;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true, name: 'idempotency_key' })
  idempotencyKey: string;

  @Index()
  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @Column({ type: 'uuid', nullable: true, name: 'payment_id' })
  paymentId: string | null;

  @ManyToOne(() => Payment, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment | null;

  @Column({ type: 'uuid', nullable: true, name: 'refund_id' })
  refundId: string | null;

  @Column({ type: 'uuid', nullable: true, name: 'payout_id' })
  payoutId: string | null;

  @Column({ type: 'text' })
  description: string;

  @Column({ type: 'uuid', nullable: true, name: 'created_by_id' })
  createdById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by_id' })
  createdBy: User | null;

  @OneToMany(() => LedgerEntry, (entry) => entry.transaction)
  entries: LedgerEntry[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
