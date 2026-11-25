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
 * Generates nearest-neighbour merge options for perpendicular groups in axis.  These can span containers,
 * and generally have the highest priority.
 *
 * @author robmoffat
 */
export class PerpendicularDirectedMergeGenerator extends AbstractMergeGenerator {
  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper);
  }

  generate(poll: Group): void {
    const state = DirectedGroupAxis.getState(poll);
    if (state === MergePlane.X_FIRST_MERGE || state === MergePlane.UNKNOWN) {
      // horizontal merges
      this.generateMergesInDirection(poll, false, MergePlane.X_FIRST_MERGE);
    }
    if (state === MergePlane.Y_FIRST_MERGE || state === MergePlane.UNKNOWN) {
      // vertical merges
      this.generateMergesInDirection(poll, true, MergePlane.Y_FIRST_MERGE);
    }
  }

  private generateMergesInDirection(poll: Group, horizontal: boolean, mp: MergePlane): void {
    const dlm = poll.linkManager as DirectedLinkManager;
    const mask = horizontal
      ? DirectedLinkManager.createMask(mp, true, false, Direction.LEFT, Direction.RIGHT)
      : DirectedLinkManager.createMask(mp, true, true, Direction.UP, Direction.DOWN);
    for (const g of dlm.subsetGroup(mask)) {
      this.addMergeOption(poll, g, null, null);
    }
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.PERP_NEIGHBOUR;
  }

  override getCode(): string {
    return "PerpendicularNeighbour";
  }
}
