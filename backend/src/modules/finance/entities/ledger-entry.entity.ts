import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { LedgerTransaction } from './ledger-transaction.entity';
import { LedgerAccount } from './ledger-account.entity';

@Entity('ledger_entries')
export class LedgerEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'transaction_id' })
  transactionId: string;

  @ManyToOne(() => LedgerTransaction, (tx) => tx.entries, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'transaction_id' })
  transaction: LedgerTransaction;

  @Index()
  @Column({ type: 'uuid', name: 'account_id' })
  accountId: string;

  @ManyToOne(() => LedgerAccount, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'account_id' })
  account: LedgerAccount;

  @Column({ type: 'bigint', default: 0, name: 'debit_minor' })
  debitMinor: string;

  @Column({ type: 'bigint', default: 0, name: 'credit_minor' })
  creditMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'text', nullable: true })
  memo: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
