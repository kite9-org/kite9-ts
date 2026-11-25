import { Dimension } from "@kite9/model";
import type { Direction } from "@kite9/model";
import { stringHashCode } from "../../common/equality.js";
import { Pair } from "../../common/objects/Pair.js";
import { LogicException } from "../../logging/LogicException.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";

/**
 * Kotlin `C2Point`: an (unordered) pair of perpendicular slideables plus a direction of travel.
 */
export class RoutePoint extends Pair<CompactionSlideable> {
  constructor(
    along: CompactionSlideable,
    perp: CompactionSlideable,
    readonly d: Direction,
  ) {
    super(along, perp);
  }

  get(d: Dimension): CompactionSlideable {
    if (this.a.dimension === d) {
      return this.a;
    } else if (this.b.dimension === d) {
      return this.b;
    } else {
      throw new LogicException(`Couldn't find slideable in dimension ${d}`);
    }
  }

  samePlace(p: RoutePoint): boolean {
    return p.get(Dimension.H) === this.get(Dimension.H) && p.get(Dimension.V) === this.get(Dimension.V);
  }

  override equals(other: unknown): boolean {
    return other instanceof RoutePoint && super.equals(other) && this.d === other.d;
  }

  override hashCode(): number {
    return (super.hashCode() + stringHashCode(this.d)) | 0;
  }

  override toString(): string {
    return `[${this.get(Dimension.H).number},${this.get(Dimension.V).number} ${this.d}]`;
  }

  getAlong(): CompactionSlideable {
    return this.a;
  }

  getPerp(): CompactionSlideable {
    return this.b;
  }
}
