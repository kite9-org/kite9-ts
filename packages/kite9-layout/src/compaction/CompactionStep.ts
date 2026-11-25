import type { Group } from "../planarization/rhd/grouping/basic/group/Group.js";
import type { Compaction } from "./Compaction.js";

/**
 * A step in which some part of the compaction process occurs.
 *
 * @author robmoffat
 */
export interface CompactionStep {
  compact(c: Compaction, g: Group): void;
}
