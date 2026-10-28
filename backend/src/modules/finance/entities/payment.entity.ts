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
import { Booking } from '../../bookings/entities/booking.entity';

export enum PaymentStatus {
  INITIATED = 'INITIATED',
  PENDING = 'PENDING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'varchar', length: 50 })
  provider: string;

  @Index()
  @Column({ type: 'varchar', length: 100, nullable: true, name: 'provider_payment_id' })
  providerPaymentId: string | null;

  @Index({ unique: true })
  @Column({ type: 'varchar', length: 120, unique: true, name: 'idempotency_key' })
  idempotencyKey: string;

  @Column({ type: 'varchar', length: 32 })
  status: PaymentStatus;

  @Column({ type: 'varchar', length: 50 })
  method: string;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string; // TypeORM maps bigint to string in JS

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'captured_at' })
  capturedAt: Date | null;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'failure_code' })
  failureCode: string | null;

  @Column({ type: 'text', nullable: true, name: 'failure_message' })
  failureMessage: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any> | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
