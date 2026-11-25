import { Dimension } from "@kite9/model";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

/**
 * Minimizes the spread of each lane group (fanned connections) in the diagram.
 *
 * @author robmoffat
 */
export class FanMinimizeCompactionStep extends AbstractCompactionStep {
  private minimizeDistance(
    opt: SlackOptimisation,
    left: CompactionSlideable,
    right: CompactionSlideable,
  ): void {
    const minDist = left.minimumDistanceTo(right);
    opt.ensureMaximumDistance(left, right, minDist);
  }

  compact(c: Compaction, _g: Group): void {
    this.minimizeFans(c.getSlackOptimisation(Dimension.H));
    this.minimizeFans(c.getSlackOptimisation(Dimension.V));
  }

  private minimizeFans(so: SlackOptimisation): void {
    for (const v of so.getLaneGroups()) {
      const sorted = [...v]
        .map((it) => it.getNotDoneVersion())
        .sort((a, b) => a.minimumPosition - b.minimumPosition);
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      this.minimizeDistance(so, first, last);
      this.log.send(`Minimizing ${first} + ${last}`);
    }
  }

  get prefix(): string {
    return "FANM";
  }
}
