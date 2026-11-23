import { Measurement } from "@kite9/css";
import type { Comparable, IntegerRange } from "../common.js";
import { integerRangeNotSet } from "../common.js";

/** Discriminator for a position within a container. */
export interface ContainerPosition {}

export interface GridContainerPosition extends ContainerPosition {
  readonly r: IntegerRange;
  isSet(): boolean;
  getFrom(): number;
  getTo(): number;
}

export function gridContainerPosition(
  from: number,
  to: number,
): GridContainerPosition {
  const r = { from, to };
  return {
    r,
    isSet(): boolean {
      return !integerRangeNotSet(r);
    },
    getFrom(): number {
      return r.from;
    },
    getTo(): number {
      return r.to;
    },
  };
}

export function gridContainerPositionToString(
  p: GridContainerPosition,
): string {
  return integerRangeNotSet(p.r) ? "null" : `[${p.r.from},${p.r.to}]`;
}

export interface Placement extends ContainerPosition, Comparable<Placement> {
  readonly type: Measurement;
  readonly amount: number;
}

export function placement(type: Measurement, amount: number): Placement {
  return {
    type,
    amount,
    compareTo(other: Placement): number {
      return this.amount - other.amount;
    },
  };
}

export const PLACEMENT_NONE: Placement = placement(Measurement.PERCENTAGE, 50);
