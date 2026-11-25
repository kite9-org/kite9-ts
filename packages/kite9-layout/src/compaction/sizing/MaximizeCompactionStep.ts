import { DiagramElementSizing, isHoriz } from "@kite9/model";
import type { Dimension, Rectangular, SizedRectangular } from "@kite9/model";
import type { Compaction } from "../Compaction.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import { AbstractSizingCompactionStep } from "./AbstractSizingCompactionStep.js";

export function isSizedRectangular(r: Rectangular): r is SizedRectangular {
  return typeof (r as Partial<SizedRectangular>).getSizing === "function";
}

export class MaximizeCompactionStep extends AbstractSizingCompactionStep {
  filter(r: Rectangular, d: Dimension): boolean {
    return isSizedRectangular(r) && r.getSizing(isHoriz(d)) === DiagramElementSizing.MAXIMIZE;
  }

  /**
   * Orders top-down
   */
  compare(a: Rectangular, b: Rectangular, _c: Compaction, _d: Dimension): number {
    return -Math.sign(a.getDepth() - b.getDepth());
  }

  performSizing(r: Rectangular, c: Compaction, d: Dimension): void {
    this.log.send(`Maximizing Distance ${r}`);
    const vsso = c.getSlackOptimisation(d);
    const ss = vsso.getSlideablesFor(r);
    this.maximizeDistance(ss);
  }

  private maximizeDistance(ss: RectangularSlideableSet | null): void {
    if (ss != null) {
      const start = ss.l;
      const end = ss.r;
      end.minimumPosition = end.maximumPosition;
      start.maximumPosition = start.minimumPosition;
    }
  }

  get prefix(): string {
    return "MAXS";
  }
}
