import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../auth/guards/roles.guard';
import { Roles } from '../../../auth/decorators/roles.decorator';
import { GetUser } from '../../../auth/decorators/get-user.decorator';
import { User, UserRole } from '../../../users/entities/user.entity';
import { PermissionsGuard } from '../rbac/permissions.guard';
import { RequirePermissions } from '../rbac/permissions.decorator';
import { Permission } from '../rbac/permissions';
import { AdminFinanceService } from './admin-finance.service';
import { RefundsService, ProposeRefundDto } from '../../finance/services/refunds.service';
import { PayoutsService } from '../../finance/services/payouts.service';
import { EscrowService } from '../../finance/services/escrow.service';
import { ReconciliationService, SettlementRow } from '../../finance/services/reconciliation.service';
import { FinanceSettingsService } from '../../finance/services/finance-settings.service';
import { FinanceJobsService } from '../../finance/services/finance-jobs.service';

@Controller('admin/finance')
@UseGuards(JwtAuthGuard, RolesGuard, PermissionsGuard)
@Roles(UserRole.ADMIN)
export class AdminFinanceController {
  constructor(
    private readonly adminFinanceService: AdminFinanceService,
    private readonly refundsService: RefundsService,
    private readonly payoutsService: PayoutsService,
    private readonly escrowService: EscrowService,
    private readonly reconService: ReconciliationService,
    private readonly settingsService: FinanceSettingsService,
    private readonly jobsService: FinanceJobsService,
  ) {}

  @Get('summary')
  @RequirePermissions(Permission.FINANCE_VIEW)
  getSummary() {
    return this.adminFinanceService.getSummary();
  }

  @Get('payments')
  @RequirePermissions(Permission.FINANCE_VIEW)
  listPayments(@Query() query: any) {
    return this.adminFinanceService.listPayments(query);
  }

  @Get('payments/:id')
  @RequirePermissions(Permission.FINANCE_VIEW)
  getPaymentDetail(@Param('id') id: string) {
    return this.adminFinanceService.getPaymentDetail(id);
  }

  @Get('refunds')
  @RequirePermissions(Permission.FINANCE_VIEW)
  listRefunds(@Query() query: any) {
    return this.adminFinanceService.listRefunds(query);
  }

