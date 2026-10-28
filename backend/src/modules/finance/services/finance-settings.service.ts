import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FinanceSetting } from '../entities/finance-setting.entity';
import { AuditService } from '../../audit/audit.service';
import { User } from '../../../users/entities/user.entity';

export interface FinanceSettingsDto {
  commissionRateBps: number;
  commissionRounding: 'HALF_UP' | 'DOWN';
  vatRateBps: number;
  vatJurisdiction: string;
  withholdingRateBps: number;
  refundDualApprovalThresholdMinor: string;
  payoutDualApprovalThresholdMinor: string;
  escrowReleaseTrigger: string;
  escrowReleaseDelayHours: number;
  payoutSchedule: string;
  payoutCutoffTime: string;
  liveCaptureEnabled: boolean;
  liveRefundsEnabled: boolean;
  livePayoutsEnabled: boolean;
  autoReleaseEnabled: boolean;
}

@Injectable()
export class FinanceSettingsService {
  private readonly logger = new Logger(FinanceSettingsService.name);

  constructor(
    @InjectRepository(FinanceSetting)
    private readonly settingsRepo: Repository<FinanceSetting>,
    private readonly auditService: AuditService,
  ) {}

  async getAllSettings(): Promise<FinanceSettingsDto> {
    const list = await this.settingsRepo.find();
    const map = new Map<string, string>();
    for (const item of list) {
      map.set(item.key, item.value);
    }

    return {
      commissionRateBps: parseInt(map.get('finance.commission_rate_bps') || '1500', 10),
      commissionRounding: (map.get('finance.commission_rounding') || 'HALF_UP') as 'HALF_UP' | 'DOWN',
      vatRateBps: parseInt(map.get('finance.vat_rate_bps') || '1500', 10),
      vatJurisdiction: map.get('finance.vat_jurisdiction') || 'ET',
      withholdingRateBps: parseInt(map.get('finance.withholding_rate_bps') || '0', 10),
      refundDualApprovalThresholdMinor: map.get('finance.refund_dual_approval_threshold_minor') || '500000',
      payoutDualApprovalThresholdMinor: map.get('finance.payout_dual_approval_threshold_minor') || '1000000',
      escrowReleaseTrigger: map.get('finance.escrow_release_trigger') || 'COMPLETED_PLUS_24H',
      escrowReleaseDelayHours: parseInt(map.get('finance.escrow_release_delay_hours') || '24', 10),
      payoutSchedule: map.get('finance.payout_schedule') || 'DAILY_0200_ADDIS',
      payoutCutoffTime: map.get('finance.payout_cutoff_time') || '01:00',
      liveCaptureEnabled: map.get('finance.live_capture_enabled') === 'true',
      liveRefundsEnabled: map.get('finance.live_refunds_enabled') === 'true',
      livePayoutsEnabled: map.get('finance.live_payouts_enabled') === 'true',
      autoReleaseEnabled: map.get('finance.auto_release_enabled') === 'true',
    };
  }

  async getSetting<T = string>(key: string, defaultValue: T): Promise<T> {
    const setting = await this.settingsRepo.findOne({ where: { key } });
    if (!setting) return defaultValue;

    if (setting.type === 'boolean') {
      return (setting.value === 'true') as unknown as T;
    }
    if (setting.type === 'int' || setting.type === 'number') {
      return parseInt(setting.value, 10) as unknown as T;
    }
    if (setting.type === 'bigint') {
      return BigInt(setting.value) as unknown as T;
    }
    return setting.value as unknown as T;
  }

  async updateSettings(
    updates: Partial<FinanceSettingsDto>,
    reason: string,
    actor: User,
    context?: { ipAddress?: string | null; userAgent?: string | null },
  ): Promise<FinanceSettingsDto> {
    if (!reason || !reason.trim()) {
      throw new BadRequestException('A reason is required when modifying finance configuration');
    }

    const before = await this.getAllSettings();
    const entriesToUpdate: [string, string, string][] = [];

    if (updates.commissionRateBps !== undefined) {
      entriesToUpdate.push(['finance.commission_rate_bps', updates.commissionRateBps.toString(), 'int']);
    }
    if (updates.commissionRounding !== undefined) {
      entriesToUpdate.push(['finance.commission_rounding', updates.commissionRounding, 'string']);
    }
    if (updates.vatRateBps !== undefined) {
      entriesToUpdate.push(['finance.vat_rate_bps', updates.vatRateBps.toString(), 'int']);
    }
    if (updates.vatJurisdiction !== undefined) {
      entriesToUpdate.push(['finance.vat_jurisdiction', updates.vatJurisdiction, 'string']);
    }
    if (updates.withholdingRateBps !== undefined) {
      entriesToUpdate.push(['finance.withholding_rate_bps', updates.withholdingRateBps.toString(), 'int']);
    }
    if (updates.refundDualApprovalThresholdMinor !== undefined) {
      entriesToUpdate.push(['finance.refund_dual_approval_threshold_minor', updates.refundDualApprovalThresholdMinor.toString(), 'bigint']);
    }
    if (updates.payoutDualApprovalThresholdMinor !== undefined) {
      entriesToUpdate.push(['finance.payout_dual_approval_threshold_minor', updates.payoutDualApprovalThresholdMinor.toString(), 'bigint']);
    }
    if (updates.escrowReleaseTrigger !== undefined) {
      entriesToUpdate.push(['finance.escrow_release_trigger', updates.escrowReleaseTrigger, 'string']);
    }
    if (updates.escrowReleaseDelayHours !== undefined) {
      entriesToUpdate.push(['finance.escrow_release_delay_hours', updates.escrowReleaseDelayHours.toString(), 'int']);
    }
    if (updates.payoutSchedule !== undefined) {
      entriesToUpdate.push(['finance.payout_schedule', updates.payoutSchedule, 'string']);
    }
    if (updates.payoutCutoffTime !== undefined) {
      entriesToUpdate.push(['finance.payout_cutoff_time', updates.payoutCutoffTime, 'string']);
    }
    if (updates.liveCaptureEnabled !== undefined) {
      entriesToUpdate.push(['finance.live_capture_enabled', updates.liveCaptureEnabled ? 'true' : 'false', 'boolean']);
    }
    if (updates.liveRefundsEnabled !== undefined) {
      entriesToUpdate.push(['finance.live_refunds_enabled', updates.liveRefundsEnabled ? 'true' : 'false', 'boolean']);
    }
    if (updates.livePayoutsEnabled !== undefined) {
      entriesToUpdate.push(['finance.live_payouts_enabled', updates.livePayoutsEnabled ? 'true' : 'false', 'boolean']);
    }
    if (updates.autoReleaseEnabled !== undefined) {
      entriesToUpdate.push(['finance.auto_release_enabled', updates.autoReleaseEnabled ? 'true' : 'false', 'boolean']);
    }

    for (const [key, value, type] of entriesToUpdate) {
      let item = await this.settingsRepo.findOne({ where: { key } });
      if (!item) {
        item = this.settingsRepo.create({ key, value, type, updatedById: actor.id });
      } else {
        item.value = value;
        item.updatedById = actor.id;
      }
      await this.settingsRepo.save(item);
    }

    const after = await this.getAllSettings();

    await this.auditService.record({
      actor,
      action: 'finance.settings_changed',
      entityType: 'finance_settings',
      entityId: 'global',
      before,
      after,
      metadata: { reason },
      ipAddress: context?.ipAddress ?? null,
      userAgent: context?.userAgent ?? null,
    });

    return after;
  }
}
