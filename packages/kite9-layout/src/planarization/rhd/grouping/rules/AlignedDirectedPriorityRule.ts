import { Direction, Layout, reverseDirection, type Rectangular } from "@kite9/model";
import { isConnectedRectangular } from "../../../../common/elements/TypeGuards.js";
import { LogicException } from "../../../../logging/LogicException.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { MergePlane } from "../directed/MergePlane.js";
import { PriorityRule } from "../directed/PriorityRule.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import type { DirectedMergeState } from "../directed/merge/DirectedMergeState.js";

enum BuddyType {
  PERFECT_BUDDY,
  HALF_BUDDY,
  NO,
}

export class AlignedDirectedPriorityRule implements PriorityRule {
  constructor(readonly axis: boolean) {}

  getMergePriority(
    a: Group,
    b: Group,
    ms: DirectedMergeState,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
    mp: MergePlane,
    _horizontalMergesFirst: boolean,
  ): number {
    return alignedGroup != null
      ? this.canBuddyMerge(a, b, mp, alignedGroup, alignedSide, this.axis, ms)
      : PriorityRule.UNDECIDED;
  }

  private getPriority(a: Group, b: Group, ms: DirectedMergeState, bt: BuddyType): number {
    const mt = ms.getContainerMergeType(a, b);
    if (this.axis) {
      switch (bt) {
        case BuddyType.HALF_BUDDY:
          return AbstractRuleBasedGroupingStrategy.AXIS_ALIGNED_UNSURE + mt.priorityAdjustment;
        case BuddyType.PERFECT_BUDDY:
          return AbstractRuleBasedGroupingStrategy.AXIS_ALIGNED + mt.priorityAdjustment;
        case BuddyType.NO:
          return PriorityRule.UNDECIDED;
      }
    } else if (bt === BuddyType.PERFECT_BUDDY) {
      return AbstractRuleBasedGroupingStrategy.PERP_ALIGNED + mt.priorityAdjustment;
    } else {
      return PriorityRule.UNDECIDED;
    }
  }

  private canBuddyMerge(
    group: Group,
    buddy: Group,
    axis: MergePlane,
    alignedGroup: Group,
    alignedSide: Direction | null,
    withAxis: boolean,
    ms: BasicMergeState,
  ): number {
    if (
      (axis === MergePlane.Y_FIRST_MERGE && withAxis) ||
      (axis === MergePlane.X_FIRST_MERGE && !withAxis) ||
      axis === MergePlane.UNKNOWN
    ) {
      // left-right buddies
      const buddyMergeHorizontal =
        (alignedSide === Direction.UP || alignedSide === Direction.DOWN) &&
        this.nearestNeighbours(alignedGroup, axis, alignedSide, group, buddy, ms);
      if (
        buddyMergeHorizontal &&
        this.checkContainerLayoutSupportsAlignedMerge(group, buddy, alignedGroup, ms, alignedSide)
      ) {
        const bt = this.areNearestNeighboursOrHaveNoNeighboursPerpendicular(group, buddy, true, axis);
        return this.getPriority(group, buddy, ms as DirectedMergeState, bt);
      }
    }
    if (
      (axis === MergePlane.X_FIRST_MERGE && withAxis) ||
      (axis === MergePlane.Y_FIRST_MERGE && !withAxis) ||
      axis === MergePlane.UNKNOWN
    ) {
      // up-down buddies
      const buddyMergeVertical =
        (alignedSide === Direction.LEFT || alignedSide === Direction.RIGHT) &&
        this.nearestNeighbours(alignedGroup, axis, alignedSide, group, buddy, ms);
      if (
        buddyMergeVertical &&
        this.checkContainerLayoutSupportsAlignedMerge(group, buddy, alignedGroup, ms, alignedSide)
      ) {
        const bt = this.areNearestNeighboursOrHaveNoNeighboursPerpendicular(group, buddy, false, axis);
        return this.getPriority(group, buddy, ms as DirectedMergeState, bt);
      }
    }
    return PriorityRule.UNDECIDED;
  }

  /** This makes sure that if you are doing a buddy merge, that the container will support it. */
  private checkContainerLayoutSupportsAlignedMerge(
    a: Group,
    b: Group,
    aligned: Group,
    ms: BasicMergeState,
    alignedSide: Direction | null,
  ): boolean {
    const ac = ms.getContainersFor(a)!;
    const bc = ms.getContainersFor(b)!;
    const alignedc = ms.getContainersFor(aligned)!;
    for (const con of alignedc.keys()) {
      if (ms.isContainerLive(con)) {
        // a and b sharing a container with alignedGroup will fail if con has a layout
        // REMOVE THIS?
        const conInB = bc.has(con);
        const conInA = ac.has(con);
        if ((conInA || conInB) && this.axis) {
          // container must allow alignedSide to occur
          const l = con.getLayout();
          if (!this.allowsMergeDirection(l, alignedSide)) {
            return false;
          }
        }
      }
    }

    // a and b must share a common live container, otherwise we are stretching containers
    for (const c1 of ac.keys()) {
      if (ms.isContainerLive(c1) && bc.has(c1)) {
        return true;
      }
    }
    return false;
  }

