import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Booking, BookingStatus } from './booking.entity';
import { User } from '../../../users/entities/user.entity';

export enum BookingActorType {
  GUEST = 'GUEST',
  HOST = 'HOST',
  ADMIN = 'ADMIN',
  SYSTEM = 'SYSTEM',
}

/**
 * Append-only history for every booking status change. The booking row keeps
 * the current state; this table preserves how that state was reached.
 */
@Entity('booking_status_history')
@Index('idx_booking_status_history_booking_created', ['bookingId', 'createdAt'])
export class BookingStatusHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid', name: 'booking_id' })
  bookingId: string;

  @ManyToOne(() => Booking, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'booking_id' })
  booking: Booking;

  @Column({
    type: 'varchar',
    length: 20,
    name: 'from_status',
    nullable: true,
  })
  fromStatus: BookingStatus | null;

  @Column({ type: 'varchar', length: 20, name: 'to_status' })
  toStatus: BookingStatus;

  @Column({
    type: 'varchar',
    length: 20,
    default: BookingActorType.SYSTEM,
  })
  source: BookingActorType;

  @Column({ type: 'uuid', name: 'actor_id', nullable: true })
  actorId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'actor_id' })
  actor: User | null;

  @Column({ type: 'text', nullable: true })
  reason: string | null;

  @CreateDateColumn({ type: 'timestamptz', name: 'created_at' })
  createdAt: Date;
}
