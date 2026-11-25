import { Direction, Layout } from "@kite9/model";
import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";
import { BasicBounds } from "../../../common/objects/BasicBounds.js";
import type { Bounds } from "../../../common/objects/Bounds.js";
import { kite9Log, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import { AbstractPositionRoutableReader } from "./AbstractPositionRoutableReader.js";
import { BoundsBasedPositionRoutingInfo } from "./BoundsBasedPositionRoutingInfo.js";
import { DPos, type RoutableHandler2D } from "./RoutableHandler2D.js";
import { Tools } from "./Tools.js";

function isBounds(x: unknown): x is Bounds {
  return typeof (x as Bounds | null)?.distanceMin === "number";
}

/**
 * Implementation of the [RoutableHandler2D] functionality, but using 2D RoutableHandler Bounds as the
 * underlying storage.
 *
 * @author robmoffat
 */
export class PositionRoutableHandler2D
  extends AbstractPositionRoutableReader
  implements RoutableHandler2D, Logable
{
  static readonly TOP = new BasicBounds(0.0, 1.0);
  static readonly THIN_GUTTER = 0.001;
  static readonly THICK_GUTTER = 0.01;
  static readonly TOP_HALF = new BasicBounds(0.0, 0.5);
  static readonly BOTTOM_HALF = new BasicBounds(0.5, 1.0);

  /**
   * Although we have a planarization line (1d) and a set of positions (2d), there is no
   * description of how the planarization line progresses through 2d space. So, we make the
   * assumption that it always moves to the right or down as it goes forward. This assumption
   * appears to be true for all of the test cases we have constructed, but it's not guaranteed
   * by the system, it's only a result of the grid-based layout that we are using.
   */
  static readonly THROW_ON_ASSUMPTION_FAIL = true;
  static readonly OVERLAP: object = {};
  static readonly TOLERANCE = 0.000000001;

  static eq(a: number, b: number): boolean {
    return Math.abs(a - b) < PositionRoutableHandler2D.TOLERANCE;
  }

  static meq(a: number, b: number): boolean {
    return a - b > -PositionRoutableHandler2D.TOLERANCE;
  }

  protected tempx: Map<unknown, Bounds> = new Map();
  protected placedx: Map<unknown, Bounds | null> = new Map();
  protected tempy: Map<unknown, Bounds> = new Map();
  protected placedy: Map<unknown, Bounds | null> = new Map();

  log: Kite9Log = kite9Log(this);

  get prefix(): string {
    return "RH2D";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  getPlacedPosition(r: unknown): RoutingInfo | null {
    const x = this.placedx.get(r);
    const y = this.placedy.get(r);
    return x == null || y == null ? null : this.createRouting(x, y);
  }

  createRouting(x: Bounds, y: Bounds): RoutingInfo {
    return new BoundsBasedPositionRoutingInfo(x, y);
  }

  clearTempPositions(horiz: boolean): void {
    if (horiz) {
      this.tempx.clear();
    } else {
      this.tempy.clear();
    }
  }

  /**
   * Limits to a given side of the parent container. Since ports don't occupy corners (i.e. they
   * are on a given side) this also applies a haircut in other directions too.
   */
  portEdge(d: Direction, b: Bounds, horiz: boolean): Bounds {
    if (horiz) {
      switch (d) {
        case Direction.LEFT:
          return new BasicBounds(b.distanceMin, b.distanceMin);
        case Direction.RIGHT:
          return new BasicBounds(b.distanceMax, b.distanceMax);
        default:
          return b.narrow(b.size() * 0.01);
      }
    } else {
      switch (d) {
        case Direction.UP:
          return new BasicBounds(b.distanceMin, b.distanceMin);
        case Direction.DOWN:
          return new BasicBounds(b.distanceMax, b.distanceMax);
        default:
          return b.narrow(b.size() * 0.01);
      }
    }
  }

  narrow(d: Layout | null, using: Bounds, horiz: boolean): Bounds;
  narrow(
    bounds: RoutingInfo | null,
    vertexTrimX: number,
    vertexTrimY: number,
  ): RoutingInfo | null;
  narrow(
    a: Layout | RoutingInfo | null,
    b: Bounds | number,
    c: boolean | number,
  ): Bounds | RoutingInfo | null {
    if (typeof b === "number") {
      const pri = a as BoundsBasedPositionRoutingInfo;
      return new BoundsBasedPositionRoutingInfo(pri.x.narrow(b), pri.y.narrow(c as number));
    }
    const multiplicationFrame = this.getMultiplicationFrame(a as Layout | null, c as boolean);
    const bbounds = b as BasicBounds;
    const gx =
      bbounds.distanceMin +
      (bbounds.distanceMax - bbounds.distanceMin) * multiplicationFrame.distanceMin;
    const gw =
      (bbounds.distanceMax - bbounds.distanceMin) *
      (multiplicationFrame.distanceMax - multiplicationFrame.distanceMin);
    return new BasicBounds(gx, gx + gw);
  }

  /**
   * Given a direction, returns a rectangle with details of how the coordinates should be
   * multiplied to achieve the new orientation.
   */
  getMultiplicationFrame(d: Layout | null, horiz: boolean): Bounds {
    const P = PositionRoutableHandler2D;
    if (d == null) {
      return P.TOP;
    }
    switch (d) {
      case Layout.LEFT:
        return horiz ? P.TOP_HALF : P.TOP;
      case Layout.UP:
        return horiz ? P.TOP : P.TOP_HALF;
      case Layout.RIGHT:
        return horiz ? P.BOTTOM_HALF : P.TOP;
      case Layout.DOWN:
        return horiz ? P.TOP : P.BOTTOM_HALF;
      default:
        return P.TOP;
    }
  }

  getPosition(r: unknown, horiz: boolean): Bounds | null {
    return (horiz ? this.placedx.get(r) : this.placedy.get(r)) ?? null;
  }

  getTempPosition(r: unknown, horiz: boolean): Bounds | null {
    return (horiz ? this.tempx.get(r) : this.tempy.get(r)) ?? null;
  }

  getTopLevelBounds(_horiz: boolean): Bounds {
    return PositionRoutableHandler2D.TOP;
  }

  setPlacedPosition(r: unknown, ri: Bounds, horiz: boolean): void;
  setPlacedPosition(a: unknown, ri: RoutingInfo): void;
  setPlacedPosition(r: unknown, ri: Bounds | RoutingInfo, horiz?: boolean): void {
    if (horiz === undefined) {
      const cri = ri as RoutingInfo;
      this.setPlacedPosition(r, this.getBoundsOf(cri, true), true);
      this.setPlacedPosition(r, this.getBoundsOf(cri, false), false);
    } else if (horiz) {
      this.placedx.set(r, ri as Bounds);
    } else {
      this.placedy.set(r, ri as Bounds);
    }
  }

  setTempPosition(r: unknown, ri: Bounds, horiz: boolean): void {
    if (horiz) {
      this.tempx.set(r, ri);
    } else {
      this.tempy.set(r, ri);
    }
  }

  outputSettings(): void {
    this.log.send("x positions: ", this.placedx);
    this.log.send("y positions: ", this.placedy);
  }

  getBoundsOf(ri: RoutingInfo | null, horiz: boolean): Bounds {
    const pri = ri as BoundsBasedPositionRoutingInfo;
    return horiz ? pri.x : pri.y;
  }

  compare(a: unknown, b: unknown, horiz: boolean): DPos {
    let ab: Bounds;
    let bb: Bounds;
    if (horiz) {
      ab = a instanceof BoundsBasedPositionRoutingInfo ? a.x : this.placedx.get(a)!;
      bb = b instanceof BoundsBasedPositionRoutingInfo ? b.x : this.placedx.get(b)!;
    } else {
      ab = a instanceof BoundsBasedPositionRoutingInfo ? a.y : this.placedy.get(a)!;
      bb = b instanceof BoundsBasedPositionRoutingInfo ? b.y : this.placedy.get(b)!;
    }
    return this.compareBounds(ab, bb);
  }

  compareBounds(ab: Bounds, bb: Bounds): DPos {
    if (ab.distanceMax <= bb.distanceMin) {
      return DPos.BEFORE;
    } else if (ab.distanceMin >= bb.distanceMax) {
      return DPos.AFTER;
    } else {
      return DPos.OVERLAP;
    }
  }

  overlaps(a: RoutingInfo, b: RoutingInfo): boolean;
  overlaps(a: Bounds, b: Bounds): boolean;
  overlaps(a: RoutingInfo | Bounds, b: RoutingInfo | Bounds): boolean {
    if (isBounds(a) && isBounds(b)) {
      const highestMin = Math.max(a.distanceMin, b.distanceMin);
      const lowestMax = Math.min(a.distanceMax, b.distanceMax);
      return highestMin < lowestMax;
    }
    const ra = a as RoutingInfo;
    const rb = b as RoutingInfo;
    const horizOverlap = this.overlaps(this.getBoundsOf(ra, true), this.getBoundsOf(rb, true));
    const vertOverlap = this.overlaps(this.getBoundsOf(ra, false), this.getBoundsOf(rb, false));
    return horizOverlap && vertOverlap;
  }

  distance(from: RoutingInfo, to: RoutingInfo, horiz: boolean): number {
    const bFrom = this.getBoundsOf(from, horiz);
    const bTo = this.getBoundsOf(to, horiz);
    return bTo.distanceCenter - bFrom.distanceCenter;
  }

  order(a: RoutingInfo, b: RoutingInfo): number {
    const ax = (a as BoundsBasedPositionRoutingInfo).x;
    const bx = (b as BoundsBasedPositionRoutingInfo).x;
    const ay = (a as BoundsBasedPositionRoutingInfo).y;
    const by = (b as BoundsBasedPositionRoutingInfo).y;
    const cx = ax.compareTo(bx);
    const cy = ay.compareTo(by);
    if (cy === 0) {
      return cx;
    } else if (cx === 0) {
      return cy;
    } else if (Math.abs(cx) < Math.abs(cy)) {
      return cx;
    } else {
      return cy;
    }
  }

  isWithin(area: RoutingInfo, pos: RoutingInfo): boolean {
    const areax = (area as BoundsBasedPositionRoutingInfo).x;
    const posx = (pos as BoundsBasedPositionRoutingInfo).x;
    if (!Tools.contains(posx.distanceMin, posx.distanceMin, areax.distanceMin, areax.distanceMax)) {
      return false;
    }
    const areay = (area as BoundsBasedPositionRoutingInfo).y;
    const posy = (pos as BoundsBasedPositionRoutingInfo).y;
    return Tools.contains(posy.distanceMin, posy.distanceMax, areay.distanceMin, areay.distanceMax);
  }

  increaseBounds(a: RoutingInfo, b: RoutingInfo): RoutingInfo {
    if (this.isEmptyBounds(a)) {
      return b;
    } else if (this.isEmptyBounds(b)) {
      return a;
    }
    const ba = a as BoundsBasedPositionRoutingInfo;
    const bb = b as BoundsBasedPositionRoutingInfo;
    return new BoundsBasedPositionRoutingInfo(ba.x.expand(bb.x), ba.y.expand(bb.y));
  }

}
