import { Direction } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { MergePlane } from "../directed/MergePlane.js";
import { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import { AbstractMergeGenerator } from "./AbstractMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

/**
 * Generates directed merge options for nearest-neighbour groups in axis.  These can span containers,
 * and generally have the highest priority.
 *
 * @author robmoffat
 */
export class AxisNeighbourMergeGenerator extends AbstractMergeGenerator {
  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper);
  }

  generate(poll: Group): void {
    this.log.send(this.log.go() ? null : "Generating " + this.getCode() + " options for " + poll);
    const state = DirectedGroupAxis.getState(poll);
    if (state === MergePlane.X_FIRST_MERGE || state === MergePlane.UNKNOWN) {
      // horizontal merges
      this.generateMergesInDirection(poll, this.ms, Direction.RIGHT, MergePlane.X_FIRST_MERGE);
      this.generateMergesInDirection(poll, this.ms, Direction.LEFT, MergePlane.X_FIRST_MERGE);
    }
    if (state === MergePlane.Y_FIRST_MERGE || state === MergePlane.UNKNOWN) {
      // vertical merges
      this.generateMergesInDirection(poll, this.ms, Direction.DOWN, MergePlane.Y_FIRST_MERGE);
      this.generateMergesInDirection(poll, this.ms, Direction.UP, MergePlane.Y_FIRST_MERGE);
    }
  }

  private generateMergesInDirection(
    poll: Group,
    ms: BasicMergeState,
    d: Direction,
    mp: MergePlane,
  ): void {
    const dlm = poll.linkManager as DirectedLinkManager;
    const right = dlm.getSingleDirectedMergeOption(d, mp, ms, false);
    if (right == null) {
      const mask = DirectedLinkManager.createMask(mp, true, false, d);
      for (const g of dlm.subsetGroup(mask)) {
        this.addMergeOption(poll, g, null, null);
      }
    }
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.AXIS_SINGLE_NEIGHBOUR;
  }

  override getCode(): string {
    return "AxisNeighbour";
  }
}
