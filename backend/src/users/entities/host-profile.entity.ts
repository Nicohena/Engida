import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from './user.entity';

export enum HostVerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
}

export enum PayoutProvider {
  TELEBIRR = 'TELEBIRR',
  CBE = 'CBE',
  AWASH = 'AWASH',
  DASHEN = 'DASHEN',
  ABYSSINIA = 'ABYSSINIA',
  CHAPA = 'CHAPA',
  INTERNATIONAL_SWIFT = 'INTERNATIONAL_SWIFT',
  PAYPAL = 'PAYPAL',
  WISE = 'WISE',
}

@Entity('host_profiles')
export class HostProfile {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', name: 'user_id', unique: true })
  userId: string;

  @OneToOne(() => User, (user) => user.hostProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'display_name' })
  displayName: string | null;

  @Column({ type: 'text', nullable: true })
  bio: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  phone: string | null;

  @Column({
    type: 'enum',
    enum: HostVerificationStatus,
    default: HostVerificationStatus.UNVERIFIED,
    name: 'verification_status',
  })
  verificationStatus: HostVerificationStatus;

  // ─────────────────────────────────────────
  // Payout & Banking Configuration
  // ─────────────────────────────────────────
  @Column({
    type: 'varchar',
    length: 50,
    nullable: true,
    name: 'payout_provider',
  })
  payoutProvider: PayoutProvider | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payout_account_name' })
  payoutAccountName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payout_account_number' })
  payoutAccountNumber: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payout_phone' })
  payoutPhone: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payout_bank_branch' })
  payoutBankBranch: string | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'payout_swift_bic' })
  payoutSwiftBic: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true, name: 'payout_email' })
  payoutEmail: string | null;

  @Column({ type: 'varchar', length: 10, default: 'ETB', name: 'payout_currency' })
  payoutCurrency: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
