import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionStep } from "../CompactionStep.js";

/**
 * Figures out how to align connections - usually trying to minimize length.
 *
 * Not implemented: the Kotlin source body is `TODO("Not yet implemented")`.
 *
 * @author robmoffat
 */
export class ConnectionAlignmentCompactionStep implements CompactionStep {
  compact(_c: Compaction, _g: Group): void {
    throw new Error("Not yet implemented");
  }
}
