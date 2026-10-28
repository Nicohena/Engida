/**
 * Money helpers for the operations console.
 *
 * PostgreSQL `numeric`/`decimal` columns are returned as strings by the pg
 * driver. Converting through Number() is acceptable for sorting and display,
 * but calculations that will be stored are performed on integer minor units so
 * we never introduce floating-point drift into an amount.
 */

export interface MoneyLike {
  toString(): string;
}

export function toMinorUnits(value: MoneyLike | number | string | null | undefined): bigint {
  if (value === null || value === undefined) return 0n;

  const raw = String(value).trim();
  if (!raw) return 0n;

  const negative = raw.startsWith('-');
  const normalized = negative ? raw.slice(1) : raw;
  const [wholePart, fractionPart = ''] = normalized.split('.');
  const whole = wholePart.replace(/[^0-9]/g, '') || '0';
  const fraction = (fractionPart.replace(/[^0-9]/g, '') + '00').slice(0, 2);
  const minor = BigInt(whole) * 100n + BigInt(fraction);

  return negative ? -minor : minor;
}

export function fromMinorUnits(minor: bigint): string {
  const negative = minor < 0n;
  const absolute = negative ? -minor : minor;
  const whole = absolute / 100n;
  const fraction = (absolute % 100n).toString().padStart(2, '0');
  return `${negative ? '-' : ''}${whole.toString()}.${fraction}`;
}

export function percentageOf(value: MoneyLike | number | string | null | undefined, percent: number): string {
  const bounded = Math.min(Math.max(Math.trunc(percent), 0), 100);
  const minor = toMinorUnits(value);
  const result = (minor * BigInt(bounded)) / 100n;
  return fromMinorUnits(result);
}

export function formatMinorUnitsAsCurrency(
  value: MoneyLike | number | string | null | undefined,
  currency = 'ETB',
): string {
  return `${currency} ${fromMinorUnits(toMinorUnits(value))}`;
}

export function decimalStringToNumber(value: MoneyLike | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function calculateBasisPoints(
  minorOrValue: bigint | MoneyLike | number | string | null | undefined,
  bps: number,
  rounding: 'DOWN' | 'HALF_UP' = 'HALF_UP',
): bigint {
  const minor = typeof minorOrValue === 'bigint' ? minorOrValue : toMinorUnits(minorOrValue);
  const boundedBps = BigInt(Math.max(0, Math.trunc(bps)));
  if (minor === 0n || boundedBps === 0n) return 0n;

  const product = minor * boundedBps;
  if (rounding === 'DOWN') {
    return product / 10000n;
  }
  // HALF_UP rounding
  return (product + 5000n) / 10000n;
}

