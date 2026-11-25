import { Direction } from "@kite9/model";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import type { MergePlane } from "../directed/MergePlane.js";
import { PriorityRule } from "../directed/PriorityRule.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import type { DirectedMergeState } from "../directed/merge/DirectedMergeState.js";

export class UndirectedPriorityRule implements PriorityRule {
  getMergePriority(
    a: Group,
    b: Group,
    ms: DirectedMergeState,
    alignedGroup: Group | null,
    _alignedSide: Direction | null,
    axis: MergePlane,
    _horizontalMergesFirst: boolean,
  ): number {
    const aDirectedLeavers = this.hasDirectedLeaversInLiveContainer(a, axis, ms);
    const bDirectedLeavers = this.hasDirectedLeaversInLiveContainer(b, axis, ms);
    return !aDirectedLeavers || !bDirectedLeavers
      ? this.getPriority(a, b, alignedGroup, ms)
      : PriorityRule.UNDECIDED;
  }

  private hasDirectedLeaversInLiveContainer(a: Group, axis: MergePlane, ms: BasicMergeState): boolean {
    const mask = DirectedLinkManager.createMask(
      axis,
      true,
      true,
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    );

    const groupInLiveContainer = (g: Group): boolean => {
      // if any part of what we connect to is not in a live container, then we
      // can't merge with it yet
      const containers = [...ms.getContainersFor(g)!.keys()].map((k) => ms.isContainerLive(k));
      return !containers.includes(false);
    };

    const inContainerLeavers = a.linkManager.subsetGroup(mask);
    const inLiveContainerLeavers = inContainerLeavers.filter((it) => groupInLiveContainer(it));
    return inLiveContainerLeavers.length > 0;
  }

  private getPriority(a: Group, b: Group, alignedGroup: Group | null, ms: DirectedMergeState): number {
    const mt = ms.getContainerMergeType(a, b);
    if (a.getLink(b) != null) {
      return AbstractRuleBasedGroupingStrategy.UNDIRECTED_LINKED + mt.priorityAdjustment;
    } else if (alignedGroup != null) {
      return AbstractRuleBasedGroupingStrategy.UNDIRECTED_ALIGNED + mt.priorityAdjustment;
    } else {
      return AbstractRuleBasedGroupingStrategy.UNCONNECTED_NEIGHBOUR + mt.priorityAdjustment;
    }
  }
}
