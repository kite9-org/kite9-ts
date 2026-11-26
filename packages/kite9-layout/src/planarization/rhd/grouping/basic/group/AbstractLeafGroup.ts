import type { BiDirectional, Connected, Direction, Layout, Rectangular } from "@kite9/model";
import { isDiagram, isRectangular } from "../../../../../common/elements/TypeGuards.js";
import type { Hints } from "../../../../../common/hints/DistanceFunctions.js";
import type { LinkProcessor } from "../../../links/LinkManager.js";
import type { GroupLinkNode } from "../../GroupLinkNode.js";
import { AbstractGroup } from "./AbstractGroup.js";
import type { Group } from "./Group.js";
import { getAxisLayout, type LeafGroup } from "./LeafGroup.js";

const EMPTY_HINTS: Hints = new Map();

/**
 * Represents a single vertex (glyph, context) within the diagram
 */
export abstract class AbstractLeafGroup extends AbstractGroup implements LeafGroup {
  readonly kind = "leaf" as const;
  readonly height: number = 0;
  readonly groupOrdinal: number;
  readonly size: number = 1;
  layout: Layout | null;

  constructor(
    readonly connected: GroupLinkNode,
    readonly container: Rectangular,
    groupNumber: number,
    hc: number,
  ) {
    super(groupNumber, hc);
    this.groupOrdinal = groupNumber;
    this.layout = getAxisLayout(container.getContainer());
  }

  occupiesSpace(): boolean {
    return isRectangular(this.connected);
  }

  toString(): string {
    return (
      "[" +
      this.groupNumber +
      this.connected +
      "(" +
      (this.occupiesSpace() ? "*" : ".") +
      (isDiagram(this.container) ? "" : ` c: ${this.container}`) +
      "," +
      this.axis +
      ")]"
    );
  }

  contains(lg: Group): boolean {
    return this === lg;
  }

  processLowestLevelLinks(lp: LinkProcessor): void {
    this.processAllLeavingLinks(false, this.linkManager.allMask(), lp);
  }

  sortLink(
    d: Direction | null,
    otherGroup: Group,
    linkValue: number,
    ordering: boolean,
    linkRank: number,
    c: Iterable<BiDirectional<Connected>>,
  ): void {
    this.linkManager.sortLink(d, otherGroup, linkValue, ordering, linkRank, c);
  }

  get hints(): Hints {
    return EMPTY_HINTS;
  }

  addLeafGroupOrdinalsToSet(s: Set<number>): void {
    s.add(this.groupNumber);
  }
}
