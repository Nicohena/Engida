import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { JobRun, JobRunStatus } from '../entities/job-run.entity';
import { EscrowService } from './escrow.service';
import { PayoutsService } from './payouts.service';
import { LedgerService } from './ledger.service';
import { ReconciliationService } from './reconciliation.service';
import { FinanceSettingsService } from './finance-settings.service';

// Stable 32-bit advisory lock keys for finance jobs
const LOCK_ESCROW_RELEASE = 98127301;
const LOCK_DAILY_PAYOUT = 98127302;
const LOCK_INVARIANT_CHECK = 98127303;

@Injectable()
export class FinanceJobsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(FinanceJobsService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(JobRun)
    private readonly jobRunRepo: Repository<JobRun>,
    private readonly escrowService: EscrowService,
    private readonly payoutsService: PayoutsService,
    private readonly ledgerService: LedgerService,
    private readonly reconciliationService: ReconciliationService,
    private readonly settingsService: FinanceSettingsService,
  ) {}

  onModuleInit() {
    // Schedule periodic job check every 60 seconds (or on-demand)
    // Runs behind advisory lock so multiple instances don't compete
    this.timer = setInterval(() => {
      this.runPeriodicTasks().catch((err) => {
        this.logger.error(`Periodic finance tasks error: ${err.message}`);
      });
    }, 60000);
  }

  onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  /**
   * Helper that executes a job with a Postgres advisory lock and records job_run history.
   */
  async runWithAdvisoryLock<T>(
    lockKey: number,
    jobName: string,
    action: () => Promise<{ counts?: Record<string, any>; result?: T }>,
  ): Promise<{ executed: boolean; status: string; result?: T }> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();

    try {
      // Try to acquire Postgres session-level advisory lock
      const lockRes = await queryRunner.query(
        'SELECT pg_try_advisory_lock($1) AS acquired',
        [lockKey],
      );
      const acquired = lockRes[0]?.acquired === true;

      if (!acquired) {
        this.logger.log(`Skipping job "${jobName}": lock ${lockKey} already held by another worker`);
        return { executed: false, status: 'LOCKED' };
      }

      // Record job start
      const run = this.jobRunRepo.create({
        jobName,
        status: JobRunStatus.RUNNING,
        startedAt: new Date(),
      });
      await this.jobRunRepo.save(run);

      try {
        const { counts, result } = await action();
        run.status = JobRunStatus.SUCCEEDED;
        run.finishedAt = new Date();
        run.counts = counts || null;
        await this.jobRunRepo.save(run);
        return { executed: true, status: 'SUCCEEDED', result };
      } catch (err: any) {
        run.status = JobRunStatus.FAILED;
        run.finishedAt = new Date();
        run.error = err.message || String(err);
        await this.jobRunRepo.save(run);
        this.logger.error(`Job "${jobName}" failed: ${err.message}`);
        throw err;
      } finally {
        await queryRunner.query('SELECT pg_advisory_unlock($1)', [lockKey]);
      }
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Escrow release job.
   */
  async runEscrowReleaseJob() {
    return this.runWithAdvisoryLock(LOCK_ESCROW_RELEASE, 'escrow_release', async () => {
      const { processedCount, errors } = await this.escrowService.processEligibleReleases();
      return { counts: { processedCount, errorCount: errors.length } };
    });
  }

  /**
   * Daily payout generation job.
   */
  async runDailyPayoutJob() {
    return this.runWithAdvisoryLock(LOCK_DAILY_PAYOUT, 'daily_payout', async () => {
      const { draftedCount, totalAmountMinor, payoutIds } =
        await this.payoutsService.generateDailyPayoutBatch();
      return {
        counts: {
          draftedCount,
          totalAmountMinor: totalAmountMinor.toString(),
          payoutCount: payoutIds.length,
        },
      };
    });
  }

  /**
   * Nightly ledger invariant verification job.
   */
  async runInvariantCheckJob() {
    return this.runWithAdvisoryLock(LOCK_INVARIANT_CHECK, 'invariant_check', async () => {
      const result = await this.ledgerService.checkInvariants();
      if (!result.isHealthy) {
        this.logger.error(`Ledger invariant check failed: ${result.violations.join(', ')}`);
      }
      return { counts: { healthy: result.isHealthy, violationCount: result.violations.length } };
    });
  }

  /**
   * Periodically evaluated tasks (runs escrow release and checks payout trigger).
   */
  private async runPeriodicTasks() {
    const settings = await this.settingsService.getAllSettings();
    if (settings.autoReleaseEnabled) {
      await this.runEscrowReleaseJob().catch(() => null);
    }
  }
}
