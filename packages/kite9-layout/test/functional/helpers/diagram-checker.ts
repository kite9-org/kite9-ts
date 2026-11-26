/**
 * Port of Java `org.kite9.diagram.testing.DiagramChecker` route-direction helpers.
 */

import { Direction, type RouteRenderingInformation } from "@kite9/model";

export const ROUTE_MULTIPLE = "multiple" as const;
export const ROUTE_NONE = "none" as const;

export type RouteDirectionResult =
  | Direction
  | typeof ROUTE_MULTIPLE
  | typeof ROUTE_NONE;

function singleDirection(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
): Direction | null {
  if (y0 === y1 && x0 > x1) return Direction.LEFT;
  if (y0 === y1 && x0 < x1) return Direction.RIGHT;
  if (x0 === x1 && y0 < y1) return Direction.DOWN;
  if (x0 === x1 && y0 > y1) return Direction.UP;
  if (x0 === x1 && y0 === y1) return null;
  throw new Error("Diagonal Route?");
}

/**
 * Net orthogonal direction of an RI polyline, or `multiple` / `none`.
 * Matches Java `DiagramChecker.getRouteDirection`.
 */
export function getRouteDirection(
  rri: RouteRenderingInformation,
): RouteDirectionResult {
  const len = rri.getLength?.() ?? rri.routePositions?.length ?? 0;
  if (len < 2) return ROUTE_NONE;

  let current: RouteDirectionResult = ROUTE_NONE;
  for (let i = 0; i < len - 1; i++) {
    const start =
      rri.getWaypoint?.(i) ?? rri.routePositions?.[i] ?? null;
    const end =
      rri.getWaypoint?.(i + 1) ?? rri.routePositions?.[i + 1] ?? null;
    if (!start || !end) continue;
    const part = singleDirection(start.x(), start.y(), end.x(), end.y());
    if (current === ROUTE_NONE && part != null) {
      current = part;
    } else if (part == null) {
      // zero-length segment
    } else if (part !== current) {
      return ROUTE_MULTIPLE;
    }
  }
  return current;
}
