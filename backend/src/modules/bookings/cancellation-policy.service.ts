import { CancellationPolicyTier } from './entities/cancellation-policy';
import { percentageOf } from '../../lib/money';

export interface CancellationPolicyPreview {
  policyTier: CancellationPolicyTier;
  policyLabel: string;
  refundPercent: number;
  refundAmount: string;
  currency: string;
  hoursUntilCheckIn: number;
  rule: string;
  evaluatedAt: string;
}

interface PreviewInput {
  policyTier?: CancellationPolicyTier | string | null;
  checkInDate: string;
  totalPrice: string | number;
  currency?: string | null;
  now?: Date;
}

const POLICY_LABELS: Record<CancellationPolicyTier, string> = {
  [CancellationPolicyTier.FLEXIBLE]: 'Flexible',
  [CancellationPolicyTier.MODERATE]: 'Moderate',
  [CancellationPolicyTier.STRICT]: 'Strict',
};

function normalizePolicy(
  value: CancellationPolicyTier | string | null | undefined,
): CancellationPolicyTier {
  if (
    value === CancellationPolicyTier.FLEXIBLE ||
    value === CancellationPolicyTier.MODERATE ||
    value === CancellationPolicyTier.STRICT
  ) {
    return value;
  }
  return CancellationPolicyTier.MODERATE;
}

/**
 * Deterministic policy preview. This is deliberately side-effect free: no
 * refund is issued and no PSP is contacted. The result is a snapshot stored on
 * a cancellation request for later finance review.
 */
export function previewCancellationPolicy({
  policyTier,
  checkInDate,
  totalPrice,
  currency,
  now = new Date(),
}: PreviewInput): CancellationPolicyPreview {
  const policy = normalizePolicy(policyTier);
  const checkIn = new Date(`${checkInDate}T00:00:00.000Z`).getTime();
  const hoursUntilCheckIn = Number.isFinite(checkIn)
    ? Math.floor((checkIn - now.getTime()) / 3_600_000)
    : 0;

  let refundPercent = 0;
  let rule = '';

  if (policy === CancellationPolicyTier.FLEXIBLE) {
    refundPercent = hoursUntilCheckIn >= 24 ? 100 : 0;
    rule =
      hoursUntilCheckIn >= 24
        ? 'Free cancellation until 24 hours before check-in.'
        : 'Less than 24 hours before check-in; the stay is non-refundable.';
  } else if (policy === CancellationPolicyTier.STRICT) {
    refundPercent = hoursUntilCheckIn >= 168 ? 50 : 0;
    rule =
      hoursUntilCheckIn >= 168
        ? '50% refund when cancelled at least 7 days before check-in.'
        : 'Less than 7 days before check-in; the stay is non-refundable.';
  } else {
    if (hoursUntilCheckIn >= 120) {
      refundPercent = 100;
      rule = 'Full refund when cancelled at least 5 days before check-in.';
    } else if (hoursUntilCheckIn >= 24) {
      refundPercent = 50;
      rule = '50% refund when cancelled 1–5 days before check-in.';
    } else {
      refundPercent = 0;
      rule = 'Less than 24 hours before check-in; the stay is non-refundable.';
    }
  }

  return {
    policyTier: policy,
    policyLabel: POLICY_LABELS[policy],
    refundPercent,
    refundAmount: percentageOf(totalPrice, refundPercent),
    currency: currency || 'ETB',
    hoursUntilCheckIn,
    rule,
    evaluatedAt: now.toISOString(),
  };
}
