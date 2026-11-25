import type { Rectangular } from "@kite9/model";
import type { Group } from "../basic/group/Group.js";

/**
 * Generates merges of a particular type, from a particular seed group.
 * Note that generators should not understand the precise logic of what constitutes a valid
 * merge, that is left to the priority rules.
 */
export interface MergeGenerator {
  /**
   * With the given strategy, generate some merge options for the given group.
   */
  generate(poll: Group): void;

  /**
   * Signals that a container has become live.
   */
  containerIsLive(c: Rectangular): void;
}
