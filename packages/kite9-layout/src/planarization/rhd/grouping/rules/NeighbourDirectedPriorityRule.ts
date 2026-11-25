import { Direction, reverseDirection, rotateAntiClockwise, rotateClockwise } from "@kite9/model";
import { AbstractGroupingStrategy } from "../basic/AbstractGroupingStrategy.js";
import type { Group } from "../basic/group/Group.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { MergePlane } from "../directed/MergePlane.js";
import { PriorityRule } from "../directed/PriorityRule.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import type { DirectedMergeState } from "../directed/merge/DirectedMergeState.js";

export class NeighbourDirectedPriorityRule implements PriorityRule {
  constructor(readonly axis: boolean) {}

  getMergePriority(
    a: Group,
    b: Group,
    ms: DirectedMergeState,
    alignedGroup: Group | null,
    _alignedSide: Direction | null,
    mp: MergePlane,
    _horizontalMergesFirst: boolean,
  ): number {
    if (alignedGroup != null) {
      return PriorityRule.UNDECIDED;
    }
    const ld = a.getLink(b);
    if (ld != null && ld.direction != null) {
      const d = ld.direction;
      switch (mp) {
        case MergePlane.UNKNOWN:
          break;
        case MergePlane.X_FIRST_MERGE:
          if (d === Direction.DOWN || d === Direction.UP) {
            if (this.axis) {
              return PriorityRule.UNDECIDED;
            }
          }
          break;
        case MergePlane.Y_FIRST_MERGE:
          if (d === Direction.LEFT || d === Direction.RIGHT) {
            if (this.axis) {
              return PriorityRule.UNDECIDED;
            }
          }
          break;
      }
      const mask = DirectedLinkManager.createMask(mp, true, !this.axis, d);
      const rmask = DirectedLinkManager.createMask(mp, true, !this.axis, reverseDirection(d));
      const aGroups = a.linkManager.subsetGroup(mask);
      const bGroups = b.linkManager.subsetGroup(rmask);
      if (aGroups.includes(b) && bGroups.includes(a)) {
        if (aGroups.length === 1 && bGroups.length === 1) {
          // single directed merge
          return this.getPriority(a, b, ms, true);
        }
        if (this.isCompatibleSubgroup(a, b, aGroups, bGroups, mp, d)) {
          return this.getPriority(a, b, ms, false);
        }
        return this.isCompatibleSubgroup(b, a, bGroups, aGroups, mp, reverseDirection(d))
          ? this.getPriority(a, b, ms, false)
          : AbstractGroupingStrategy.INVALID_MERGE;
      }
    }
    return PriorityRule.UNDECIDED;
  }

  private isCompatibleSubgroup(
    a: Group,
    _b: Group,
    aGroupsBack: ReadonlyArray<Group>,
    _siblingsOfA: ReadonlyArray<Group>,
    mp: MergePlane,
    d: Direction | null,
  ): boolean {
    if (aGroupsBack.length === 1) {
      // check for perpendicular neighbours
      const perp1 = rotateAntiClockwise(d!);
      const perp2 = rotateClockwise(d!);
      const aPerp1Size = this.getPerpSize(a, mp, perp1);
      const aPerp2Size = this.getPerpSize(a, mp, perp2);
      if (aPerp1Size === 0 && aGroupsBack.length === 1) {
        if (aPerp2Size === 0) {
          return true;
        }
      }
    }
    return false;
  }

  private getPerpSize(a: Group, mp: MergePlane, d: Direction): number {
    const perpMask = DirectedLinkManager.createMask(mp, false, true, d);
    const aPerpGroups = a.linkManager.subsetGroup(perpMask);
    return aPerpGroups.length;
  }

  private getPriority(a: Group, b: Group, ms: DirectedMergeState, singleDirected: boolean): number {
    const mt = ms.getContainerMergeType(a, b);
    if (this.axis) {
      if (singleDirected) {
        return AbstractRuleBasedGroupingStrategy.AXIS_SINGLE_NEIGHBOUR;
      } else {
        return AbstractRuleBasedGroupingStrategy.AXIS_MULTI_NEIGHBOUR + mt.priorityAdjustment;
      }
    } else {
      return AbstractRuleBasedGroupingStrategy.PERP_NEIGHBOUR + mt.priorityAdjustment;
    }
  }
}
