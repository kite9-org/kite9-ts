import { Dimension, Direction, Measurement } from "@kite9/model";
import type { DiagramElement, Placement, Rectangular, SizedRectangular } from "@kite9/model";
import { isRectangular } from "../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../logging/Kite9Log.js";
import type { Logable } from "../logging/Logable.js";
import type { Group } from "../planarization/rhd/grouping/basic/group/Group.js";
import type { ElementSizer } from "../sizer.js";
import type { Compaction } from "./Compaction.js";
import type { CompactionSlideable } from "./CompactionSlideable.js";
import type { CompactionStep } from "./CompactionStep.js";
import type { RectangularSlideableSet } from "./sets/RectangularSlideableSet.js";
import type { SlideableSet } from "./sets/SlideableSet.js";
import { Side } from "./Side.js";
import type { SlackOptimisation } from "./SlackOptimisation.js";

function isSizedRectangular(r: Rectangular): r is SizedRectangular {
  const s = r as Partial<SizedRectangular>;
  return typeof s.getPadding === "function" && typeof s.getMargin === "function";
}

/** Kotlin `AbstractC2CompactionStep.getPadding` (companion): start/end padding along `d`. */
export function getPadding(d: Dimension, r: Rectangular): [number, number] {
  if (isSizedRectangular(r)) {
    return d === Dimension.H
      ? [Math.trunc(r.getPadding(Direction.LEFT)), Math.trunc(r.getPadding(Direction.RIGHT))]
      : [Math.trunc(r.getPadding(Direction.UP)), Math.trunc(r.getPadding(Direction.DOWN))];
  }
  return [2, 2];
}

/** Kotlin `AbstractC2CompactionStep.getMargin` (companion): start/end margin along `d`. */
export function getMargin(d: Dimension, r: Rectangular): [number, number] {
  if (isSizedRectangular(r)) {
    return d === Dimension.H
      ? [Math.trunc(r.getMargin(Direction.LEFT)), Math.trunc(r.getMargin(Direction.RIGHT))]
      : [Math.trunc(r.getMargin(Direction.UP)), Math.trunc(r.getMargin(Direction.DOWN))];
  }
  return [2, 2];
}

export abstract class AbstractCompactionStep implements CompactionStep, Logable {
  private _log: Kite9Log | null = null;

  constructor(readonly cd: ElementSizer) {}

  get log(): Kite9Log {
    return (this._log ??= kite9Log(this));
  }

  abstract get prefix(): string | null;

  get isLoggingEnabled(): boolean {
    return true;
  }

  abstract compact(c: Compaction, g: Group): void;

  private toSideDirection(s: Side | null, d: Dimension): Direction {
    if (d === Dimension.H) {
      return s === Side.START ? Direction.LEFT : Direction.RIGHT;
    } else {
      return s === Side.START ? Direction.UP : Direction.DOWN;
    }
  }

  private toDirection(d: Dimension): Direction {
    return d === Dimension.H ? Direction.RIGHT : Direction.DOWN;
  }

  getMinimumDistanceBetween(
    a: DiagramElement,
    aSide: Side | null,
    b: DiagramElement,
    bSide: Side | null,
    d: Dimension,
    along: DiagramElement | null,
    concave: boolean,
  ): number {
    const d1 = this.toSideDirection(aSide, d);
    const d2 = this.toSideDirection(bSide, d);
    return this.cd.getMinimumDistanceBetween(a, d1, b, d2, this.toDirection(d), along, concave);
  }

  /**
   * Makes sure that the contents are within the container, with correct spacing either side.
   */
  embed(
    d: Dimension,
    container: RectangularSlideableSet,
    contents: SlideableSet | null,
    cso: SlackOptimisation,
    e: DiagramElement,
  ): void {
    this.log.send(`Embedding ${e} inside ${container}.d`);
    if (contents == null) {
      return;
    }
    if (contents.kind === "rectangular") {
      const distL = this.getMinimumDistanceBetween(
        container.e,
        Side.START,
        contents.e,
        Side.START,
        d,
        null,
        true,
      );
      const distR = this.getMinimumDistanceBetween(
        container.e,
        Side.END,
        contents.e,
        Side.END,
        d,
        null,
        true,
      );
      this.separateRectangular(container, Side.START, contents, Side.START, cso, distL);
      this.separateRectangular(contents, Side.END, container, Side.END, cso, distR);
    } else {
      const leftC = container.l;
      const rightC = container.r;
      const leftI = contents.bl;
      const rightI = contents.br;
      const padding = getPadding(d, container.e);
      if (leftI != null) cso.ensureMinimumDistance(leftC, leftI, Math.trunc(padding[0] / 2));
      if (rightI != null) cso.ensureMinimumDistance(rightI, rightC, Math.trunc(padding[1] / 2));
    }
  }

  /**
   * Ensures that b is after a by a given distance
   */
  separateRectangular(
    a: SlideableSet,
    aSide: Side,
    b: SlideableSet,
    bSide: Side,
    cso: SlackOptimisation,
    dist: number,
  ): void {
    const set1 = cso.getRectangularsOnSide(aSide, a);
    const set2 = cso.getRectangularsOnSide(bSide, b);
    for (const l of set1) {
      for (const r of set2) {
        cso.ensureMinimumDistance(l, r, Math.trunc(dist));
      }
    }
  }

  ensureCentreSlideablePosition(
    cso: SlackOptimisation,
    ss: RectangularSlideableSet,
    c: CompactionSlideable | null,
    pp: Placement,
  ): void {
    if (c != null) {
      const minDist = ss.l.minimumDistanceTo(ss.r);
      if (pp.type === Measurement.PERCENTAGE) {
        const firstDist = minDist * (pp.amount / 100.0);
        const secondDist = minDist * ((100.0 - pp.amount) / 100.0);
        cso.ensureMinimumDistance(ss.l, c, Math.trunc(firstDist));
        cso.ensureMinimumDistance(c, ss.r, Math.trunc(secondDist));
      } else {
        // pixels
        const absAmount = Math.abs(pp.amount);

        if (pp.amount > 0) {
          cso.ensureMinimumDistance(ss.l, c, Math.trunc(absAmount));
          cso.ensureMinimumDistance(c, ss.r, 0);
        } else {
          cso.ensureMinimumDistance(ss.l, c, 0);
          cso.ensureMinimumDistance(c, ss.r, Math.trunc(absAmount));
        }
      }
    }
  }

  visitRectangulars(r: Rectangular, f: (r: Rectangular) => void): void {
    for (const it of r.getContents()) {
      if (isRectangular(it)) this.visitRectangulars(it, f);
    }
    f(r);
  }

  static getPadding = getPadding;
  static getMargin = getMargin;
}
