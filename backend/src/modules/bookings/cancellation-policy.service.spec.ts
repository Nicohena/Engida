import { CancellationPolicyTier } from './entities/cancellation-policy';
import { previewCancellationPolicy } from './cancellation-policy.service';

describe('previewCancellationPolicy', () => {
  const now = new Date('2026-05-01T09:00:00.000Z');

  it('returns a full refund for a moderate cancellation at least five days ahead', () => {
    const preview = previewCancellationPolicy({
      policyTier: CancellationPolicyTier.MODERATE,
      checkInDate: '2026-05-07',
      totalPrice: 4200,
      now,
    });

    expect(preview.refundPercent).toBe(100);
    expect(preview.refundAmount).toBe('4200.00');
    expect(preview.policyLabel).toBe('Moderate');
  });

  it('returns half of the stay for a moderate cancellation inside five days', () => {
    const preview = previewCancellationPolicy({
      policyTier: CancellationPolicyTier.MODERATE,
      checkInDate: '2026-05-03',
      totalPrice: 1000.5,
      now,
    });

    expect(preview.refundPercent).toBe(50);
    expect(preview.refundAmount).toBe('500.25');
  });

  it('returns nothing inside 24 hours', () => {
    const preview = previewCancellationPolicy({
      policyTier: CancellationPolicyTier.FLEXIBLE,
      checkInDate: '2026-05-01',
      totalPrice: 900,
      now,
    });

    expect(preview.refundPercent).toBe(0);
    expect(preview.refundAmount).toBe('0.00');
  });

  it('uses moderate rules for an unknown policy value', () => {
    const preview = previewCancellationPolicy({
      policyTier: 'SOMETHING_ELSE',
      checkInDate: '2026-05-10',
      totalPrice: '100.10',
      now,
    });

    expect(preview.policyTier).toBe(CancellationPolicyTier.MODERATE);
    expect(preview.refundAmount).toBe('100.10');
  });
});
