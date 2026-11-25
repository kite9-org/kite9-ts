import type { LongFraction } from "@kite9/model";

export type { LongFraction };

export function gcd(a: number, b: number): number {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b !== 0) {
    [a, b] = [b, a % b];
  }
  return a;
}

/** Kotlin `LongFraction.getReducedFraction(n, d)`: lowest-terms fraction with positive denominator. */
export function getReducedFraction(
  numerator: number,
  denominator: number,
): LongFraction {
  if (denominator === 0) {
    throw new Error("Zero denominator in fraction");
  }
  if (numerator === 0) {
    return { numerator: 0, denominator: 1 };
  }
  const sign = denominator < 0 ? -1 : 1;
  const g = gcd(numerator, denominator) || 1;
  return {
    numerator: (sign * numerator) / g,
    denominator: (sign * denominator) / g,
  };
}
