import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from './entities/payment.entity';
import { ProviderEvent } from './entities/provider-event.entity';
import { EscrowHold } from './entities/escrow-hold.entity';
import { LedgerAccount } from './entities/ledger-account.entity';
import { LedgerTransaction } from './entities/ledger-transaction.entity';
import { LedgerEntry } from './entities/ledger-entry.entity';
import { Refund } from './entities/refund.entity';
import { RefundEvent } from './entities/refund-event.entity';
import { PayoutAccount } from './entities/payout-account.entity';
import { Payout } from './entities/payout.entity';
import { PayoutItem } from './entities/payout-item.entity';
import { PayoutEvent } from './entities/payout-event.entity';
import { TaxLine } from './entities/tax-line.entity';
import { CommissionSnapshot } from './entities/commission-snapshot.entity';
import { FinancialAdjustment } from './entities/financial-adjustment.entity';
import { ReconciliationIssue } from './entities/reconciliation-issue.entity';
import { JobRun } from './entities/job-run.entity';
import { FinanceSetting } from './entities/finance-setting.entity';
import { Booking } from '../bookings/entities/booking.entity';
import { CancellationRequest } from '../bookings/entities/cancellation-request.entity';
import { Case } from '../admin/cases/entities/case.entity';
import { User } from '../../users/entities/user.entity';
import { Coupon } from '../coupons/entities/coupon.entity';
import { CouponRedemption } from '../coupons/entities/coupon-redemption.entity';
import { SandboxPaymentProvider } from './providers/sandbox-payment.provider';
import { ChapaPaymentProvider } from './providers/chapa-payment.provider';
import { LedgerService } from './services/ledger.service';
import { FinanceSettingsService } from './services/finance-settings.service';
import { PaymentsCaptureService } from './services/payments-capture.service';
import { EscrowService } from './services/escrow.service';
import { RefundsService } from './services/refunds.service';
import { PayoutsService } from './services/payouts.service';
import { ReconciliationService } from './services/reconciliation.service';
import { FinanceJobsService } from './services/finance-jobs.service';
import { AdminFinanceService } from '../admin/finance/admin-finance.service';
import { AdminFinanceController } from '../admin/finance/admin-finance.controller';
import { AuditModule } from '../audit/audit.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
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
      Booking,
      CancellationRequest,
      Case,
      User,
      Coupon,
      CouponRedemption,
    ]),
    AuditModule,
  ],
  providers: [
    SandboxPaymentProvider,
    ChapaPaymentProvider,
    LedgerService,
    FinanceSettingsService,
    PaymentsCaptureService,
    EscrowService,
    RefundsService,
    PayoutsService,
    ReconciliationService,
    FinanceJobsService,
    AdminFinanceService,
  ],
  controllers: [AdminFinanceController],
  exports: [
    SandboxPaymentProvider,
    ChapaPaymentProvider,
    LedgerService,
    FinanceSettingsService,
    PaymentsCaptureService,
    EscrowService,
    RefundsService,
    PayoutsService,
    ReconciliationService,
    FinanceJobsService,
    AdminFinanceService,
  ],
})
export class FinanceModule {}
