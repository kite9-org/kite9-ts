import type { Rectangular } from "@kite9/model";
import { LogicException } from "../../logging/LogicException.js";
import { getMargin } from "../AbstractCompactionStep.js";
import { Purpose } from "../anchors/IntersectAnchor.js";
import { OrbitAnchor } from "../anchors/OrbitAnchor.js";
import { CompactionSlideable } from "../CompactionSlideable.js";
import { Side } from "../Side.js";
import { SlackOptimisation } from "../SlackOptimisation.js";
import type { RectangularSlideableSet } from "./RectangularSlideableSet.js";
import type { RoutableSlideableSet } from "./RoutableSlideableSet.js";
import { RoutableSlideableSetImpl } from "./RoutableSlideableSetImpl.js";

export class RectangularSlideableSetImpl implements RectangularSlideableSet {
  readonly kind = "rectangular" as const;

  done = false;

  constructor(
    readonly e: Rectangular,
    readonly l: CompactionSlideable,
    readonly r: CompactionSlideable,
    readonly number: number = SlackOptimisation.nextNumber(),
  ) {}

  replace(s: CompactionSlideable, withS: CompactionSlideable): RectangularSlideableSet {
    this.done = true;
    return new RectangularSlideableSetImpl(
      this.e,
      this.l === s ? withS : this.l,
      this.r === s ? withS : this.r,
    );
  }

  getRectangularSlideables(): ReadonlySet<CompactionSlideable> {
    return new Set([this.l, this.r]);
  }

  getAll(): ReadonlySet<CompactionSlideable> {
    return new Set([this.l, this.r]);
  }

  wrapInRoutable(): RoutableSlideableSet | null {
    const so = this.l.so;
    const existing = so.getContainers(this);
    if (existing.size === 1) {
      return existing.values().next().value!;
    } else if (existing.size > 1) {
      throw new LogicException("Too many containers");
    }

    if (this.e.getParent() == null) {
      return null;
    }

    const d = this.l.dimension;
    const bl = new CompactionSlideable(so, d, [new OrbitAnchor(this.e, Side.START)]);
    const br = new CompactionSlideable(so, d, [new OrbitAnchor(this.e, Side.END)]);

    const margin = getMargin(d, this.e);

    const intersection = CompactionSlideable.forIntersection(
      so,
      d,
      this.e,
      Purpose.GLYPH_LAYOUT_MIDPOINT,
    );
    const size = this.l.minimumDistanceTo(this.r);

    so.ensureMinimumDistance(bl, this.l, Math.trunc(margin[0] / 2));
    so.ensureMinimumDistance(this.r, br, Math.trunc(margin[1] / 2));
    so.ensureMinimumDistance(this.l, intersection, Math.trunc(size / 2));
    so.ensureMinimumDistance(intersection, this.r, Math.trunc(size / 2));

    so.compaction.copyNeighbourMap(this.l, bl);
    so.compaction.copyNeighbourMap(this.r, br);

    return new RoutableSlideableSetImpl(intersection, bl, br);
  }

  toString(): string {
    return `RectangularSlideableSetImpl(number=${this.number}\t d=${String(this.e)},\n\t l=${this.l.number},\n\t r=${this.r.number},\n\t done=${this.done})`;
  }
}
