import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostController } from './host.controller';
import { HostService } from './host.service';
import { Property } from '../properties/entities/property.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { User } from '../../users/entities/user.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Property,
      AvailabilityBlock,
      Amenity,
      Booking,
      HostProfile,
      User,
    ]),
  ],
  controllers: [HostController],
  providers: [HostService],
  exports: [HostService],
})
export class HostModule {}
