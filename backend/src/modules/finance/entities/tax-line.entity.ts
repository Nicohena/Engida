import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

export enum TaxType {
  VAT = 'VAT',
  WITHHOLDING = 'WITHHOLDING',
  OTHER = 'OTHER',
}

@Entity('tax_lines')
export class TaxLine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'varchar', length: 32 })
  type: TaxType;

  @Column({ type: 'int', name: 'rate_bps' })
  rateBps: number;

  @Column({ type: 'bigint', name: 'base_minor' })
  baseMinor: string;

  @Column({ type: 'bigint', name: 'amount_minor' })
  amountMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'varchar', length: 10, default: 'ET' })
  jurisdiction: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
