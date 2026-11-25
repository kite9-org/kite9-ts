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

/**
 * Generates in-axis aligned merges.
 *
 * @author robmoffat
 */
export class AxisAlignedMergeGenerator extends AbstractAlignedMergeGenerator {
  static readonly UP_DOWN: ReadonlySet<Direction> = new Set([Direction.UP, Direction.DOWN]);
  static readonly LEFT_RIGHT: ReadonlySet<Direction> = new Set([Direction.LEFT, Direction.RIGHT]);
  static readonly ALL: ReadonlySet<Direction> = new Set([
    Direction.LEFT,
    Direction.DOWN,
    Direction.RIGHT,
    Direction.UP,
  ]);

  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper, false);
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.AXIS_ALIGNED;
  }

  override getCode(): string {
    return "InAxisBuddy";
  }

  protected override processPossibleAligningGroups(g1: Group, d: Direction, lp: LinkProcessor): void {
    const mask = DirectedLinkManager.createMask(null, false, false, d);
    g1.linkManager.processAllLeavingLinks(true, mask, lp);
  }

  protected override getAlignmentDirections(g1: Group): ReadonlySet<Direction> {
    const state = DirectedGroupAxis.getState(g1);
    switch (state) {
      case MergePlane.UNKNOWN:
        return AxisAlignedMergeGenerator.ALL;
      case MergePlane.X_FIRST_MERGE:
        return AxisAlignedMergeGenerator.LEFT_RIGHT;
      case MergePlane.Y_FIRST_MERGE:
        return AxisAlignedMergeGenerator.UP_DOWN;
    }
  }

  protected override processAlignedGroupsInAxis(
    alignedGroup: Group,
    _ms: BasicMergeState,
    axis: DirectedGroupAxis,
    mp: MergePlane,
    d: Direction | null,
    lp: LinkProcessor,
  ): void {
    const alignedGroups = this.getAlignedGroups(alignedGroup, axis, mp, d);
    for (const g of alignedGroups) {
      lp.process(alignedGroup, g, DirectedLinkManager.NULL);
    }
  }

  protected getAlignedGroups(
    g: Group,
    _axis: DirectedGroupAxis | null,
    mp: MergePlane | null,
    d: Direction | null,
  ): ReadonlyArray<Group> {
    const mask = DirectedLinkManager.createMask(mp, true, false, d);
    return g.linkManager.subsetGroup(mask);
  }
}
