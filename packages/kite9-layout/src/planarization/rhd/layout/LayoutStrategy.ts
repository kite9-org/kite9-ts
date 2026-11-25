import type { GroupResult } from "../grouping/GroupResult.js";
import type { LayoutQueue } from "./LayoutQueue.js";

/**
 * Traverses a hierarchy of groups constructed in the Grouping phase, and works out the best
 * layout for them to minimize cost.
 * @author robmoffat
 */
export interface LayoutStrategy {
  layout(mr: GroupResult, emptyQueue: LayoutQueue): void;
}
