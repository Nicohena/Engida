import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Payout } from './payout.entity';
import { LedgerEntry } from './ledger-entry.entity';
import { Booking } from '../../bookings/entities/booking.entity';

export enum PayoutItemType {
  STAY_RELEASE = 'STAY_RELEASE',
  COMPENSATION_CREDIT = 'COMPENSATION_CREDIT',
  ADJUSTMENT = 'ADJUSTMENT',
  REFUND_OFFSET = 'REFUND_OFFSET',
  NEGATIVE_BALANCE_OFFSET = 'NEGATIVE_BALANCE_OFFSET',
}

@Entity('payout_items')
export class PayoutItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'payout_id' })
  payoutId: string;

  @ManyToOne(() => Payout, (payout) => payout.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'payout_id' })
  payout: Payout;

  @Column({ type: 'uuid', nullable: true, name: 'ledger_entry_id' })
  ledgerEntryId: string | null;

  @ManyToOne(() => LedgerEntry, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'ledger_entry_id' })
  ledgerEntry: LedgerEntry | null;

  @Column({ type: 'uuid', nullable: true, name: 'booking_id' })
  bookingId: string | null;

  @ManyToOne(() => Booking, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking | null;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string;

  @Column({ type: 'varchar', length: 50 })
  type: PayoutItemType;

  @Column({ type: 'text' })
  description: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
