import type { Direction, Layout } from "@kite9/model";
import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";
import type { Bounds } from "../../../common/objects/Bounds.js";

export enum DPos {
  BEFORE,
  OVERLAP,
  AFTER,
}

/**
 * Manages the position of objects in subdividable 2D space.
 *
 * Kotlin overloads are expressed as TypeScript overload signatures:
 * `setPlacedPosition`, `overlaps` and `narrow` each have two forms.
 *
 * @author robmoffat
 */
export interface RoutableHandler2D {
  getPlacedPosition(r: unknown): RoutingInfo | null;

  isWithin(area: RoutingInfo, pos: RoutingInfo): boolean;

  /**
   * Checks that to and from occupy the same horiz/vert plane
   */
  isInPlane(to: RoutingInfo, from: RoutingInfo, horiz: boolean): boolean;

  /**
   * Creates a space containing all the area from/to
   */
  increaseBounds(a: RoutingInfo, b: RoutingInfo): RoutingInfo;

  /**
   * Returns true if there is a common intersection
   */
  overlaps(a: RoutingInfo, b: RoutingInfo): boolean;
  overlaps(a: Bounds, b: Bounds): boolean;

  getPosition(r: unknown, horiz: boolean): Bounds | null;
  getTempPosition(r: unknown, horiz: boolean): Bounds | null;
  setPlacedPosition(r: unknown, ri: Bounds, horiz: boolean): void;
  setPlacedPosition(a: unknown, cri: RoutingInfo): void;
  setTempPosition(r: unknown, ri: Bounds, horiz: boolean): void;
  clearTempPositions(horiz: boolean): void;
  getTopLevelBounds(horiz: boolean): Bounds;
  portEdge(direction: Direction, b: Bounds, horiz: boolean): Bounds;
  narrow(layout: Layout | null, b: Bounds, horiz: boolean): Bounds;
  createRouting(x: Bounds, y: Bounds): RoutingInfo;
  outputSettings(): void;
  getBoundsOf(ri: RoutingInfo | null, horiz: boolean): Bounds;
  compare(a: unknown, b: unknown, horiz: boolean): DPos;
  compareBounds(ab: Bounds, bb: Bounds): DPos;
  distance(from: RoutingInfo, to: RoutingInfo, horiz: boolean): number;

  /**
   * Returns a routing which represents an empty area.
   */
  emptyBounds(): RoutingInfo;

  /**
   * Returns true if the routing info given is the empty bounds.
   */
  isEmptyBounds(bounds: RoutingInfo): boolean;

  /**
   * Works out distance cost of from -> to.
   */
  cost(from: RoutingInfo, to: RoutingInfo): number;

  /**
   * Determines the order the two RI's must be in for the planarization line.  returns -1, 1 or 0 if same
   */
  order(a: RoutingInfo, b: RoutingInfo): number;

  /**
   * Trims an existing bounds by a given amount
   */
  narrow(
    bounds: RoutingInfo | null,
    vertexTrimX: number,
    vertexTrimY: number,
  ): RoutingInfo | null;
}
