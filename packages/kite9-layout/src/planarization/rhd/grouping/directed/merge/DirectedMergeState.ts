import { Direction } from "@kite9/model";
import type { Rectangular } from "@kite9/model";
import type { ContradictionHandler } from "../../../links/ContradictionHandler.js";
import type { LinkDetail } from "../../../links/LinkManager.js";
import type { Group } from "../../basic/group/Group.js";
import { BasicMergeState, type GroupContainerState } from "../../basic/merge/BasicMergeState.js";
import { ContainerMergeType } from "../ContainerMergeType.js";
import { DirectedGroupAxis } from "../group/DirectedGroupAxis.js";
import { DirectedLinkManager } from "../group/DirectedLinkManager.js";

/**
 * Kotlin `ShapeIndex`: equal if the same group, or if the groups contain the same leaves; hashed
 * by the group's hash code. Represented as a string key combining both.
 */
function shapeIndex(g: Group): string {
  return `${g.hashCode()}|${g.leafList}`;
}

export class DirectedMergeState extends BasicMergeState {
  /** live groups based on a key of which leaf groups they contain */
  private readonly noDirectedMergeNeeded: Map<string, Group> = new Map();

  constructor(ch: ContradictionHandler, elements: number) {
    super(ch, elements);
  }

  protected override isLinkCounted(
    from: Group | null,
    to: Group | null,
    via: Group,
    ld: LinkDetail | null,
  ): boolean {
    if (DirectedGroupAxis.compatibleNeighbour(from!, via)) {
      return super.isLinkCounted(from, to, via, ld);
    } else {
      return false;
    }
  }

  getContainerMergeType(a: Group, b: Group): ContainerMergeType {
    const common = this.hasCommonLiveContainer(a, b);
    const increases = this.increasesContainers(a, b);
    if (common) {
      return increases
        ? ContainerMergeType.JOINING_EXTRA_CONTAINERS
        : ContainerMergeType.WITHIN_LIVE_CONTAINER;
    } else {
      return ContainerMergeType.NO_LIVE_CONTAINER;
    }
  }

  private hasCommonLiveContainer(a: Group, b: Group): boolean {
    const ac = this.getContainersFor(a)!.keys();
    const bc = [...this.getContainersFor(b)!.keys()];
    const bcSet = new Set(bc);
    for (const container of ac) {
      if (bcSet.has(container) && this.isContainerLive(container)) return true;
    }
    return false;
  }

  /**
   * If the resulting group is going to end up with more live containers than a or b individually,
   * return true.
   */
  increasesContainers(a: Group | null, b: Group | null): boolean {
    const ac = this.getContainersFor(a);
    const bc = this.getContainersFor(b);
    return hasDifferentContainers(ac, bc) && hasDifferentContainers(bc, ac);
  }

  completedDirectionalMerge(combined: Group): boolean {
    const mp = DirectedGroupAxis.getState(combined);
    const mask = DirectedLinkManager.createMask(
      mp,
      false,
      false,
      Direction.UP,
      Direction.DOWN,
      Direction.LEFT,
      Direction.RIGHT,
    );
    const incomplete = combined.linkManager.subset(mask);
    return incomplete.length === 0;
  }

  override removeLiveGroup(a: Group): void {
    super.removeLiveGroup(a);
    if (this.completedDirectionalMerge(a)) {
      const i = shapeIndex(a);
      const b = this.noDirectedMergeNeeded.get(i);
      if (b === a) {
        this.noDirectedMergeNeeded.delete(i);
      }
    }
  }

  getCompoundGroupWithSameContents(g: Group): Group | null {
    return this.noDirectedMergeNeeded.get(shapeIndex(g)) ?? null;
  }

  override addLiveGroup(group: Group): void {
    super.addLiveGroup(group);
    if (this.completedDirectionalMerge(group)) {
      const i = shapeIndex(group);
      const existing = this.noDirectedMergeNeeded.get(i);
      if (existing == null) {
        this.noDirectedMergeNeeded.set(i, group);
      }
    }
  }
}

function hasDifferentContainers(
  ac: ReadonlyMap<Rectangular, GroupContainerState | null> | null,
  bc: ReadonlyMap<Rectangular, GroupContainerState | null> | null,
): boolean {
  for (const container of ac!.keys()) {
    if (bc!.get(container) == null) {
      return true;
    }
  }
  return false;
}
