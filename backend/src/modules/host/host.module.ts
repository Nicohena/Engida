import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HostController } from './host.controller';
import { HostService } from './host.service';
import { Property } from '../properties/entities/property.entity';
import { Room } from '../properties/entities/room.entity';
import { AvailabilityBlock } from '../properties/entities/availability-block.entity';
import { Amenity } from '../amenities/entities/amenity.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { User } from '../../users/entities/user.entity';
import { ListingReview } from '../properties/entities/listing-review.entity';
import { Review } from '../reviews/entities/review.entity';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';
import { ListingModerationModule } from '../properties/listing-moderation.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { IdentityVerificationService } from './identity-verification.service';
import { IdentityVerificationController } from './identity-verification.controller';

import { FinanceModule } from '../finance/finance.module';
import { Payout } from '../finance/entities/payout.entity';
import { PayoutAccount } from '../finance/entities/payout-account.entity';
import { EscrowHold } from '../finance/entities/escrow-hold.entity';

@Module({
  imports: [
    CloudinaryModule,
    ListingModerationModule,
    NotificationsModule,
    AuditModule,
    FinanceModule,
    TypeOrmModule.forFeature([
      Property,
      Room,
      AvailabilityBlock,
      Amenity,
      Booking,
      HostProfile,
      User,
      ListingReview,
      Review,
      Payout,
      PayoutAccount,
      EscrowHold,
    ]),
  ],
  controllers: [HostController, IdentityVerificationController],
  providers: [HostService, IdentityVerificationService],
  exports: [HostService, IdentityVerificationService],
})
export class HostModule {}
