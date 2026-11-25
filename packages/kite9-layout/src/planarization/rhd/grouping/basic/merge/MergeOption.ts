import type { Comparable, Direction } from "@kite9/model";
import {
  planarizationDistance,
  positionDistance,
} from "../../../../../common/hints/DistanceFunctions.js";
import { GroupPhase } from "../../../GroupPhase.js";
import type { Group } from "../group/Group.js";
import type { BasicMergeState } from "./BasicMergeState.js";
import { MergeKey } from "./MergeKey.js";
import { MergeType } from "./MergeType.js";

const INT_MAX = 2147483647;

function cmp(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Holds details about a potential merge. Best merges are done first. Because merge options are used
 * in priority queues, they should not be altered while the object is in the queue.
 */
export class MergeOption implements Comparable<MergeOption> {
  mk: MergeKey;

  private alignmentGroupSize: number;
  private totalLinks = 0;
  private ordinalDistance = INT_MAX;
  private linkRank = 0;
  private linksIncluded = 0;
  private linksAligned = 0;
  private planarDistance: number | null = null;
  private renderedDistance: number | null = null;
  /** size of the groups, in terms of contained items subsumed */
  private size: number;

  /** Higher numbers indicate worse priority. 100 or more is illegal. */
  private _priority: number;

  constructor(
    a: Group,
    b: Group,
    readonly number: number,
    public p: number,
    public alignedGroup: Group | null,
    public alignedDirection: Direction | null,
  ) {
    this.mk = new MergeKey(a, b);
    this.alignmentGroupSize = alignedGroup?.size ?? INT_MAX;
    this.size = this.mk.a.size + this.mk.b.size;
    this._priority = p;
  }

  get priority(): number {
    return this._priority;
  }

  /**
   * WARNING: this should only be called if the merge option has been removed from the merge
   * state.
   */
  resetPriority(p: number): void {
    this._priority = p;
  }

  get mergeType(): MergeType {
    if (this.linksIncluded >= GroupPhase.LINK_WEIGHT) {
      return MergeType.LINKED;
    } else if (this.linksAligned > 0) {
      return MergeType.ALIGNED;
    } else {
      return MergeType.NEIGHBOUR;
    }
  }

  compareTo(other: MergeOption): number {
    // order by priority first
    if (this.priority !== other.priority) {
      return cmp(this.priority, other.priority);
    }

    // order by merge type first
    const mergeType = this.mergeType;
    if (mergeType !== other.mergeType) {
      return cmp(mergeType, other.mergeType);
    }
    switch (mergeType) {
      case MergeType.LINKED:
        // respect highest ranked links first.
        if (other.linkRank !== this.linkRank) {
          return -cmp(this.linkRank, other.linkRank);
        }

        // we need t combine lowest-level stuff first
        if (other.size !== this.size) {
          return cmp(this.size, other.size);
        }

        // most value is from reducing total external links because they become internal
        if (other.linksIncluded !== this.linksIncluded) {
          return -cmp(this.linksIncluded, other.linksIncluded);
        }

        // finally, try to avoid merging two "hub" neighbour attr together
        if (this.totalLinks !== other.totalLinks) {
          return cmp(this.totalLinks, other.totalLinks);
        }
        break;
      case MergeType.ALIGNED:
        // join groups with smallest alignment group size (i.e. the group they both link to
        // is smallest)
        if (this.alignmentGroupSize !== other.alignmentGroupSize) {
          return cmp(this.alignmentGroupSize, other.alignmentGroupSize);
        }

        // aligning links also reduces complexity of the overall graph, but not as much
        if (this.linksAligned !== other.linksAligned) {
          return -cmp(this.linksAligned, other.linksAligned);
        }

        // leave group with least non-aligned links
        if (this.totalLinks - this.linksAligned !== other.totalLinks - this.linksAligned) {
          return cmp(
            this.totalLinks - this.linksAligned,
            other.totalLinks - other.linksAligned,
          );
        }

        // we need to combine lowest-level stuff first
        if (other.size !== this.size) {
          return cmp(this.size, other.size);
        }
        break;
      default: {
        // merge together neighbours with least chance of being moved from the outside
        const thistl = Math.round(this.totalLinks);
        const arg0tl = Math.round(other.totalLinks);
        if (thistl !== arg0tl) {
          return cmp(thistl, arg0tl);
        }

        // merge closest neighbours first, to respect the ordering in the
        // xml
        if (this.ordinalDistance !== other.ordinalDistance) {
          return cmp(this.ordinalDistance, other.ordinalDistance);
        }

        // try and merge smallest first, to achieve b-tree
        // and also to allow for more buddy merging
        if (other.size !== this.size) {
          return cmp(this.size, other.size);
        }
      }
    }
    const dc = MergeOption.distanceCompare(this, other);
    return dc !== 0 ? dc : cmp(this.number, other.number);
  }

  private static distanceCompare(a: MergeOption, b: MergeOption): number {
    if (a.planarDistance != null && b.planarDistance != null && a.planarDistance !== b.planarDistance) {
      return cmp(a.planarDistance, b.planarDistance);
    } else if (
      a.renderedDistance != null &&
      b.renderedDistance != null &&
      a.renderedDistance !== b.renderedDistance
    ) {
      return cmp(a.renderedDistance, b.renderedDistance);
    } else {
      return 0;
    }
  }

  toString(): string {
    return (
      "[MO: " +
      this.number +
      " " +
      this.mk.a.groupNumber +
      "(" +
      this.mk.a.size +
      ")  " +
      this.mk.b.groupNumber +
      "(" +
      this.mk.b.size +
      "): t= " +
      MergeType[this.mergeType] +
      " i=" +
      this.linksIncluded +
      " a=" +
      this.linksAligned +
      " t=" +
      this.totalLinks +
      "ags=" +
      this.alignmentGroupSize +
      " od=" +
      this.ordinalDistance +
      ", p=" +
      this.priority +
      " a=" +
      this.alignedGroup +
      " ad=" +
      this.alignedDirection +
      " lr=" +
      this.linkRank +
      "]"
    );
  }

  /** Call this function on a merge option to figure out it's priority. */
  calculateMergeOptionMetrics(_ms: BasicMergeState): void {
    this.totalLinks = 0;
    this.linksAligned = 0;
    this.linksIncluded = 0;
    this.linkRank = 0;
    const a = this.mk.a;
    const b = this.mk.b;
    this.linkCount(a, b);
    this.linkCount(b, a);
    this.size = a.size + b.size;
    this.ordinalDistance = Math.abs(a.groupOrdinal - b.groupOrdinal);
    this.planarDistance = planarizationDistance(a.hints, b.hints);
    this.renderedDistance = positionDistance(a.hints, b.hints);
  }

  private linkCount(group: Group, cand: Group): void {
    const ldC = group.getLink(cand);
    if (ldC != null) {
      this.linksIncluded = Math.fround(this.linksIncluded + ldC.numberOfLinks / 2);
      if (ldC.direction != null) {
        this.linkRank = ldC.linkRank;
      }
    }
    this.totalLinks = Math.fround(this.totalLinks + group.linkManager.linkCount);
    if (this.alignedGroup != null) {
      const ldA = group.getLink(this.alignedGroup);
      if (ldA != null) {
        this.linksAligned = Math.fround(this.linksAligned + ldA.numberOfLinks);
      }
    }
  }
}
