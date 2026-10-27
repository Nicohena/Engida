import { CasePriority, CaseStatus } from './entities/case.entity';
import {
  computeCaseSla,
  isFirstResponseOverdue,
  isResolutionOverdue,
} from './case-sla';

describe('case SLA helpers', () => {
  it('assigns tighter deadlines to urgent cases', () => {
    const createdAt = new Date('2026-05-01T08:00:00.000Z');
    const sla = computeCaseSla(CasePriority.URGENT, createdAt);

    expect(sla.firstResponseDueAt.toISOString()).toBe('2026-05-01T10:00:00.000Z');
    expect(sla.resolutionDueAt.toISOString()).toBe('2026-05-02T08:00:00.000Z');
  });

  it('falls back to normal deadlines for an unknown priority', () => {
    const createdAt = new Date('2026-05-01T08:00:00.000Z');
    const sla = computeCaseSla('WHENEVER', createdAt);

    expect(sla.firstResponseDueAt.toISOString()).toBe('2026-05-01T16:00:00.000Z');
    expect(sla.resolutionDueAt.toISOString()).toBe('2026-05-04T08:00:00.000Z');
  });

  it('does not flag terminal cases as overdue', () => {
    const now = new Date('2026-05-10T10:00:00.000Z');
    const base = {
      resolutionDueAt: new Date('2026-05-01T10:00:00.000Z'),
      firstResponseDueAt: new Date('2026-05-01T10:00:00.000Z'),
      firstRespondedAt: null,
    };

    expect(
      isFirstResponseOverdue({ ...base, status: CaseStatus.OPEN }, now),
    ).toBe(true);
    expect(
      isFirstResponseOverdue({ ...base, status: CaseStatus.RESOLVED }, now),
    ).toBe(false);
    expect(
      isResolutionOverdue({ ...base, status: CaseStatus.CLOSED }, now),
    ).toBe(false);
  });
});
