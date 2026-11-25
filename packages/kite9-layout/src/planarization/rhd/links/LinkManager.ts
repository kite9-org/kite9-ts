import type { BiDirectional, Connected, Direction } from "@kite9/model";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import type { Group } from "../grouping/basic/group/Group.js";

export interface LinkProcessor {
  process(originatingGroup: Group, destinationGroup: Group, ld: LinkDetail): void;
}

export interface LinkDetail {
  /**
   * Rank allows us to prioritise importance of adhering to a link.
   * Higher = later specified link = more important.
   */
  readonly linkRank: number;

  /**
   * True if this link is involved in ordering a container
   */
  readonly isOrderingLink: boolean;
  readonly direction: Direction | null;
  readonly numberOfLinks: number;
  readonly connections: Iterable<BiDirectional<Connected>>;
  readonly group: Group | null;
  processToLevel(lp: LinkProcessor, l: number): void;
  processLowestLevel(lp: LinkProcessor): void;

  /**
   * Returns true if the linkdetail leaves a given group.
   */
  from(b: Group): boolean;
}

/**
 * Handles the links from one group to others.
 */
export interface LinkManager {
  /**
   * Uses a link processor to manage the iteration.
   */
  processAllLeavingLinks(compound: boolean, mask: number, lp: LinkProcessor): void;

  /**
   * Called when two original groups (linked to this LM) are merged into a compound group.
   */
  notifyMerge(g: CompoundGroup, aRemains: boolean, bRemains: boolean): void;

  /**
   * Called when a group (linked to this LM) changes container, because a container gets completed.
   * With no argument: called when this group changes container.
   */
  notifyContainerChange(g?: Group): void;

  /**
   * Called when the group with it's links being managed has an axis change
   */
  notifyAxisChange(): void;
  subset(mask: number): ReadonlyArray<LinkDetail>;
  subsetGroup(mask: number): ReadonlyArray<Group>;
  allMask(): number;

  get(g: Group): LinkDetail | null;

  /**
   * Adds links to the link manager.
   */
  sortLink(
    d: Direction | null,
    otherGroup: Group,
    linkValue: number,
    ordering: boolean,
    linkRank: number,
    c: Iterable<BiDirectional<Connected>>,
  ): void;

  /**
   * Adds an existing link detail to the link manager (promoted from a sub-group)
   */
  sortLink(ld: LinkDetail): void;

  linkCount: number;
  forLogging(): ReadonlyMap<Group, LinkDetail>;
}
