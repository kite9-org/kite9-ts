import type { GroupResult } from "./GroupResult.js";

/**
 * Defines a way of merging leaf groups within the [GroupPhase] together to create a single compound group.
 *
 * @author robmoffat
 */
export interface GroupingStrategy {
  group(): GroupResult;
}
