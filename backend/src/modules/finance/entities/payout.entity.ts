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
import { User } from '../../../users/entities/user.entity';
import { PayoutAccount } from './payout-account.entity';
import { PayoutItem } from './payout-item.entity';
import { PayoutEvent } from './payout-event.entity';

export enum PayoutStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  PROCESSING = 'PROCESSING',
  PAID = 'PAID',
  FAILED = 'FAILED',
  ON_HOLD = 'ON_HOLD',
  CANCELLED = 'CANCELLED',
}

@Entity('payouts')
export class Payout {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @ManyToOne(() => User, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'uuid', name: 'payout_account_id' })
  payoutAccountId: string;

  @ManyToOne(() => PayoutAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'payout_account_id' })
  payoutAccount: PayoutAccount;

  @Column({ type: 'date', name: 'period_start' })
  periodStart: string;

  @Column({ type: 'date', name: 'period_end' })
  periodEnd: string;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Index()
  @Column({ type: 'varchar', length: 32, default: PayoutStatus.DRAFT })
  status: PayoutStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_transfer_id' })
  providerTransferId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true, name: 'idempotency_key' })
  idempotencyKey: string;

  @Column({ type: 'uuid', nullable: true, name: 'approved_by_id' })
  approvedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by_id' })
  approvedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'failure_code' })
  failureCode: string | null;

  @Column({ type: 'text', nullable: true, name: 'failure_message' })
  failureMessage: string | null;

  @OneToMany(() => PayoutItem, (item) => item.payout)
  items: PayoutItem[];

  @OneToMany(() => PayoutEvent, (event) => event.payout)
  events: PayoutEvent[];

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
