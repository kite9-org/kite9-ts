import type { Rectangular } from "@kite9/model";
import type { Kite9Log } from "../../../../../logging/Kite9Log.js";
import type { GroupLinkNode } from "../../GroupLinkNode.js";
import { AbstractLeafGroup } from "../../basic/group/AbstractLeafGroup.js";
import type { DirectedMergeState } from "../merge/DirectedMergeState.js";
import { DirectedGroupAxis } from "./DirectedGroupAxis.js";
import { DirectedLinkManager } from "./DirectedLinkManager.js";

export class DirectedLeafGroup extends AbstractLeafGroup {
  readonly axis: DirectedGroupAxis;
  readonly linkManager: DirectedLinkManager;

  constructor(
    contained: GroupLinkNode,
    container: Rectangular,
    groupNumber: number,
    hc: number,
    log: Kite9Log,
    bs: DirectedMergeState,
  ) {
    super(contained, container, groupNumber, hc);
    this.axis = new DirectedGroupAxis(log, this);
    this.linkManager = new DirectedLinkManager(bs, this);
  }
}
