import type { Direction } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { LinkProcessor } from "../../links/LinkManager.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import type { MergePlane } from "../directed/MergePlane.js";
import type { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import { AbstractAlignedMergeGenerator } from "./AbstractAlignedMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

const NULL: ReadonlySet<Direction | null> = new Set([null]);

/**
 * Looks for aligned merges, where an aligned merge is a pair of groups sharing
 * a common neighbour. Aligned merges should be in-container.
 *
 * @author robmoffat
 */
export class ContainerUndirectedAlignedMergeGenerator extends AbstractAlignedMergeGenerator {
  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper, true);
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.UNDIRECTED_ALIGNED;
  }

  override getCode(): string {
    return "ContainerUndirectedAligned";
  }

  protected override processPossibleAligningGroups(g: Group, _d: Direction, lp: LinkProcessor): void {
    g.processAllLeavingLinks(true, g.linkManager.allMask(), lp);
  }

  protected override getAlignmentDirections(_g1: Group): ReadonlySet<Direction | null> {
    return NULL;
  }

  protected override processAlignedGroupsInAxis(
    alignedGroup: Group,
    _ms: BasicMergeState,
    _axis: DirectedGroupAxis,
    mp: MergePlane,
    d: Direction | null,
    lp: LinkProcessor,
  ): void {
    const mask = DirectedLinkManager.createMask(mp, false, false, d);
    alignedGroup.processAllLeavingLinks(true, mask, lp);
  }
}
