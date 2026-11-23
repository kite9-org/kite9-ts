/** Stable identity for diagram elements. */
export interface Deterministic {
  getID(): string;
}

export interface Comparable<T> {
  compareTo(other: T): number;
}

/** Horizontal / vertical axis. */
export enum Dimension {
  H = "H",
  V = "V",
}

export function isHoriz(value: Dimension): boolean {
  return value === Dimension.H;
}

export function otherDimension(value: Dimension): Dimension {
  return value === Dimension.H ? Dimension.V : Dimension.H;
}

/** Inclusive integer range used by grid positions. */
export interface IntegerRange {
  readonly from: number;
  readonly to: number;
}

export function integerRange(from: number, to: number): IntegerRange {
  return { from, to };
}

/** A range with from > to is treated as unset (Kotlin IntegerRange.notSet). */
export function integerRangeNotSet(r: IntegerRange | null | undefined): boolean {
  return r == null || r.from > r.to;
}

export interface OPair<X> {
  readonly a: X;
  readonly b: X;
}

export interface LongFraction {
  readonly numerator: number;
  readonly denominator: number;
}
