import { Dimension, Direction } from "@kite9/model";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RoutePoint } from "./RoutePoint.js";

/**
 * Kotlin `C2Coords`: keeps track of the bounds a route point could occupy.
 */
export class RouteCoords {
  constructor(
    readonly h: number,
    readonly v: number,
  ) {}

  isInBounds(s: CompactionSlideable, d: Direction): boolean {
    switch (d) {
      case Direction.DOWN:
        return s.minimumPosition >= this.v;
      case Direction.UP:
        return s.minimumPosition <= this.v;
      case Direction.LEFT:
        return s.minimumPosition <= this.h;
      case Direction.RIGHT:
        return s.minimumPosition >= this.h;
    }
  }

  absoluteDistance(o: RouteCoords): number {
    return Math.abs(this.v - o.v) + Math.abs(this.h - o.h);
  }

  distanceTo(p: RoutePoint): number {
    return this.absoluteDistance(RouteCoords.createFollowingCoords(this, p));
  }

  equals(other: unknown): boolean {
    return other instanceof RouteCoords && other.h === this.h && other.v === this.v;
  }

  toString(): string {
    return `C2Coords(h=${this.h}, v=${this.v})`;
  }

  static emptyCoords(): RouteCoords {
    return new RouteCoords(0, 0);
  }

  static createInitialCoords(p: RoutePoint): RouteCoords {
    const hp = p.get(Dimension.H);
    const vp = p.get(Dimension.V);
    return new RouteCoords(hp.minimumPosition, vp.minimumPosition);
  }

  private static mergeCoords(b1: RouteCoords, b2: RouteCoords, d: Direction): RouteCoords {
    switch (d) {
      case Direction.LEFT:
        return new RouteCoords(Math.min(b1.h, b2.h), b2.v);
      case Direction.RIGHT:
        return new RouteCoords(Math.max(b1.h, b2.h), b2.v);
      case Direction.UP:
        return new RouteCoords(b2.h, Math.min(b1.v, b2.v));
      case Direction.DOWN:
        return new RouteCoords(b2.h, Math.max(b1.v, b2.v));
    }
  }

  static createFollowingCoords(b: RouteCoords, p: RoutePoint): RouteCoords {
    const nb = RouteCoords.createInitialCoords(p);
    return RouteCoords.mergeCoords(b, nb, p.d);
  }
}
