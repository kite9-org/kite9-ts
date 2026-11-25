import { Dimension } from "@kite9/model";
import type { Rectangular } from "@kite9/model";
import { isRectangular } from "../../common/elements/TypeGuards.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";

export abstract class AbstractSizingCompactionStep extends AbstractCompactionStep {
  compact(c: Compaction, _g: Group): void {
    this.size(c, Dimension.H);
    this.size(c, Dimension.V);
  }

  private size(c: Compaction, dimension: Dimension): void {
    const so = c.getSlackOptimisation(dimension);
    const items = new Set<Rectangular>();
    for (const it of so.getAllPositionedRectangulars()) {
      if (isRectangular(it) && this.filter(it, dimension)) items.add(it);
    }
    [...items]
      .sort((a, b) => this.compare(a, b, c, dimension))
      .forEach((it) => this.performSizing(it, c, dimension));
  }

  abstract filter(r: Rectangular, d: Dimension): boolean;
  abstract compare(a: Rectangular, b: Rectangular, c: Compaction, d: Dimension): number;
  abstract performSizing(r: Rectangular, c: Compaction, d: Dimension): void;
}
