import type { Deterministic, Layout } from "@kite9/model";
import type { Hints } from "../../../../../common/hints/DistanceFunctions.js";
import type { Kite9Log } from "../../../../../logging/Kite9Log.js";
import type { GroupAxis } from "../../../GroupAxis.js";
import type { LinkDetail, LinkManager, LinkProcessor } from "../../../links/LinkManager.js";
import type { CompoundGroup } from "./CompoundGroup.js";
import type { LeafGroup } from "./LeafGroup.js";

/**
 * Kotlin `sealed interface Group`. The `kind` discriminator stands in for `is LeafGroup` /
 * `is CompoundGroup` checks; see {@link isLeafGroup} and {@link isCompoundGroup}.
 */
export interface Group extends Deterministic {
  readonly kind: "leaf" | "compound";

  /**
   * Unique number for this group
   */
  readonly groupNumber: number;

  /**
   * Either groupNumber (for a leaf) or the lowest group number of any contained
   * leaf.   This allows us to track "earlier" vs "later" elements defined in a
   * diagram
   */
  readonly groupOrdinal: number;

  /**
   * Number of leaf groups contained in this group
   */
  readonly size: number;

  processAllLeavingLinks(compound: boolean, mask: number, lp: LinkProcessor): void;

  getLink(g: Group): LinkDetail | null;

  readonly axis: GroupAxis;

  readonly linkManager: LinkManager;

  processLowestLevelLinks(lp: LinkProcessor): void;

  addLeafGroupOrdinalsToSet(s: Set<number>): void;

  /**
   * Sorted list of leaf element numbers, used for comparing compound groups
   * easily (since you can use hashcode / equals)
   */
  readonly leafList: string;

  /**
   * Returns true if this group is lg, or it contains it somehow in the hierarchy
   */
  contains(lg: Group): boolean;

  /**
   * Returns the number of nested levels below this group
   */
  readonly height: number;

  /**
   * Dump group info to log
   */
  log(log: Kite9Log): void;

  layout: Layout | null;

  /**
   * Whether the group is ready to be merged
   */
  live: boolean;

  readonly hints: Hints;

  /**
   * Used for link-counting.  We only count links to active groups
   */
  isActive(): boolean;

  hashCode(): number;
}

export function isLeafGroup(g: Group | null | undefined): g is LeafGroup {
  return g != null && g.kind === "leaf";
}

export function isCompoundGroup(g: Group | null | undefined): g is CompoundGroup {
  return g != null && g.kind === "compound";
}
