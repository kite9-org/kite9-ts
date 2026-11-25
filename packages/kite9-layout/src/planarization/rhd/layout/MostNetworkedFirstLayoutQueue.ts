import { PriorityQueue } from "../../../common/algorithms/ssp/PriorityQueue.js";
import { kite9Log, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import { isCompoundGroup, type Group } from "../grouping/basic/group/Group.js";
import type { LinkDetail } from "../links/LinkManager.js";
import type { LayoutQueue } from "./LayoutQueue.js";

function cmp(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export class NetworkedItem {
  constructor(
    readonly group: Group,
    readonly size: number,
  ) {}

  toString(): string {
    return "NI: " + this.group.groupNumber + " size = " + this.size;
  }
}

/**
 * Modifies the queue so that we layout the groups with the most disparate group of links first.
 * This is based on a count of the number of groups that are already placed that the candidate
 * groups link to.
 */
export class MostNetworkedFirstLayoutQueue implements LayoutQueue, Logable {
  log: Kite9Log = kite9Log(this);

  todo: PriorityQueue<NetworkedItem>;
  networkSizes: Map<Group, number> = new Map();
  completedGroups: Set<Group> = new Set<Group>();

  constructor(size: number) {
    this.todo = new PriorityQueue<NetworkedItem>(size, (arg0, arg1) => {
      /*
       * Although priority is top down, within a given level, do groups in the
       * same order than they were merged in. This means that we do "hub" groups
       * before "edge" ones.
       */
      // most networked first
      let a0d = arg0.size;
      let a1d = arg1.size;
      if (a0d !== a1d) {
        return -cmp(a0d, a1d);
      }

      // largest first
      a0d = arg0.group.size;
      a1d = arg1.group.size;
      if (a0d !== a1d) {
        return -cmp(a0d, a1d);
      }

      // lowest number first
      return cmp(arg0.group.groupNumber, arg1.group.groupNumber);
    });
  }

  get prefix(): string {
    return "MNFQ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  offer(item: Group): void {
    if (this.canLayout(item)) {
      let liveGroupLinkCount = 0;
      const lm = item.linkManager;
      this.log.send(this.log.go() ? null : "Counting Network size for " + item.groupNumber);
      const links = lm.subset(lm.allMask());
      for (const ld of links) {
        liveGroupLinkCount += this.countLinkNetworkSize(ld);
      }
      this.networkSizes.set(item, liveGroupLinkCount);
      const ni = new NetworkedItem(item, liveGroupLinkCount);
      this.todo.add(ni);
      this.log.send(`Created: ${ni}`);
    }
  }

  private canLayout(item: Group): boolean {
    return item.axis.isReadyToPosition(this.completedGroups);
  }

  private countLinkNetworkSize(ld: LinkDetail): number {
    const complete = ld.group != null && this.completedGroups.has(ld.group);
    if (complete) {
      // drill down looking for first ready group
      let out = 0;
      ld.processToLevel(
        {
          process: (_originatingGroup, _destinationGroup, ld2) => {
            out += this.countLinkNetworkSize(ld2);
          },
        },
        1,
      );
      return out;
    } else {
      this.log.send(this.log.go() ? null : " -- link to " + ld.group);
      return 1;
    }
  }

  poll(): Group | null {
    while (this.todo.size() > 0) {
      const nw = this.todo.remove()!;
      const out = nw.group;
      this.networkSizes.delete(out);
      if (!this.completedGroups.has(out)) {
        out.linkManager.linkCount = nw.size;
        return out;
      }
    }
    return null;
  }

  /** Updates (by creating new NetworkedItems) the groups currently in todo. */
  complete(item: CompoundGroup): void {
    this.completedGroups.add(item);
    const a = item.a;
    const b = item.b;
    const horiz = item.axis.isHorizontal;
    const links = item.linkManager.subset(item.linkManager.allMask());
    for (const ld of links) {
      const group = ld.group;
      this.checkAndIncrementGroup(group, a, b, ld, horiz);
    }
  }

  private checkAndIncrementGroup(
    groupIn: Group | null,
    a: Group,
    b: Group,
    ld: LinkDetail,
    horiz: boolean,
  ): void {
    let group: Group | null = groupIn;
    if (group != null && this.completedGroups.has(group)) {
      if (isCompoundGroup(group)) {
        // need to work our way down to incomplete ones, no point updating complete groups
        ld.processToLevel(
          {
            process: (_originatingGroup, destinationGroup, ld2) => {
              this.checkAndIncrementGroup(destinationGroup, a, b, ld2, horiz);
            },
          },
          1,
        );
      }
    } else {
      group = this.getGroupBeingLaidOut(group!, horiz);
      if (group != null && ld.from(a) && ld.from(b)) {
        const existingLinks = this.safeGet(group);
        this.networkSizes.set(group, existingLinks + 1);
        const ni = new NetworkedItem(group, existingLinks + 1);
        this.todo.add(ni);
        this.log.send(`Bumped priority: ${ni}`);
      }
    }
  }

  private getGroupBeingLaidOut(groupIn: Group, horiz: boolean): Group | null {
    let group = groupIn;
    while (!this.canLayout(group)) {
      if (this.completedGroups.has(group)) {
        return null;
      }
      group = group.axis.getParentGroup(horiz)!;
    }
    return group;
  }

  private safeGet(group: Group): number {
    return this.networkSizes.get(group) ?? 0;
  }
}
