import {
  HorizontalAlignment,
  Layout,
  VerticalAlignment,
  isHoriz,
  isHorizontalLayout,
} from "@kite9/model";
import type { Dimension, Rectangular } from "@kite9/model";
import { isAlignedRectangular } from "../../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../../logging/Kite9Log.js";
import type { Logable } from "../../logging/Logable.js";
import { LogicException } from "../../logging/LogicException.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";
import type { Aligner } from "./Aligner.js";

/**
 * Basic approach:
 * - The container is fixed, but we want to make the amount of space between each element, or element and container, even.
 * - To do this, proceed from the outside to the inside elements.
 * - For the outside elements, work out the minimum amount of slack they have, divide it by the number of gaps (i.e. remaining elements + 1)
 * - Reduce the outside gaps by this amount.
 * - Move to the next level of analysis.
 */
export class CenteringAligner implements Aligner, Logable {
  private _log: Kite9Log | null = null;

  get log(): Kite9Log {
    return (this._log ??= kite9Log(this));
  }

  alignFor(co: Rectangular, de: ReadonlySet<Rectangular>, c: Compaction, d: Dimension): void {
    const sso = c.getSlackOptimisation(d);
    this.log.send(`Center Align: ${d} ${co}`, de);
    const l = co.getLayout();
    const inLine = isHorizontalLayout(l) === isHoriz(d);
    if (l === Layout.GRID) {
      // you can't centre anything on a grid, since cells use all the space in the grid.
      return;
    }

    const containerSlideables = sso.getSlideablesFor(co);

    if (containerSlideables == null) {
      this.log.send(`Was expecting something for ${co}`);
      return;
    }

    const leftSlack = this.minSlack(containerSlideables.l);
    const rightSlack = this.minSlack(containerSlideables.r);
    const slackToHave = Math.min(leftSlack, rightSlack);

    const matches = this.findRelevantSlideables(de, sso);
    this.log.send("Slideables to Align: ", matches);
    if (inLine) {
      for (let i = 0; i < Math.ceil(matches.length / 2.0); i++) {
        const leftD = matches[i]!;
        const rightD = matches[matches.length - i - 1]!;
        this.centerSlideables(leftD, rightD, matches.length - i, slackToHave);
      }
    } else {
      // everything centered, in a line
      matches.forEach((it) => this.centerSlideables(it, it, 1, slackToHave));
    }
  }

  findRelevantSlideables(
    des: ReadonlySet<Rectangular>,
    sso: SlackOptimisation,
  ): RectangularSlideableSet[] {
    return [...des]
      .map((it) => sso.getSlideablesFor(it))
      .filter((it): it is RectangularSlideableSet => it != null)
      .sort((a, b) => a.l.minimumPosition - b.l.minimumPosition);
  }

  private centerSlideables(
    left: RectangularSlideableSet,
    right: RectangularSlideableSet,
    elementCount: number,
    slackToHave: number,
  ): number {
    const leftSlack = this.minSlack(left.l);
    const rightSlack = this.minSlack(right.r);
    let slackToUse = Math.max(Math.min(leftSlack, rightSlack) - slackToHave, 0);
    if (slackToUse === 0) {
      return 0;
    }
    slackToUse = Math.trunc(slackToUse / (elementCount + 1));
    try {
      const leftFixed = left.l.minimumPosition + slackToUse;
      const rightFixed = right.r.maximumPosition - slackToUse;
      left.l.minimumPosition = leftFixed;
      right.r.maximumPosition = rightFixed;

      // remove all remaining slack
      right.r.minimumPosition = right.r.maximumPosition;
      left.l.maximumPosition = left.l.minimumPosition;

      return slackToUse;
    } catch (e) {
      throw new LogicException("Could not set center align constraint: ", e);
    }
  }

  private minSlack(l: CompactionSlideable): number {
    return l.maximumPosition - l.minimumPosition;
  }

  willAlign(de: Rectangular, d: Dimension): boolean {
    if (!isAlignedRectangular(de)) {
      return false;
    }
    return isHoriz(d)
      ? de.getHorizontalAlignment() === HorizontalAlignment.CENTER
      : de.getVerticalAlignment() === VerticalAlignment.CENTER;
  }

  get prefix(): string {
    return "CNRA";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }
}
