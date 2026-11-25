import type { RoutingInfo } from "../../common/elements/RoutingInfo.js";
import type { CompoundGroup } from "./grouping/basic/group/CompoundGroup.js";
import type { Group } from "./grouping/basic/group/Group.js";
import type { RoutableHandler2D } from "./position/RoutableHandler2D.js";

/**
 * Type allows us to store information about the group specific to the strategy being used to group.
 * Also this is used to write out the coordinates of the group for edge insertion, and figure out group position.
 *
 * @author robmoffat
 */
export interface GroupAxis {
  /**
   * Determines whether this group is setting horizontal position
   */
  readonly isHorizontal: boolean;

  /**
   * Determines whether this group is setting vertical position
   */
  readonly isVertical: boolean;

  /**
   * Figures out where the group is, and returns routing info for it.
   * Set temp during the layout strategy phase to evaluate a layout before committing to it.
   */
  getPosition(rh: RoutableHandler2D, temp: boolean): RoutingInfo;

  /**
   * Returns false if the group no longer needs combining into CompoundGroups
   */
  active: boolean;

  /**
   * Returns true if this group's parents are all positioned, and we can choose the position of this one.
   */
  isReadyToPosition(completedGroups: ReadonlySet<Group>): boolean;

  /**
   * Potentially, groups can have 2 parents, a horizontal and a vertical one.
   */
  getParentGroup(horizontal: boolean): CompoundGroup | null;
}
