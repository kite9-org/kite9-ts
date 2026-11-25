import type { Comparable, LongFraction } from "@kite9/model";

export interface Bounds extends Comparable<Bounds> {
  readonly distanceMin: number;
  readonly distanceMax: number;
  readonly distanceCenter: number;

  /** Returns a new bounds large enough to take both this and other. */
  expand(other: Bounds): Bounds;

  /** Returns a new bounds with just the common distance inside. */
  narrow(other: Bounds): Bounds;
  narrow(trim: number): Bounds;
  keep(buffer: number, width: number, atFraction: LongFraction | number): Bounds;

  size(): number;
}
