import { Direction, Layout, reverseLayout, type Port } from "@kite9/model";
import type { RoutingInfo } from "../../../../../common/elements/RoutingInfo.js";
import { isPort } from "../../../../../common/elements/TypeGuards.js";
import type { Bounds } from "../../../../../common/objects/Bounds.js";
import type { Kite9Log } from "../../../../../logging/Kite9Log.js";
import { LogicException } from "../../../../../logging/LogicException.js";
import type { GroupAxis } from "../../../GroupAxis.js";
import type { RoutableHandler2D } from "../../../position/RoutableHandler2D.js";
import type { CompoundGroup } from "../../basic/group/CompoundGroup.js";
import { isLeafGroup, type Group } from "../../basic/group/Group.js";
import { MergePlane } from "../MergePlane.js";

export class DirectedGroupAxis implements GroupAxis {
  state: MergePlane = MergePlane.UNKNOWN;

  active = true;

  isLayoutRequired = true;

  isHorizontal = false;
  isVertical = false;

  horizParentGroup: CompoundGroup | null = null;
  vertParentGroup: CompoundGroup | null = null;

  constructor(
    readonly log: Kite9Log,
    readonly g: Group,
  ) {}

  toString(): string {
    return this.state.toString();
  }

  getParentGroup(horizontal: boolean): CompoundGroup | null {
    return horizontal ? this.horizParentGroup : this.vertParentGroup;
  }

  isSet(_rh: RoutableHandler2D | null, ri: Bounds | null, _horiz: boolean): boolean {
    return ri != null;
  }

  getPosition1D(rh: RoutableHandler2D, temp: boolean, horiz: boolean): Bounds {
    const g = this.g;
    let ri = rh.getPosition(g, horiz);

    if (ri == null && temp) {
      ri = rh.getTempPosition(g, horiz);
    }

    if (ri == null) {
      // ok, calculate via parent groups.
      let out: Bounds;
      const parent: Group | null = horiz ? this.horizParentGroup : this.vertParentGroup;
      if (parent != null) {
        if (parent.axis.isLayoutRequired) {
          const l = DirectedGroupAxis.getLayoutFor(parent, g);
          out = rh.narrow(
            l,
            (parent.axis as DirectedGroupAxis).getPosition1D(rh, temp, horiz),
            horiz,
          );
        } else {
          out = (parent.axis as DirectedGroupAxis).getPosition1D(rh, temp, horiz);
        }
      } else {
        // no parent group = top
        out = rh.getTopLevelBounds(horiz);
      }

      const port = DirectedGroupAxis.getPortGroup(g);
      if (port != null) {
        out = rh.portEdge(port.getPortDirection(), out, horiz);
      }

      if (temp) {
        rh.setTempPosition(g, out, horiz);
      } else {
        this.log.send("Placed: " + g.groupNumber + " " + horiz + " " + out);
        rh.setPlacedPosition(g, out, horiz);
      }
      if (!temp && isLeafGroup(g)) {
        // this means the routable handler also has final positions for each contained element
        rh.setPlacedPosition(g.connected, out, horiz);
      }
      return out;
    } else {
      return ri;
    }
  }

  private static getPortGroup(g: Group): Port | null {
    if (isLeafGroup(g)) {
      const c: unknown = g.connected;
      return isPort(c) ? c : null;
    } else {
      return null;
    }
  }

  getPosition(rh: RoutableHandler2D, temp: boolean): RoutingInfo {
    const xBounds = this.getPosition1D(rh, temp, true);
    const yBounds = this.getPosition1D(rh, temp, false);
    return rh.createRouting(xBounds, yBounds);
  }

  isReadyToPosition(completedGroups: ReadonlySet<Group>): boolean {
    const hready = this.horizParentGroup == null || completedGroups.has(this.horizParentGroup);
    const vready = this.vertParentGroup == null || completedGroups.has(this.vertParentGroup);
    return hready && vready;
  }

  /**
   * Given two groups and the layout between them, this works out what type the merge should be.
   * Effectively, this controls whether two groups are allowed to merge with one another.  If it returns null,
   * the merge isn't allowed.
   */
  static getMergePlane(a: Group, b: Group): MergePlane | null {
    switch (DirectedGroupAxis.getState(a)) {
      case MergePlane.X_FIRST_MERGE:
        switch (DirectedGroupAxis.getState(b)) {
          case MergePlane.X_FIRST_MERGE:
          case MergePlane.UNKNOWN:
            return MergePlane.X_FIRST_MERGE;
          case MergePlane.Y_FIRST_MERGE:
            return null;
        }
        break;
      case MergePlane.Y_FIRST_MERGE:
        switch (DirectedGroupAxis.getState(b)) {
          case MergePlane.Y_FIRST_MERGE:
          case MergePlane.UNKNOWN:
            return MergePlane.Y_FIRST_MERGE;
          case MergePlane.X_FIRST_MERGE:
            return null;
        }
        break;
      case MergePlane.UNKNOWN:
        switch (DirectedGroupAxis.getState(b)) {
          case MergePlane.X_FIRST_MERGE:
            return MergePlane.X_FIRST_MERGE;
          case MergePlane.Y_FIRST_MERGE:
            return MergePlane.Y_FIRST_MERGE;
          case MergePlane.UNKNOWN: {
            const ld = a.getLink(b);
            switch (ld?.direction) {
              case Direction.UP:
              case Direction.DOWN:
                return MergePlane.Y_FIRST_MERGE;
              case Direction.LEFT:
              case Direction.RIGHT:
                return MergePlane.X_FIRST_MERGE;
              default:
                return MergePlane.UNKNOWN;
            }
          }
        }
    }
    throw new LogicException("Unknown merge plane");
  }

  /**
   * Only allows the merge if the neighbour is in the right state
   */
  static compatibleNeighbour(originatingGroup: Group, destinationGroup: Group): boolean {
    return DirectedGroupAxis.getMergePlane(originatingGroup, destinationGroup) != null;
  }

  static inState(group: Group, ...okStates: unknown[]): boolean {
    for (const s of okStates) {
      if (DirectedGroupAxis.getState(group) === s) {
        return true;
      }
    }
    return false;
  }

  static getState(group: Group): MergePlane {
    return (group.axis as DirectedGroupAxis).state;
  }

  static getLayoutFor(inGroup: Group, g: Group | null): Layout | null {
    const ax = DirectedGroupAxis.getType(inGroup);
    if (inGroup.layout == null) {
      return null;
    }
    switch (inGroup.layout) {
      case Layout.LEFT:
      case Layout.RIGHT:
        return ax.isHorizontal ? DirectedGroupAxis.layoutSide(inGroup, g) : null;
      case Layout.UP:
      case Layout.DOWN:
        return ax.isVertical ? DirectedGroupAxis.layoutSide(inGroup, g) : null;
      default:
        // HORIZONTAL, VERTICAL:
        return inGroup.layout;
    }
  }

  private static layoutSide(inGroup: Group, g: Group | null): Layout | null {
    const cg = inGroup as CompoundGroup;
    if (cg.b === g) {
      return cg.layout;
    } else if (cg.a === g) {
      return reverseLayout(cg.layout);
    } else {
      throw new LogicException();
    }
  }

  static getType(g: Group): DirectedGroupAxis {
    return g.axis as DirectedGroupAxis;
  }
}
