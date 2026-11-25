import { BasicBounds } from "../objects/BasicBounds.js";
import type { Bounds } from "../objects/Bounds.js";

/** Kotlin `Map<String, Float?>`. */
export type Hints = ReadonlyMap<string, number | null | undefined>;

const f = Math.fround;

/**
 * Standalone distance calculation functions to replace deprecated PositioningHints functions.
 */
export function planarizationDistance(a: Hints, b: Hints): number | null {
  const xD = scalarDistance(a, b, "px1", "px2");
  const yD = scalarDistance(a, b, "py1", "py2");
  return xD == null || yD == null ? null : f(xD + yD);
}

export function positionDistance(a: Hints, b: Hints): number | null {
  const xD = scalarDistance(a, b, "x1", "x2");
  const yD = scalarDistance(a, b, "y1", "y2");
  return xD == null || yD == null ? null : f(xD + yD);
}

function scalarDistance(a: Hints, b: Hints, b1: string, b2: string): number | null {
  return boundsDistance(createBounds(a, b1, b2), createBounds(b, b1, b2));
}

function boundsDistance(aBounds: Bounds | null, bBounds: Bounds | null): number | null {
  if (aBounds == null || bBounds == null) {
    return null;
  }
  if (aBounds.distanceMax < bBounds.distanceMin) {
    return f(bBounds.distanceMin - aBounds.distanceMax);
  } else if (aBounds.distanceMin > bBounds.distanceMax) {
    return f(aBounds.distanceMin - bBounds.distanceMax);
  } else {
    return 0;
  }
}

function createBounds(a: Hints, b1: string, b2: string): Bounds | null {
  const min = a.get(b1);
  const max = a.get(b2);
  return min == null || max == null ? null : new BasicBounds(min, max);
}

export function compareEitherXBounds(from: Hints, to: Hints): number | null {
  return compareEitherBounds(from, to, "px1", "px2", "x1", "x2");
}

export function compareEitherYBounds(from: Hints, to: Hints): number | null {
  return compareEitherBounds(from, to, "py1", "py2", "y1", "y2");
}

function compareEitherBounds(
  from: Hints,
  to: Hints,
  p1: string,
  p2: string,
  a1: string,
  a2: string,
): number | null {
  let bc = compareBounds(from, to, p1, p2);
  if (bc == null || bc === 0) {
    bc = compareBounds(from, to, a1, a2);
  }
  return bc;
}

function compareBounds(from: Hints, to: Hints, p1: string, p2: string): number | null {
  const fb = createBounds(from, p1, p2);
  const tb = createBounds(to, p1, p2);
  return fb == null || tb == null ? null : fb.compareTo(tb);
}
