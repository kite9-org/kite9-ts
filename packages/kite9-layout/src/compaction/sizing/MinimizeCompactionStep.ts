import { DiagramElementSizing, isHoriz } from "@kite9/model";
import type { Connection, Dimension, Rectangular } from "@kite9/model";
import { isConnectedRectangular } from "../../common/elements/TypeGuards.js";
import type { Compaction } from "../Compaction.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";
import { AbstractSizingCompactionStep } from "./AbstractSizingCompactionStep.js";
import { isSizedRectangular } from "./MaximizeCompactionStep.js";

/**
 * In some sorted order, minimizes the size of Rectangular elements in the
 * diagram.
 *
 * @author robmoffat
 */
export class MinimizeCompactionStep extends AbstractSizingCompactionStep {
  filter(r: Rectangular, d: Dimension): boolean {
    return isSizedRectangular(r) && r.getSizing(isHoriz(d)) === DiagramElementSizing.MINIMIZE;
  }

  performSizing(r: Rectangular, c: Compaction, d: Dimension): void {
    const hsso = c.getSlackOptimisation(d);
    const hs = hsso.getSlideablesFor(r);
    if (hs != null) {
      this.log.send(`Minimizing Distance ${r}`);
      this.minimizeDistance(hsso, hs);
    }
  }

  private minimizeDistance(opt: SlackOptimisation, set: RectangularSlideableSet): void {
    const left = set.l;
    const right = set.r;
    const minDist = left.minimumDistanceTo(right);
    opt.ensureMaximumDistance(left, right, minDist);
  }

  get prefix(): string {
    return "MINC";
  }

  /**
   * Returns in an order to maximize number of centerings.
   */
  compare(a: Rectangular, b: Rectangular, c: Compaction, d: Dimension): number {
    if (a.getDepth() !== b.getDepth()) {
      return -Math.sign(a.getDepth() - b.getDepth());
    }
    const aCR = isConnectedRectangular(a);
    const bCR = isConnectedRectangular(b);
    if (!aCR && !bCR) {
      return 0;
    } else if (!aCR) {
      return -1;
    } else if (!bCR) {
      return 1;
    } else {
      // return elements with least number of connections on a side
      const ac = this.maxLeavings(a, c, d);
      const bc = this.maxLeavings(b, c, d);
      if (bc !== ac) {
        return Math.sign(ac - bc);
      }
    }
    const aId = a.getID();
    const bId = b.getID();
    return bId < aId ? -1 : bId > aId ? 1 : 0;
  }

  private maxLeavings(a: Rectangular, c: Compaction, d: Dimension): number {
    return this.maxLeavingsInAxis(a, c.getSlackOptimisation(d), c);
  }

  private maxLeavingsInAxis(a: Rectangular, sso: SlackOptimisation, c: Compaction): number {
    const ss = sso.getSlideablesFor(a)!;
    return Math.max(this.leavingsOnSide(ss, c, Side.START), this.leavingsOnSide(ss, c, Side.END));
  }

  private leavingsOnSide(ss: RectangularSlideableSet, c: Compaction, _side: Side): number {
    return this.getLeavingConnections(ss, c).length;
  }

  // TODO: Implement this (unimplemented in the Kotlin source too)
  getLeavingConnections(_a2: RectangularSlideableSet, _c: Compaction): Connection[] {
    return [];
  }
}
