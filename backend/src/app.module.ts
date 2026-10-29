import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { User } from './users/entities/user.entity';
import { HostProfile } from './users/entities/host-profile.entity';
import { RefreshToken } from './auth/entities/refresh-token.entity';
import { HealthModule } from './health/health.module';
import { DatabaseModule } from './database/database.module';
import { AiModule } from './modules/ai/ai.module';
import { PropertiesModule } from './modules/properties/properties.module';
import { AmenitiesModule } from './modules/amenities/amenities.module';
import { BookingsModule } from './modules/bookings/bookings.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { CloudinaryModule } from './modules/cloudinary/cloudinary.module';
import { HostModule } from './modules/host/host.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ListingModerationModule } from './modules/properties/listing-moderation.module';
import { AdminModule } from './modules/admin/admin.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuditLog } from './modules/audit/entities/audit-log.entity';
import { Property } from './modules/properties/entities/property.entity';
import { Room } from './modules/properties/entities/room.entity';
import { AvailabilityBlock } from './modules/properties/entities/availability-block.entity';
import { Amenity } from './modules/amenities/entities/amenity.entity';
import { Booking } from './modules/bookings/entities/booking.entity';
import { BookingStatusHistory } from './modules/bookings/entities/booking-status-history.entity';
import { CancellationRequest } from './modules/bookings/entities/cancellation-request.entity';
import { Review } from './modules/reviews/entities/review.entity';
import { ListingReview } from './modules/properties/entities/listing-review.entity';
import { Notification } from './modules/notifications/entities/notification.entity';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { ReportsModule } from './modules/reports/reports.module';
import { Report } from './modules/reports/entities/report.entity';
import { Case } from './modules/admin/cases/entities/case.entity';
import { CaseMessage } from './modules/admin/cases/entities/case-message.entity';
import { CaseNote } from './modules/admin/cases/entities/case-note.entity';
import { CaseAttachment } from './modules/admin/cases/entities/case-attachment.entity';
import { CaseEvent } from './modules/admin/cases/entities/case-event.entity';
import { CannedResponse } from './modules/admin/cases/entities/canned-response.entity';
import { FinanceModule } from './modules/finance/finance.module';
import { Payment } from './modules/finance/entities/payment.entity';
import { ProviderEvent } from './modules/finance/entities/provider-event.entity';
import { EscrowHold } from './modules/finance/entities/escrow-hold.entity';
import { LedgerAccount } from './modules/finance/entities/ledger-account.entity';
import { LedgerTransaction } from './modules/finance/entities/ledger-transaction.entity';
import { LedgerEntry } from './modules/finance/entities/ledger-entry.entity';
import { Refund } from './modules/finance/entities/refund.entity';
import { RefundEvent } from './modules/finance/entities/refund-event.entity';
import { PayoutAccount } from './modules/finance/entities/payout-account.entity';
import { Payout } from './modules/finance/entities/payout.entity';
import { PayoutItem } from './modules/finance/entities/payout-item.entity';
import { PayoutEvent } from './modules/finance/entities/payout-event.entity';
import { TaxLine } from './modules/finance/entities/tax-line.entity';
import { CommissionSnapshot } from './modules/finance/entities/commission-snapshot.entity';
import { FinancialAdjustment } from './modules/finance/entities/financial-adjustment.entity';
import { ReconciliationIssue } from './modules/finance/entities/reconciliation-issue.entity';
import { JobRun } from './modules/finance/entities/job-run.entity';
import { FinanceSetting } from './modules/finance/entities/finance-setting.entity';
import { CatalogModule } from './modules/catalog/catalog.module';
import { PropertyCategory } from './modules/catalog/entities/property-category.entity';
import { Destination } from './modules/catalog/entities/destination.entity';
import { CouponsModule } from './modules/coupons/coupons.module';
import { Coupon } from './modules/coupons/entities/coupon.entity';
import { CouponRedemption } from './modules/coupons/entities/coupon-redemption.entity';
import { ContentModule } from './modules/content/content.module';
import { FaqItem } from './modules/content/entities/faq-item.entity';
import { ContentBlock } from './modules/content/entities/content-block.entity';
import { SystemSetting } from './modules/admin/settings/entities/system-setting.entity';
import { validate } from './config/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
      validate,
    }),
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const databaseUrl = configService.get<string>('DATABASE_URL');
        const syncEnv = configService.get<string | boolean>('DATABASE_SYNCHRONIZE');
        const synchronize =
          syncEnv === true || syncEnv === 'true';
        const logging =
          configService.get<string>('DEBUG_SQL') === 'true'
            ? true
            : (['error', 'warn'] as ('error' | 'warn')[]);
        const entities = [
          User,
          HostProfile,
          RefreshToken,
          Property,
          Room,
          AvailabilityBlock,
          Amenity,
          Booking,
          BookingStatusHistory,
          CancellationRequest,
          Review,
          ListingReview,
          Notification,
          AuditLog,
          Report,
          Case,
          CaseMessage,
          CaseNote,
          CaseAttachment,
          CaseEvent,
          CannedResponse,
          Payment,
          ProviderEvent,
          EscrowHold,
          LedgerAccount,
          LedgerTransaction,
          LedgerEntry,
          Refund,
          RefundEvent,
          PayoutAccount,
          Payout,
          PayoutItem,
          PayoutEvent,
          TaxLine,
          CommissionSnapshot,
          FinancialAdjustment,
          ReconciliationIssue,
          JobRun,
          FinanceSetting,
          PropertyCategory,
          Destination,
          Coupon,
          CouponRedemption,
          FaqItem,
          ContentBlock,
          SystemSetting,
        ];

        if (databaseUrl) {
          return {
            type: 'postgres',
            url: databaseUrl,
            entities,
            synchronize,
            logging,
          };
        }

        return {
          type: 'postgres',
          host: configService.get<string>('DATABASE_HOST', 'localhost'),
          port: configService.get<number>('DATABASE_PORT', 5432),
          username: configService.get<string>('DATABASE_USER', 'postgres'),
          password: configService.get<string>('DATABASE_PASSWORD', 'postgres'),
          database: configService.get<string>('DATABASE_NAME', 'engida_db'),
          entities,
          synchronize,
          logging,
        };
      },
    }),
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => [
        {
          ttl: configService.get<number>('THROTTLE_TTL', 60000), // 1 minute window
          limit: configService.get<number>('THROTTLE_LIMIT', 300), // up to 300 req/min for seamless SPA browsing
        },
      ],
    }),
    HealthModule,
    DatabaseModule,
    AiModule,
    UsersModule,
    AuthModule,
    PropertiesModule,
    AmenitiesModule,
    BookingsModule,
    ReviewsModule,
    CloudinaryModule,
    HostModule,
    PaymentsModule,
    ListingModerationModule,
    AdminModule,
    FinanceModule,
    NotificationsModule,
    AuditModule,
    ReportsModule,
    CatalogModule,
    CouponsModule,
    ContentModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
