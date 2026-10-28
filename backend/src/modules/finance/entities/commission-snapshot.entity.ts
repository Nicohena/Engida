import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Booking } from '../../bookings/entities/booking.entity';

@Entity('commission_snapshots')
export class CommissionSnapshot {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ type: 'uuid', unique: true, name: 'booking_id' })
  bookingId: string;

  @OneToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({ type: 'int', name: 'rate_bps' })
  rateBps: number;

  @Column({ type: 'bigint', name: 'commission_minor' })
  commissionMinor: string;

  @Column({ type: 'bigint', name: 'host_net_minor' })
  hostNetMinor: string;

  @Column({ type: 'varchar', length: 3, default: 'ETB' })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'v1.0', name: 'rule_version' })
  ruleVersion: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
