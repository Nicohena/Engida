import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminUsersController } from './users/admin-users.controller';
import { AdminUsersService } from './users/admin-users.service';
import { AdminAuditController } from './audit/admin-audit.controller';
import { AdminDashboardController } from './dashboard/admin-dashboard.controller';
import { AdminDashboardService } from './dashboard/admin-dashboard.service';
import { AdminGuestReviewsController } from './reviews/admin-guest-reviews.controller';
import { AdminGuestReviewsService } from './reviews/admin-guest-reviews.service';
import { AdminReportsController } from './reports/admin-reports.controller';
import { AdminReportsService } from './reports/admin-reports.service';
import { AdminBookingsModule } from './bookings/admin-bookings.module';
import { AdminCasesModule } from './cases/admin-cases.module';
import { AdminListingsController } from './listings/admin-listings.controller';
import { AdminListingsService } from './listings/admin-listings.service';
import { PermissionsGuard } from './rbac/permissions.guard';
import { ListingModerationModule } from '../properties/listing-moderation.module';
import { HostModule } from '../host/host.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { User } from '../../users/entities/user.entity';
import { HostProfile } from '../../users/entities/host-profile.entity';
import { Property } from '../properties/entities/property.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { Review } from '../reviews/entities/review.entity';
import { ListingReview } from '../properties/entities/listing-review.entity';
import { RefreshToken } from '../../auth/entities/refresh-token.entity';
import { Report } from '../reports/entities/report.entity';
import { Case } from './cases/entities/case.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      HostProfile,
      Property,
      Booking,
      Review,
      ListingReview,
      RefreshToken,
      Report,
      Case,
    ]),
    ListingModerationModule,
    HostModule,
    AuditModule,
    NotificationsModule,
    AdminBookingsModule,
    AdminCasesModule,
  ],
  controllers: [
    AdminController,
    AdminUsersController,
    AdminListingsController,
    AdminAuditController,
    AdminDashboardController,
    AdminGuestReviewsController,
    AdminReportsController,
  ],
  providers: [
    AdminUsersService,
    AdminListingsService,
    AdminDashboardService,
    AdminGuestReviewsService,
    AdminReportsService,
    PermissionsGuard,
  ],
})
export class AdminModule {}
