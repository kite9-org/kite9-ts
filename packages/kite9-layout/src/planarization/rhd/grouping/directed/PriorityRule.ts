import type { Direction } from "@kite9/model";
import type { Group } from "../basic/group/Group.js";
import type { MergePlane } from "./MergePlane.js";
import type { DirectedMergeState } from "./merge/DirectedMergeState.js";

/**
 * Checks to see if the particular combination of groups is allowed in the system in a given formation
 */
export interface PriorityRule {
  getMergePriority(
    a: Group,
    b: Group,
    ms: DirectedMergeState,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
    mp: MergePlane,
    horizontalMergesFirst: boolean,
  ): number;
}

export const PriorityRule = {
  UNDECIDED: -1,
} as const;
