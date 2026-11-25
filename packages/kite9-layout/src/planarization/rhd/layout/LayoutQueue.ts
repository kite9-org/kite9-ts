import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import type { Group } from "../grouping/basic/group/Group.js";

export interface LayoutQueue {
  /**
   * Adds another group to the work queue
   */
  offer(item: Group): void;

  /**
   * Informs the queue that you have completed work on item.
   */
  complete(item: CompoundGroup): void;

  /**
   * Retrieves the next group to do, or null if we're finished
   */
  poll(): Group | null;
}
