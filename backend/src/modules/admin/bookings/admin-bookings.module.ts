import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminBookingsController } from './admin-bookings.controller';
import { AdminBookingsService } from './admin-bookings.service';
import { Booking } from '../../bookings/entities/booking.entity';
import { BookingStatusHistory } from '../../bookings/entities/booking-status-history.entity';
import { CancellationRequest } from '../../bookings/entities/cancellation-request.entity';
import { AvailabilityBlock } from '../../properties/entities/availability-block.entity';
import { Case } from '../cases/entities/case.entity';
import { BookingsModule } from '../../bookings/bookings.module';
import { AuditModule } from '../../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Booking,
      BookingStatusHistory,
      CancellationRequest,
      AvailabilityBlock,
      Case,
    ]),
    BookingsModule,
    AuditModule,
  ],
  controllers: [AdminBookingsController],
  providers: [AdminBookingsService],
  exports: [AdminBookingsService],
})
export class AdminBookingsModule {}
