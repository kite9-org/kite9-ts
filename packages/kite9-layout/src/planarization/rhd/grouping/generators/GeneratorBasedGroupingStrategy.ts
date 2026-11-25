import type { Direction } from "@kite9/model";
import type { GroupingStrategy } from "../GroupingStrategy.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import type { MergeOption } from "../basic/merge/MergeOption.js";

export interface GeneratorBasedGroupingStrategy extends GroupingStrategy {
  /**
   * Quick compatibility check on two groups to make sure we are comparing like with like
   */
  compatibleMerge(a: Group, b: Group): boolean;

  /**
   * Allows generators to add merge options back to the merge state.
   */
  addMergeOption(
    g1: Group,
    g2: Group,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
    bestPriority: number,
    ms: BasicMergeState,
  ): void;

  /**
   * Basically the same, but with an already-existing merge option.
   * @return priority
   */
  addMergeOption(mo: MergeOption, bestPriority: number, ms: BasicMergeState): number;

  /**
   * Given a group, which may have been merged, return the currently active version of it.
   */
  getWorkingGroup(group: Group | null): Group | null;
}