  @Get('refunds/:id')
  @RequirePermissions(Permission.FINANCE_VIEW)
  getRefundDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFinanceService.getRefundDetail(id);
  }

  @Post('refunds')
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  proposeRefund(
    @Body() dto: ProposeRefundDto,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.refundsService.proposeRefund(dto, actor, { ipAddress, userAgent });
  }

  @Post('refunds/:id/approve')
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  approveRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.refundsService.approveRefund(id, actor, reason, { ipAddress, userAgent });
  }

  @Post('refunds/:id/reject')
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  rejectRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.refundsService.rejectRefund(id, actor, reason, { ipAddress, userAgent });
  }

  @Post('refunds/:id/execute')
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  executeRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.refundsService.executeRefund(id, actor, { ipAddress, userAgent });
  }

  @Post('refunds/:id/retry')
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  retryRefund(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.refundsService.executeRefund(id, actor, { ipAddress, userAgent });
  }

  @Get('payouts')
  @RequirePermissions(Permission.FINANCE_VIEW)
  listPayouts(@Query() query: any) {
    return this.adminFinanceService.listPayouts(query);
  }

  @Get('payouts/:id')
  @RequirePermissions(Permission.FINANCE_VIEW)
  getPayoutDetail(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminFinanceService.getPayoutDetail(id);
  }

  @Post(['payouts/batch', 'payouts/batch/generate'])
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  async generateBatch(@GetUser() actor: User) {
    const res = await this.payoutsService.generateDailyPayoutBatch(actor);
    return {
      draftedCount: res.draftedCount,
      createdCount: res.draftedCount,
      totalAmountMinor: res.totalAmountMinor.toString(),
      payoutIds: res.payoutIds,
    };
  }

  @Post('payouts/:id/approve')
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  approvePayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.approvePayout(id, actor, reason, { ipAddress, userAgent });
  }

  @Post('payouts/:id/reject')
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  rejectPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.rejectPayout(id, actor, reason, { ipAddress, userAgent });
  }

  @Post('payouts/:id/execute')
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  executePayout(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.executePayout(id, actor, { ipAddress, userAgent });
  }

  @Post('payouts/:id/retry')
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  retryPayout(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.executePayout(id, actor, { ipAddress, userAgent });
  }

  @Get('payout-accounts')
  @RequirePermissions(Permission.FINANCE_VIEW)
  listPayoutAccounts(@Query() query: any) {
    return this.adminFinanceService.listPayoutAccounts(query);
  }

  @Post('payout-accounts/:id/verify')
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  verifyPayoutAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.verifyPayoutAccount(id, actor, { ipAddress, userAgent });
  }

  @Post(['payout-accounts/:id/reject', 'payout-accounts/:id/disable'])
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  rejectPayoutAccount(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.payoutsService.rejectPayoutAccount(
      id,
      actor,
      reason || 'Disabled by administrator',
      { ipAddress, userAgent },
    );
  }

  @Get('ledger')
  @RequirePermissions(Permission.FINANCE_VIEW)
  listLedger(@Query() query: any) {
    return this.adminFinanceService.listLedgerTransactions(query);
  }

  @Get(['escrow', 'escrow-holds'])
  @RequirePermissions(Permission.FINANCE_VIEW)
  listEscrow(@Query() query: any) {
    return this.adminFinanceService.listEscrowHolds(query);
  }

  @Post(['escrow/:id/release', 'escrow-holds/:id/release'])
  @RequirePermissions(Permission.FINANCE_PAYOUTS)
  releaseEscrow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
  ) {
    return this.escrowService.releaseHold(id, actor, reason);
  }

  @Post(['escrow/:id/freeze', 'escrow-holds/:id/freeze'])
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  freezeEscrow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.escrowService.freezeHold(id, reason, actor, { ipAddress, userAgent });
  }

  @Post(['escrow/:id/unfreeze', 'escrow-holds/:id/unfreeze'])
  @RequirePermissions(Permission.FINANCE_REFUNDS)
  unfreezeEscrow(
    @Param('id', ParseUUIDPipe) id: string,
    @Body('reason') reason: string,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    return this.escrowService.unfreezeHold(id, reason, actor, { ipAddress, userAgent });
  }

  @Get(['reconciliation', 'reconciliation/issues'])
  @RequirePermissions(Permission.FINANCE_VIEW)
  listReconciliation(@Query() query: any) {
    return this.adminFinanceService.listReconciliationIssues(query);
  }

  @Post(['reconciliation/settlement-report', 'reconciliation/settlement'])
  @RequirePermissions(Permission.FINANCE_RECONCILE)
  async ingestSettlementReport(
    @Body()
    body: {
      provider?: string;
      reportReference?: string;
      records?: any[];
      rows?: any[];
    },
    @GetUser() actor: User,
  ) {
    const rawRows = body.records || body.rows || [];
    const mappedRows: SettlementRow[] = rawRows.map((r: any) => ({
      providerReference:
        r.providerReference ||
        r.transactionReference ||
        r.reference ||
        r.providerTransactionId ||
        '',
      transactionType: (r.transactionType || (r.status === 'refund' ? 'REFUND' : 'CHARGE')) as any,
      amount:
        r.amount !== undefined
          ? r.amount
          : r.amountMinor
            ? Number(r.amountMinor) / 100
            : 0,
      currency: r.currency || 'ETB',
      date: r.date || r.paidAt || new Date().toISOString(),
      fee: r.fee || 0,
    }));
    const result = await this.reconService.ingestSettlementReport(
      body.provider || 'CHAPA',
      mappedRows,
      actor,
    );
    return {
      matchedCount: result.matched,
      issuesCreatedCount: result.issuesCreated,
      processedCount: result.processed,
    };
  }

  @Post(['reconciliation/:id/resolve', 'reconciliation/issues/:id/resolve'])
  @RequirePermissions(Permission.FINANCE_RECONCILE)
  resolveReconciliationIssue(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: any,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    const note =
      (typeof body === 'string' ? body : null) ||
      body?.notes ||
      body?.note ||
      (body?.action ? `Action: ${body.action}` : 'Resolved by administrator');
    return this.reconService.resolveIssue(id, note, actor, { ipAddress, userAgent });
  }

  @Get('settings')
  @RequirePermissions(Permission.FINANCE_VIEW)
  getSettings() {
    return this.settingsService.getRawSettingsList();
  }

  @Patch(['settings/:key', 'settings'])
  @RequirePermissions(Permission.FINANCE_CONFIG)
  updateSettings(
    @Param('key') key: string | undefined,
    @Body() body: any,
    @GetUser() actor: User,
    @Ip() ipAddress: string,
    @Headers('user-agent') userAgent?: string,
  ) {
    if (key) {
      const value = body?.value !== undefined ? String(body.value) : '';
      return this.settingsService.updateSingleSetting(key, value, actor, {
        ipAddress,
        userAgent,
      });
    }
    return this.settingsService.updateSettings(
      body?.updates || body,
      body?.reason || 'Finance settings updated by admin',
      actor,
      { ipAddress, userAgent },
    );
  }

  @Get('exports/:type.csv')
  @RequirePermissions(Permission.FINANCE_EXPORT)
  async exportCsv(@Param('type') type: string, @Res() res: Response) {
    const csvContent = await this.adminFinanceService.exportCsv(type);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="finance-${type}-${Date.now()}.csv"`);
    res.send(csvContent);
  }
}
