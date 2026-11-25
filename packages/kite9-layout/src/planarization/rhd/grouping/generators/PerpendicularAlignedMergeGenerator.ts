import { Direction } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { LinkProcessor } from "../../links/LinkManager.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { MergePlane } from "../directed/MergePlane.js";
import { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import { AbstractAlignedMergeGenerator } from "./AbstractAlignedMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

const LEFT_RIGHT: ReadonlySet<Direction> = new Set([Direction.LEFT, Direction.RIGHT]);
const UP_DOWN: ReadonlySet<Direction> = new Set([Direction.UP, Direction.DOWN]);
const NONE: ReadonlySet<Direction> = new Set();

/**
 * Looks for perpendicular aligned merges, where an aligned merge is a pair of groups sharing
 * a common neighbour, not necessarily in the same container.
 *
 * @author robmoffat
 */
export class PerpendicularAlignedMergeGenerator extends AbstractAlignedMergeGenerator {
  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper, false);
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.PERP_ALIGNED;
  }

  override getCode(): string {
    return "ContainerPerpAligned";
  }

  protected override processPossibleAligningGroups(g: Group, _d: Direction, lp: LinkProcessor): void {
    g.processAllLeavingLinks(true, g.linkManager.allMask(), lp);
  }

  protected override getAlignmentDirections(g1: Group): ReadonlySet<Direction | null> {
    const state = DirectedGroupAxis.getState(g1);
    switch (state) {
      case MergePlane.UNKNOWN:
        return NONE;
      case MergePlane.X_FIRST_MERGE:
        return UP_DOWN;
      case MergePlane.Y_FIRST_MERGE:
        return LEFT_RIGHT;
    }
  }

  protected override processAlignedGroupsInAxis(
    alignedGroup: Group,
    _ms: BasicMergeState,
    _axis: DirectedGroupAxis,
    mp: MergePlane,
    d: Direction | null,
    lp: LinkProcessor,
  ): void {
    const mask = DirectedLinkManager.createMask(mp, true, false, d);
    alignedGroup.processAllLeavingLinks(true, mask, lp);
  }
}
