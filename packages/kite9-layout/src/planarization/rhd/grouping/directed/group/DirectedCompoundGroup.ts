import { Direction } from "@kite9/model";
import type { Kite9Log } from "../../../../../logging/Kite9Log.js";
import type { LinkDetail } from "../../../links/LinkManager.js";
import { AbstractCompoundGroup } from "../../basic/group/AbstractCompoundGroup.js";
import type { Group } from "../../basic/group/Group.js";
import { MergePlane } from "../MergePlane.js";
import type { DirectedMergeState } from "../merge/DirectedMergeState.js";
import { DirectedGroupAxis } from "./DirectedGroupAxis.js";
import { DirectedLinkManager } from "./DirectedLinkManager.js";

export class DirectedCompoundGroup extends AbstractCompoundGroup {
  readonly axis: DirectedGroupAxis;
  readonly linkManager: DirectedLinkManager;
  readonly internalLinkA: LinkDetail | null;
  readonly internalLinkB: LinkDetail | null;

  constructor(
    a: Group,
    b: Group,
    completeMerge: boolean,
    groupNumber: number,
    size: number,
    hc: number,
    bs: DirectedMergeState,
    log: Kite9Log,
    alignedDirection: Direction | null,
  ) {
    super(a, b, completeMerge, groupNumber, size, hc);
    this.axis = this.buildCompoundAxis(a, b, alignedDirection, log);
    this.linkManager = new DirectedLinkManager(bs, this);
    this.internalLinkA = this.fileLinks(a, b);
    this.internalLinkB = this.fileLinks(b, a);
  }

  private buildCompoundAxis(
    a: Group,
    b: Group,
    alignedDirection: Direction | null,
    log: Kite9Log,
  ): DirectedGroupAxis {
    const used = new DirectedGroupAxis(log, this);
    let axis = DirectedGroupAxis.getMergePlane(a, b);
    if (axis === MergePlane.UNKNOWN) {
      if (alignedDirection != null) {
        switch (alignedDirection) {
          case Direction.UP:
          case Direction.DOWN:
            axis = MergePlane.Y_FIRST_MERGE;
            break;
          case Direction.LEFT:
          case Direction.RIGHT:
            axis = MergePlane.X_FIRST_MERGE;
            break;
        }
      }
    }
    /* this is where we combine two completed compound groups
    of different axes
    */
    switch (axis) {
      case MergePlane.X_FIRST_MERGE:
        used.state = MergePlane.X_FIRST_MERGE;
        used.isHorizontal = true;
        used.isVertical = false;
        break;
      case MergePlane.Y_FIRST_MERGE:
        used.state = MergePlane.Y_FIRST_MERGE;
        used.isHorizontal = false;
        used.isVertical = true;
        break;
      default:
        used.state = MergePlane.UNKNOWN;
        used.isVertical = true;
        used.isHorizontal = true;
        break;
    }

    return used;
  }
}
