import { CasePriority, CaseStatus } from './entities/case.entity';

export const FIRST_RESPONSE_HOURS: Record<CasePriority, number> = {
  [CasePriority.URGENT]: 2,
  [CasePriority.HIGH]: 4,
  [CasePriority.NORMAL]: 8,
  [CasePriority.LOW]: 24,
};

export const RESOLUTION_HOURS: Record<CasePriority, number> = {
  [CasePriority.URGENT]: 24,
  [CasePriority.HIGH]: 48,
  [CasePriority.NORMAL]: 72,
  [CasePriority.LOW]: 120,
};

export interface CaseSlaDates {
  firstResponseDueAt: Date;
  resolutionDueAt: Date;
}

export function computeCaseSla(
  priority: CasePriority | string | null | undefined,
  createdAt: Date = new Date(),
): CaseSlaDates {
  const normalized =
    priority === CasePriority.URGENT ||
    priority === CasePriority.HIGH ||
    priority === CasePriority.LOW
      ? priority
      : CasePriority.NORMAL;

  return {
    firstResponseDueAt: new Date(
      createdAt.getTime() + FIRST_RESPONSE_HOURS[normalized] * 3_600_000,
    ),
    resolutionDueAt: new Date(
      createdAt.getTime() + RESOLUTION_HOURS[normalized] * 3_600_000,
    ),
  };
}

export function isTerminalStatus(status: CaseStatus): boolean {
  return status === CaseStatus.RESOLVED || status === CaseStatus.CLOSED;
}

export function isFirstResponseOverdue(
  supportCase: {
    status: CaseStatus;
    firstRespondedAt: Date | null;
    firstResponseDueAt: Date;
  },
  now: Date = new Date(),
): boolean {
  return (
    !isTerminalStatus(supportCase.status) &&
    !supportCase.firstRespondedAt &&
    supportCase.firstResponseDueAt.getTime() < now.getTime()
  );
}

export function isResolutionOverdue(
  supportCase: {
    status: CaseStatus;
    resolutionDueAt: Date;
  },
  now: Date = new Date(),
): boolean {
  return (
    !isTerminalStatus(supportCase.status) &&
    supportCase.resolutionDueAt.getTime() < now.getTime()
  );
}
