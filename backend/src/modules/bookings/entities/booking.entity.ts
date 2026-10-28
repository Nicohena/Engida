import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Property } from '../../properties/entities/property.entity';
import { Room } from '../../properties/entities/room.entity';
import { User } from '../../../users/entities/user.entity';
import { BookingStatusHistory } from './booking-status-history.entity';
import { CancellationRequest } from './cancellation-request.entity';
import { CancellationPolicyTier } from './cancellation-policy';

export enum BookingStatus {
  PENDING = 'PENDING',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export enum PaymentMethod {
  CHAPA = 'CHAPA',
  TELEBIRR = 'TELEBIRR',
  CBE_BIRR = 'CBE_BIRR',
  INTERNATIONAL_CARD = 'INTERNATIONAL_CARD',
  PAYPAL = 'PAYPAL',
  WISE = 'WISE',
  CASH_ON_ARRIVAL = 'CASH_ON_ARRIVAL',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  ON_ARRIVAL = 'ON_ARRIVAL',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

@Entity('bookings')
export class Booking {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  /** Human-readable reference, e.g. BKG-2026-000042. */
  @Column({ type: 'varchar', length: 32, unique: true })
  reference: string;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'cancellation_policy',
    default: CancellationPolicyTier.MODERATE,
  })
  cancellationPolicy: CancellationPolicyTier;

  @Column({ type: 'uuid', name: 'property_id' })
  propertyId: string;

  @ManyToOne(() => Property, (property) => property.bookings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'property_id' })
  property: Property;

  @Column({ type: 'uuid', nullable: true, name: 'room_id' })
  roomId: string | null;

  @ManyToOne(() => Room, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'room_id' })
  room: Room | null;

  @Column({ type: 'uuid', name: 'guest_id' })
  guestId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'guest_id' })
  guest: User;

  @Column({ type: 'date', name: 'check_in_date' })
  checkInDate: string;

  @Column({ type: 'date', name: 'check_out_date' })
  checkOutDate: string;

  @Column({ type: 'int', default: 1, name: 'guest_count' })
  guestCount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'total_price' })
  totalPrice: number;

  @Column({
    type: 'enum',
    enum: BookingStatus,
    default: BookingStatus.PENDING,
  })
  status: BookingStatus;

  @Column({ type: 'uuid', name: 'cancelled_by_id', nullable: true })
  cancelledById: string | null;

  @Column({ type: 'varchar', length: 20, name: 'cancelled_by_type', nullable: true })
  cancelledByType: string | null;

  @Column({ type: 'timestamptz', name: 'cancelled_at', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'text', name: 'cancellation_reason', nullable: true })
  cancellationReason: string | null;

  @OneToMany(() => BookingStatusHistory, (history) => history.booking)
  statusHistory?: BookingStatusHistory[];

  @OneToMany(() => CancellationRequest, (request) => request.booking)
  cancellationRequests?: CancellationRequest[];

  @Column({
    type: 'varchar',
    length: 50,
    default: PaymentMethod.CASH_ON_ARRIVAL,
    name: 'payment_method',
  })
  paymentMethod: PaymentMethod;

  @Column({
    type: 'varchar',
    length: 50,
    default: PaymentStatus.PENDING,
    name: 'payment_status',
  })
  paymentStatus: PaymentStatus;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'payment_reference' })
  paymentReference: string | null;

  @Column({ type: 'varchar', length: 10, default: 'ETB', name: 'payment_currency' })
  paymentCurrency: string;

  @Column({ type: 'timestamptz', nullable: true, name: 'paid_at' })
  paidAt: Date | null;

  @Column({ type: 'boolean', default: false, name: 'is_legacy_cash' })
  isLegacyCash: boolean;

  @Column({ type: 'varchar', length: 32, default: 'UNVERIFIED', name: 'payment_reconciliation_status' })
  paymentReconciliationStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

