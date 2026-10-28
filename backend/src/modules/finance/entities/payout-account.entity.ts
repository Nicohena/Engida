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

export enum PayoutAccountStatus {
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  DISABLED = 'DISABLED',
}

@Entity('payout_accounts')
export class PayoutAccount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'host_id' })
  hostId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'host_id' })
  host: User;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Column({ type: 'varchar', length: 255, name: 'account_name' })
  accountName: string;

  @Column({ type: 'text', name: 'account_number_encrypted' })
  accountNumberEncrypted: string;

  @Column({ type: 'varchar', length: 4, name: 'account_number_last4' })
  accountNumberLast4: string;

  @Column({ type: 'text', nullable: true, name: 'phone_encrypted' })
  phoneEncrypted: string | null;

  @Column({ type: 'varchar', length: 4, nullable: true, name: 'phone_last4' })
  phoneLast4: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'bank_name' })
  bankName: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true, name: 'bank_branch' })
  bankBranch: string | null;

  @Column({ type: 'text', nullable: true, name: 'swift_bic_encrypted' })
  swiftBicEncrypted: string | null;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Index()
  @Column({ type: 'varchar', length: 32, default: PayoutAccountStatus.PENDING })
  status: PayoutAccountStatus;

  @Column({ type: 'uuid', nullable: true, name: 'verified_by_id' })
  verifiedById: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'verified_by_id' })
  verifiedBy: User | null;

  @Column({ type: 'timestamptz', nullable: true, name: 'verified_at' })
  verifiedAt: Date | null;

  @Column({ type: 'text', nullable: true, name: 'rejection_reason' })
  rejectionReason: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
