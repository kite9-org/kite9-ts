import type { Direction, Layout } from "@kite9/model";
import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";
import type { Bounds } from "../../../common/objects/Bounds.js";
import { PositionRoutingInfo } from "./PositionRoutingInfo.js";
import type { DPos, RoutableHandler2D } from "./RoutableHandler2D.js";

class EmptyPositionRoutingInfo extends PositionRoutingInfo {
  centerY(): number {
    return 0.0;
  }

  getMinX(): number {
    return 0.0;
  }

  getMaxX(): number {
    return 0.0;
  }

  getMinY(): number {
    return 0.0;
  }

  getMaxY(): number {
    return 0.0;
  }

  getWidth(): number {
    return 0.0;
  }

  getHeight(): number {
    return 0.0;
  }

  centerX(): number {
    return 0.0;
  }

  compareTo(_other: RoutingInfo): number {
    throw new Error("Can't compare empty bounds");
  }

  compareX(_with: RoutingInfo): number {
    throw new Error("Can't compare empty bounds");
  }

  compareY(_with: RoutingInfo): number {
    throw new Error("Can't compare empty bounds");
  }
}

/**
 * A simple manhattan distance metric is used to identify the cost of the arrangement, so each
 * RoutingInfo is based on position. This class handles pretty much all of the cost arrangements and
 * distance calculations.
 */
export abstract class AbstractPositionRoutableReader implements RoutableHandler2D {
  static readonly EMPTY_BOUNDS: PositionRoutingInfo = new EmptyPositionRoutingInfo();

  private minDist(min1: number, max1: number, min2: number, max2: number): number {
    if (min2 > min1) {
      return min2 < max1 ? 0.0 : min2 - max1;
    } else {
      return max2 > min1 ? 0.0 : min1 - max2;
    }
  }

  cost(from: RoutingInfo, to: RoutingInfo): number {
    const fd = from as PositionRoutingInfo;
    const td = to as PositionRoutingInfo;
    return (
      this.minDist(fd.getMinX(), fd.getMaxX(), td.getMinX(), td.getMaxX()) +
      this.minDist(fd.getMinY(), fd.getMaxY(), td.getMinY(), td.getMaxY())
    );
  }

  private narrowRange(a1: number, a2: number, b1: number, b2: number): number[] {
    if (a2 < b1) {
      return [b1, b1, b1 - a2];
    } else if (a1 > b2) {
      return [b2, b2, a1 - b2];
    } else {
      return [Math.max(a1, b1), Math.min(a2, b2), 0.0];
    }
  }

  emptyBounds(): RoutingInfo {
    return AbstractPositionRoutableReader.EMPTY_BOUNDS;
  }

  isEmptyBounds(bounds: RoutingInfo): boolean {
    return bounds === AbstractPositionRoutableReader.EMPTY_BOUNDS;
  }

  isInPlane(to: RoutingInfo, from: RoutingInfo, horiz: boolean): boolean {
    const pto = to as PositionRoutingInfo;
    const pfrom = from as PositionRoutingInfo;
    return horiz ? this.checkHorizontal(pto, pfrom) : this.checkVertical(pto, pfrom);
  }

  private checkHorizontal(pto: PositionRoutingInfo, pfrom: PositionRoutingInfo): boolean {
    return (
      this.narrowRange(pto.getMinX(), pto.getMaxX(), pfrom.getMinX(), pfrom.getMaxX())[2] === 0.0
    );
  }

  private checkVertical(pto: PositionRoutingInfo, pfrom: PositionRoutingInfo): boolean {
    return (
      this.narrowRange(pto.getMinY(), pto.getMaxY(), pfrom.getMinY(), pfrom.getMaxY())[2] === 0.0
    );
  }

  abstract getPlacedPosition(r: unknown): RoutingInfo | null;
  abstract isWithin(area: RoutingInfo, pos: RoutingInfo): boolean;
  abstract increaseBounds(a: RoutingInfo, b: RoutingInfo): RoutingInfo;
  abstract overlaps(a: RoutingInfo, b: RoutingInfo): boolean;
  abstract overlaps(a: Bounds, b: Bounds): boolean;
  abstract getPosition(r: unknown, horiz: boolean): Bounds | null;
  abstract getTempPosition(r: unknown, horiz: boolean): Bounds | null;
  abstract setPlacedPosition(r: unknown, ri: Bounds, horiz: boolean): void;
  abstract setPlacedPosition(a: unknown, cri: RoutingInfo): void;
  abstract setTempPosition(r: unknown, ri: Bounds, horiz: boolean): void;
  abstract clearTempPositions(horiz: boolean): void;
  abstract getTopLevelBounds(horiz: boolean): Bounds;
  abstract portEdge(direction: Direction, b: Bounds, horiz: boolean): Bounds;
  abstract narrow(layout: Layout | null, b: Bounds, horiz: boolean): Bounds;
  abstract narrow(
    bounds: RoutingInfo | null,
    vertexTrimX: number,
    vertexTrimY: number,
  ): RoutingInfo | null;
  abstract createRouting(x: Bounds, y: Bounds): RoutingInfo;
  abstract outputSettings(): void;
  abstract getBoundsOf(ri: RoutingInfo | null, horiz: boolean): Bounds;
  abstract compare(a: unknown, b: unknown, horiz: boolean): DPos;
  abstract compareBounds(ab: Bounds, bb: Bounds): DPos;
  abstract distance(from: RoutingInfo, to: RoutingInfo, horiz: boolean): number;
  abstract order(a: RoutingInfo, b: RoutingInfo): number;
}
