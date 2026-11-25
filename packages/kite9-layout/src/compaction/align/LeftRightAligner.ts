import { HorizontalAlignment, VerticalAlignment, isHoriz } from "@kite9/model";
import type { Dimension, Rectangular } from "@kite9/model";
import { AlignStyle } from "../../common/algorithms/so/AlignStyle.js";
import { isAlignedRectangular } from "../../common/elements/TypeGuards.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";
import type { Aligner } from "./Aligner.js";

/**
 * If you have contradictory alignments, (e.g. thing on left wants to align right, thing on right
 * wants to align left) then this is going to be inconsistent.
 */
export class LeftRightAligner implements Aligner {
  alignFor(_co: Rectangular, de: ReadonlySet<Rectangular>, c: Compaction, d: Dimension): void {
    const sso = c.getSlackOptimisation(d);
    for (const r of de) {
      this.alignRectangular(r, sso, d);
    }
  }

  private alignRectangular(de: Rectangular, sso: SlackOptimisation, d: Dimension): void {
    const oss = sso.getSlideablesFor(de);
    if (oss != null) {
      this.alignSegment(oss.l, d);
      this.alignSegment(oss.r, d);
    }
  }

  private getAlignStyle(sl: CompactionSlideable, d: Dimension): AlignStyle | null {
    for (const a of sl.getRectAnchors()) {
      const it = a.e;
      if (!isAlignedRectangular(it)) continue;
      if (isHoriz(d)) {
        switch (it.getVerticalAlignment()) {
          case VerticalAlignment.TOP:
            return AlignStyle.MIN;
          case VerticalAlignment.CENTER:
            return AlignStyle.CENTER;
          case VerticalAlignment.BOTTOM:
            return AlignStyle.MAX;
        }
      } else {
        switch (it.getHorizontalAlignment()) {
          case HorizontalAlignment.LEFT:
            return AlignStyle.MIN;
          case HorizontalAlignment.CENTER:
            return AlignStyle.CENTER;
          case HorizontalAlignment.RIGHT:
            return AlignStyle.MAX;
        }
      }
    }
    return null;
  }

  private alignSegment(sl: CompactionSlideable, d: Dimension): void {
    const style = this.getAlignStyle(sl, d);
    if (style === AlignStyle.MAX) {
      sl.minimumPosition = sl.maximumPosition;
    } else if (style === AlignStyle.MIN) {
      sl.maximumPosition = sl.minimumPosition;
    }
  }

  willAlign(de: Rectangular, d: Dimension): boolean {
    if (!isAlignedRectangular(de)) {
      return false;
    }
    return isHoriz(d)
      ? de.getHorizontalAlignment() === HorizontalAlignment.LEFT ||
          de.getHorizontalAlignment() === HorizontalAlignment.RIGHT
      : de.getVerticalAlignment() === VerticalAlignment.TOP ||
          de.getVerticalAlignment() === VerticalAlignment.BOTTOM;
  }
}
