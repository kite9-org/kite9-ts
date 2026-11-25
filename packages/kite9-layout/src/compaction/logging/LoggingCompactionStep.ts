import { Dimension } from "@kite9/model";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

export class LoggingCompactionStep extends AbstractCompactionStep {
  get prefix(): string {
    return "LOPS";
  }

  compact(c: Compaction, _g: Group): void {
    this.optimise(c, c.getSlackOptimisation(Dimension.H), c.getSlackOptimisation(Dimension.V));
  }

  addNeighbourDetails(s: CompactionSlideable, c: Compaction): string {
    const ns = c.getNeighbourSetsOn(s);
    return `${s} --  ${ns.size}`;
  }

  optimise(c: Compaction, horizontalSegments: SlackOptimisation, verticalSegments: SlackOptimisation): void {
    this.log.send(
      this.log.go()
        ? null
        : `Minimisation Steps: 
  HorizontalSegments: ${horizontalSegments.getSize()} 
  Vertical Segments: ${verticalSegments.getSize()} 
  Total: ${horizontalSegments.getSize() + verticalSegments.getSize()}`,
    );
    this.log.send(
      this.log.go()
        ? null
        : `Push Steps: 
  Horizontal Segments: ${horizontalSegments.pushCount} 
  Vertical Segments: ${verticalSegments.pushCount} 
  Total: ${horizontalSegments.pushCount + verticalSegments.pushCount}`,
    );
    this.log.send("Horizontal Segments:", this.describe(horizontalSegments, c));
    this.log.send("Vertical Segments:", this.describe(verticalSegments, c));
  }

  private describe(so: SlackOptimisation, c: Compaction): string[] {
    return [...so.getAllSlideables()]
      .sort((a, b) => a.minimumPosition - b.minimumPosition)
      .map((it) => this.addNeighbourDetails(it, c));
  }
}
