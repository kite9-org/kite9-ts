import type { Hints } from "./DistanceFunctions.js";

/**
 * Hint-key constants and merge helpers from Kotlin `PositioningHints` (deprecated there; the
 * distance functions live in DistanceFunctions.ts).
 */
export const PLAN_MIN_X = "px1";
export const PLAN_MAX_X = "px2";
export const PLAN_MIN_Y = "py1";
export const PLAN_MAX_Y = "py2";
export const MIN_X = "x1";
export const MAX_X = "x2";
export const MIN_Y = "y1";
export const MAX_Y = "y2";

export enum Approach {
  MAX = "MAX",
  MIN = "MIN",
}

export function mergeApproach(
  approach: Approach,
  a: number | null | undefined,
  b: number | null | undefined,
): number | null {
  if (a == null) return b ?? null;
  if (b == null) return a;
  return approach === Approach.MAX ? Math.max(a, b) : Math.min(a, b);
}

export const PLANARIZATION_HINTS: Map<string, Approach> = new Map([
  [PLAN_MIN_X, Approach.MIN],
  [PLAN_MIN_Y, Approach.MIN],
  [PLAN_MAX_X, Approach.MAX],
  [PLAN_MAX_Y, Approach.MAX],
]);

export const POSITION_HINTS: Map<string, Approach> = new Map([
  [MIN_X, Approach.MIN],
  [MIN_Y, Approach.MIN],
  [MAX_X, Approach.MAX],
  [MAX_Y, Approach.MAX],
]);

export const ALL_HINTS: Map<string, Approach> = new Map([
  ...PLANARIZATION_HINTS,
  ...POSITION_HINTS,
]);

export function mergeHints(a: Hints, b: Hints): Map<string, number | null> {
  const out = new Map<string, number | null>();
  if (a.size === 0 && b.size === 0) {
    return out;
  }
  for (const [k, v] of ALL_HINTS) {
    out.set(k, mergeApproach(v, a.get(k), b.get(k)));
  }
  return out;
}

export function writeHints(
  from: ReadonlyMap<string, number | null | undefined>,
  to: Map<string, number | null>,
  hints: ReadonlyMap<string, Approach>,
): void {
  for (const h of hints.keys()) {
    const v = from.get(h);
    if (v != null) {
      to.set(h, v);
    }
  }
}

export function planFill(
  map: Map<string, number | null>,
  px1: number,
  px2: number,
  py1: number,
  py2: number,
): void {
  map.set(PLAN_MIN_X, Math.fround(px1));
  map.set(PLAN_MIN_Y, Math.fround(py1));
  map.set(PLAN_MAX_X, Math.fround(px2));
  map.set(PLAN_MAX_Y, Math.fround(py2));
}