  private allowsMergeDirection(l: Layout | null, alignedSide: Direction | null): boolean {
    if (l == null) {
      return true;
    } else if (l === Layout.HORIZONTAL) {
      return alignedSide === Direction.LEFT || alignedSide === Direction.RIGHT || alignedSide == null;
    } else if (l === Layout.VERTICAL) {
      return alignedSide === Direction.UP || alignedSide === Direction.DOWN || alignedSide == null;
    } else {
      return false;
    }
  }

  private nearestNeighbours(
    alignedGroup: Group,
    axis: MergePlane,
    alignedSide: Direction,
    group: Group,
    buddy: Group,
    ms: BasicMergeState,
  ): boolean {
    const neighboursGroup = this.getNearestNeighbours(group, reverseDirection(alignedSide), axis, ms);
    const neighboursBuddy = this.getNearestNeighbours(buddy, reverseDirection(alignedSide), axis, ms);
    return (
      neighboursBuddy.length === neighboursGroup.length &&
      neighboursBuddy.includes(alignedGroup) &&
      neighboursGroup.includes(alignedGroup) &&
      sameNeighbours(neighboursGroup, neighboursBuddy)
    );
  }

  private getNearestNeighbours(
    p: Group,
    d: Direction | null,
    mp: MergePlane,
    _ms: BasicMergeState,
  ): ReadonlyArray<Group> {
    const mask = DirectedLinkManager.createMask(mp, true, !this.axis, d);
    return p.linkManager.subsetGroup(mask);
  }

  private areNearestNeighboursOrHaveNoNeighboursPerpendicular(
    group: Group,
    buddy: Group,
    horizontal: boolean,
    mp: MergePlane,
  ): BuddyType {
    const d1 = horizontal ? Direction.LEFT : Direction.UP;
    const d2 = horizontal ? Direction.RIGHT : Direction.DOWN;
    const maskd1 = DirectedLinkManager.createMask(mp, true, false, d1);
    const maskd2 = DirectedLinkManager.createMask(mp, true, false, d2);
    const nng1 = group.linkManager.subsetGroup(maskd1);
    const nng2 = group.linkManager.subsetGroup(maskd2);
    if (nng1.includes(buddy) || nng2.includes(buddy)) {
      return BuddyType.PERFECT_BUDDY;
    }
    const nnb1 = buddy.linkManager.subsetGroup(maskd1);
    const nnb2 = buddy.linkManager.subsetGroup(maskd2);
    if (nng2.length + nnb2.length === 0) {
      // no way these can be joined on the d2 side
      return BuddyType.PERFECT_BUDDY;
    }
    if (nng1.length + nnb1.length === 0) {
      // no way these could be joined on the d1 side
      return BuddyType.PERFECT_BUDDY;
    }
    if (sameNeighbours(nng1, nnb1)) {
      // since the neighbours are the same, they couldn't be joined to each other
      return BuddyType.PERFECT_BUDDY;
    }
    if (sameNeighbours(nng2, nnb2)) {
      // since the neighbours are the same, they couldn't be joined to each other
      return BuddyType.PERFECT_BUDDY;
    }
    return noCommonNeighbours(nng1, nnb2) || noCommonNeighbours(nng2, nnb1)
      ? BuddyType.HALF_BUDDY
      : BuddyType.NO;
  }

  private checkContainerAllowsAlignedMerge(c: Rectangular | null, alignedState: MergePlane): boolean {
    // exclude merge options where the aligned merge is incompatible with the container
    if (c!.getLayout() === Layout.HORIZONTAL) {
      if (alignedState === MergePlane.X_FIRST_MERGE) {
        return false;
      }
    } else if (c!.getLayout() === Layout.VERTICAL) {
      if (alignedState === MergePlane.Y_FIRST_MERGE) {
        return false;
      }
    }
    return true;
  }

  checkSharedContainers(
    acIn: Set<Rectangular | null> | null,
    bcIn: Set<Rectangular | null> | null,
    mp: MergePlane,
  ): boolean {
    let ac = acIn;
    let bc = bcIn;
    if (ac == null || bc == null) throw new LogicException("Group has no containers?");
    const done: Set<Rectangular | null> = new Set<Rectangular | null>();
    let cont = false;
    for (const c1 of ac) {
      if (bc.has(c1)) {
        done.add(c1);
        if (!this.checkContainerAllowsAlignedMerge(c1, mp)) {
          return false;
        }
      } else {
        cont = true;
      }
    }
    if (cont) {
      ac = this.getParentContainers(ac, done);
      bc = this.getParentContainers(bc, done);
      return this.checkSharedContainers(ac, bc, mp);
    } else {
      return true;
    }
  }

  private getParentContainers(
    ac: Set<Rectangular | null>,
    done: Set<Rectangular | null>,
  ): Set<Rectangular | null> {
    const out: Set<Rectangular | null> = new Set<Rectangular | null>();
    for (const c of ac) {
      if (!done.has(c) && isConnectedRectangular(c)) {
        out.add(c.getContainer());
      }
    }
    return out;
  }
}

function noCommonNeighbours(a: ReadonlyArray<Group>, b: ReadonlyArray<Group>): boolean {
  return !a.some((it) => b.includes(it));
}

function sameNeighbours(a: ReadonlyArray<Group>, b: ReadonlyArray<Group>): boolean {
  return a.length === b.length && b.every((it) => a.includes(it));
}
