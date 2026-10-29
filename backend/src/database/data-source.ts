import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import { User } from '../users/entities/user.entity';
import { HostProfile } from '../users/entities/host-profile.entity';
import { RefreshToken } from '../auth/entities/refresh-token.entity';
import { Property } from '../modules/properties/entities/property.entity';
import { Room } from '../modules/properties/entities/room.entity';
import { AvailabilityBlock } from '../modules/properties/entities/availability-block.entity';
import { Amenity } from '../modules/amenities/entities/amenity.entity';
import { Booking } from '../modules/bookings/entities/booking.entity';
import { Review } from '../modules/reviews/entities/review.entity';
import { ListingReview } from '../modules/properties/entities/listing-review.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { Report } from '../modules/reports/entities/report.entity';
import { BookingStatusHistory } from '../modules/bookings/entities/booking-status-history.entity';
import { CancellationRequest } from '../modules/bookings/entities/cancellation-request.entity';
import { Case } from '../modules/admin/cases/entities/case.entity';
import { CaseMessage } from '../modules/admin/cases/entities/case-message.entity';
import { CaseNote } from '../modules/admin/cases/entities/case-note.entity';
import { CaseAttachment } from '../modules/admin/cases/entities/case-attachment.entity';
import { CaseEvent } from '../modules/admin/cases/entities/case-event.entity';
import { CannedResponse } from '../modules/admin/cases/entities/canned-response.entity';
import { Payment } from '../modules/finance/entities/payment.entity';
import { ProviderEvent } from '../modules/finance/entities/provider-event.entity';
import { EscrowHold } from '../modules/finance/entities/escrow-hold.entity';
import { LedgerAccount } from '../modules/finance/entities/ledger-account.entity';
import { LedgerTransaction } from '../modules/finance/entities/ledger-transaction.entity';
import { LedgerEntry } from '../modules/finance/entities/ledger-entry.entity';
import { Refund } from '../modules/finance/entities/refund.entity';
import { RefundEvent } from '../modules/finance/entities/refund-event.entity';
import { PayoutAccount } from '../modules/finance/entities/payout-account.entity';
import { Payout } from '../modules/finance/entities/payout.entity';
import { PayoutItem } from '../modules/finance/entities/payout-item.entity';
import { PayoutEvent } from '../modules/finance/entities/payout-event.entity';
import { TaxLine } from '../modules/finance/entities/tax-line.entity';
import { CommissionSnapshot } from '../modules/finance/entities/commission-snapshot.entity';
import { FinancialAdjustment } from '../modules/finance/entities/financial-adjustment.entity';
import { ReconciliationIssue } from '../modules/finance/entities/reconciliation-issue.entity';
import { JobRun } from '../modules/finance/entities/job-run.entity';
import { FinanceSetting } from '../modules/finance/entities/finance-setting.entity';

import { PropertyCategory } from '../modules/catalog/entities/property-category.entity';
import { Destination } from '../modules/catalog/entities/destination.entity';
import { Coupon } from '../modules/coupons/entities/coupon.entity';
import { CouponRedemption } from '../modules/coupons/entities/coupon-redemption.entity';
import { FaqItem } from '../modules/content/entities/faq-item.entity';
import { ContentBlock } from '../modules/content/entities/content-block.entity';
import { SystemSetting } from '../modules/admin/settings/entities/system-setting.entity';

const phase4Entities = [
  PropertyCategory,
  Destination,
  Coupon,
  CouponRedemption,
  FaqItem,
  ContentBlock,
];

const phase5Entities = [
  SystemSetting,
];

const financeEntities = [
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
];

const databaseUrl = process.env.DATABASE_URL;

const AppDataSource = new DataSource(
  databaseUrl
    ? {
        type: 'postgres',
        url: databaseUrl,
        entities: [
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
          ...financeEntities,
          ...phase4Entities,
          ...phase5Entities,
        ],
        migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
        synchronize: false,
        logging: process.env.DEBUG_SQL === 'true',
      }
    : {
        type: 'postgres',
        host: process.env.DATABASE_HOST || 'localhost',
        port: parseInt(process.env.DATABASE_PORT || '5432', 10),
        username: process.env.DATABASE_USER || 'postgres',
        password: process.env.DATABASE_PASSWORD || 'postgres',
        database: process.env.DATABASE_NAME || 'engida_db',
        entities: [
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
          ...financeEntities,
          ...phase4Entities,
          ...phase5Entities,
        ],
        migrations: [path.join(__dirname, 'migrations/*{.ts,.js}')],
        synchronize: false,
        logging: process.env.DEBUG_SQL === 'true',
      },
);

export default AppDataSource;
