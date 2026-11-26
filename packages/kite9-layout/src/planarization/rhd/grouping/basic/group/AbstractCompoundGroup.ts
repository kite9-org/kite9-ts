import type { Layout } from "@kite9/model";
import type { Hints } from "../../../../../common/hints/DistanceFunctions.js";
import { LogicException } from "../../../../../logging/LogicException.js";
import type { LinkDetail, LinkProcessor } from "../../../links/LinkManager.js";
import { AbstractGroup } from "./AbstractGroup.js";
import type { CompoundGroup } from "./CompoundGroup.js";
import type { Group } from "./Group.js";

const EMPTY_HINTS: Hints = new Map();

/**
 * Represents the relative positions of two other groups within the diagram, allowing the immediate
 * contents of any container to be expressed as a binary tree.
 */
export abstract class AbstractCompoundGroup extends AbstractGroup implements CompoundGroup {
  readonly kind = "compound" as const;
  readonly groupOrdinal: number;
  readonly height: number;
  readonly hints: Hints = EMPTY_HINTS;
  layout: Layout | null = null;

  abstract readonly internalLinkA: LinkDetail | null;
  abstract readonly internalLinkB: LinkDetail | null;

  constructor(
    readonly a: Group,
    readonly b: Group,
    /** true if non-axis merge */
    private readonly treatAsLeaf: boolean,
    groupNumber: number,
    readonly size: number,
    hc: number,
  ) {
    super(groupNumber, hc);
    this.groupOrdinal = Math.min(a.groupOrdinal, b.groupOrdinal);
    this.height = Math.max(a.height, b.height) + 1;
  }

  addLeafGroupOrdinalsToSet(s: Set<number>): void {
    if (this.treatAsLeaf) {
      s.add(this.groupNumber);
    } else {
      this.a.addLeafGroupOrdinalsToSet(s);
      this.b.addLeafGroupOrdinalsToSet(s);
    }
  }

  /**
   * This will process [OrderingTemporaryConnection]s first, so that if there is a contradiction
   * in the links, it will occur on one of the Link - Connections.
   */
  fileLinks(linksGroup: Group, toGroup: Group): LinkDetail | null {
    const ldOut: LinkDetail[] = [];
    linksGroup.processAllLeavingLinks(true, this.linkManager.allMask(), {
      process: (_originatingGroup, destinationGroup, ld) => {
        const ld2 = this.fileLink(linksGroup, destinationGroup, toGroup, ld);
        if (ld2 != null) {
          ldOut.push(ld2);
        }
      },
    });

    if (ldOut.length === 0) {
      return null;
    } else if (ldOut.length === 1) {
      return ldOut[0]!;
    } else {
      throw new LogicException("Too many internal links?");
    }
  }

  private fileLink(
    _from: Group,
    to: Group,
    merging: Group,
    ld: LinkDetail,
  ): LinkDetail | null {
    const internal = merging.contains(to);
    if (!internal) {
      this.linkManager.sortLink(ld);
    } else if (merging === to) {
      return ld;
    }
    return null;
  }

  toString(): string {
    return `[${this.groupNumber}${this.a},${this.b}:${this.axis}]`;
  }

  contains(lg: Group): boolean {
    if (this === lg) {
      return true;
    }
    /** Obviously, we can't contain bigger groups than ourselves. */
    if (lg.size >= this.size) {
      return false;
    }
    /** Also, can't create later-created groups than this. */
    if (lg.groupNumber > this.groupNumber) {
      return false;
    }
    return this.a.contains(lg) || this.b.contains(lg);
  }

  processLowestLevelLinks(lp: LinkProcessor): void {
    this.a.processLowestLevelLinks(lp);
    this.b.processLowestLevelLinks(lp);
  }
}
