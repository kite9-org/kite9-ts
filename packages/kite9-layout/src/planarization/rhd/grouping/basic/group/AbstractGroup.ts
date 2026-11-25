import type { Layout } from "@kite9/model";
import type { Hints } from "../../../../../common/hints/DistanceFunctions.js";
import type { Kite9Log } from "../../../../../logging/Kite9Log.js";
import type { GroupAxis } from "../../../GroupAxis.js";
import type { LinkDetail, LinkManager, LinkProcessor } from "../../../links/LinkManager.js";
import type { Group } from "./Group.js";

export abstract class AbstractGroup implements Group {
  abstract readonly kind: "leaf" | "compound";
  abstract readonly groupOrdinal: number;
  abstract readonly size: number;
  abstract readonly axis: GroupAxis;
  abstract readonly linkManager: LinkManager;
  abstract readonly height: number;
  abstract layout: Layout | null;
  abstract readonly hints: Hints;

  abstract processLowestLevelLinks(lp: LinkProcessor): void;
  abstract addLeafGroupOrdinalsToSet(s: Set<number>): void;
  abstract contains(lg: Group): boolean;

  live = false;

  private _leafList: string | null = null;

  protected constructor(
    readonly groupNumber: number,
    readonly hc: number,
  ) {}

  /** Returns the leaf group number (or numbers for compound group) composing this group. */
  get leafList(): string {
    if (this._leafList == null) {
      const gs = new Set<number>();
      this.addLeafGroupOrdinalsToSet(gs);
      const sortedList = [...gs].sort((a, b) => a - b);
      this._leafList = `[${sortedList.join(", ")}]`;
    }
    return this._leafList;
  }

  isActive(): boolean {
    return this.axis.active;
  }

  /** TODO: use the group number for hashcode in a more normal way. */
  getID(): string {
    return `g${this.groupNumber}`;
  }

  processAllLeavingLinks(compound: boolean, mask: number, lp: LinkProcessor): void {
    this.linkManager.processAllLeavingLinks(compound, mask, lp);
  }

  getLink(g: Group): LinkDetail | null {
    return this.linkManager.get(g);
  }

  log(log: Kite9Log): void {
    log.send(`Group: ${this}`);
    log.send("  Links:", this.linkManager.forLogging());
  }

  hashCode(): number {
    return this.hc;
  }
}
