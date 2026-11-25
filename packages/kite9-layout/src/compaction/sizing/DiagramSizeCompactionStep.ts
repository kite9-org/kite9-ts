import { Dimension } from "@kite9/model";
import type { Diagram } from "@kite9/model";
import { LogicException } from "../../logging/LogicException.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import type { Compaction } from "../Compaction.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

/**
 * Ensures that the overall diagram width is minimal.
 * @author robmoffat
 */
export class DiagramSizeCompactionStep extends AbstractCompactionStep {
  compact(c: Compaction, _g: Group): void {
    this.setFor(c.getSlackOptimisation(Dimension.H), c.getDiagram());
    this.setFor(c.getSlackOptimisation(Dimension.V), c.getDiagram());
  }

  private setFor(o: SlackOptimisation, diagram: Diagram): void {
    const set = o.getSlideablesFor(diagram);
    const highSide = set
      ? [...set.getRectangularSlideables()].find((it) =>
          it.getRectAnchors().some((a) => a.e === diagram && a.s === Side.END),
        )
      : undefined;

    if (highSide != null) {
      const min = highSide.minimumPosition;
      highSide.maximumPosition = min;
      this.log.send(`Set Overall Diagram Size: ${highSide}`);
    } else {
      throw new LogicException("Couldn't find rect for diagram");
    }
  }

  get prefix(): string {
    return "DSCS";
  }
}
