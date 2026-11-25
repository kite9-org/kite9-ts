import {
  Direction,
  Layout,
  reverseLayout,
  rotateLayoutAntiClockwise,
  rotateLayoutClockwise,
} from "@kite9/model";
import {
  compareEitherXBounds,
  compareEitherYBounds,
} from "../../../common/hints/DistanceFunctions.js";
import { kite9Log, type Kite9Log } from "../../../logging/Kite9Log.js";
import type { Logable } from "../../../logging/Logable.js";
import { LogicException } from "../../../logging/LogicException.js";
import type { GroupResult } from "../grouping/GroupResult.js";
import type { CompoundGroup } from "../grouping/basic/group/CompoundGroup.js";
import { isCompoundGroup, type Group } from "../grouping/basic/group/Group.js";
import { DirectedLinkManager } from "../grouping/directed/group/DirectedLinkManager.js";
import type { RoutableHandler2D } from "../position/RoutableHandler2D.js";
import type { LayoutQueue } from "./LayoutQueue.js";
import type { LayoutStrategy } from "./LayoutStrategy.js";
import type { PlacementApproach } from "./PlacementApproach.js";

const TOLERANCE = 0.0000001;

/**
 * Provides the basic code for a top-down approach to laying out groups, but doesn't specify either
 * the algorithm used to choose the approach or the ordering of the groups.
 *
 * @author robmoffat
 */
export abstract class AbstractTopDownLayoutStrategy implements LayoutStrategy, Logable {
  log: Kite9Log = kite9Log(this);

  constructor(readonly rh: RoutableHandler2D) {}

  get prefix(): string {
    return "TDLS";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  private chooseBestCompoundGroupPlacement(gg: CompoundGroup): void {
    this.rh.clearTempPositions(true);
    this.rh.clearTempPositions(false);
    const gt = gg.axis;
    const ld = gg.layout;
    const canBeHoriz = gt.isHorizontal;
    const canBeVert = gt.isVertical;
    const horizLayoutUnknown = (ld == null || ld === Layout.HORIZONTAL) && canBeHoriz;
    const vertLayoutUnknown = (ld == null || ld === Layout.VERTICAL) && canBeVert;
    const canDecideLayout = horizLayoutUnknown || vertLayoutUnknown;

    this.log.send("Group A: " + gg.a);
    this.log.send("Group B: " + gg.b);
    if (canDecideLayout) {
      const layoutNeeded = this.groupsNeedLayout(
        gg.a,
        gg.b,
        horizLayoutUnknown,
        vertLayoutUnknown,
        ld,
      );
      if (layoutNeeded) {
        // this is the expensive part - layout is required. Choose one
        const hintedLayout = this.getHintedLayout(gg, canBeHoriz, canBeVert, ld);
        let best: PlacementApproach | null = null;
        best = this.tryPlacement(
          gg,
          best,
          this.filterLayout(hintedLayout, horizLayoutUnknown, vertLayoutUnknown),
          true,
        );
        best = this.tryPlacement(
          gg,
          best,
          this.filterLayout(reverseLayout(hintedLayout), horizLayoutUnknown, vertLayoutUnknown),
          false,
        );
        best = this.tryPlacement(
          gg,
          best,
          this.filterLayout(
            rotateLayoutClockwise(hintedLayout),
            horizLayoutUnknown,
            vertLayoutUnknown,
          ),
          false,
        );
        best = this.tryPlacement(
          gg,
          best,
          this.filterLayout(
            rotateLayoutAntiClockwise(hintedLayout),
            horizLayoutUnknown,
            vertLayoutUnknown,
          ),
          false,
        );
        best?.choose();
      }
    } else {
      const ld2 = ld === Layout.HORIZONTAL || ld === Layout.VERTICAL ? null : ld;

      const pa = this.createPlacementApproach(gg, ld2, true);
      pa.choose();
      this.log.send(`Group layout = ${ld2}`);
    }
  }

  private filterLayout(naturalLayout: Layout | null, horiz: boolean, vert: boolean): Layout | null {
    switch (naturalLayout) {
      case Layout.LEFT:
      case Layout.RIGHT:
        return horiz ? naturalLayout : null;
      case Layout.DOWN:
      case Layout.UP:
        return vert ? naturalLayout : null;
      default:
        throw new LogicException(`Layout should be definite for an approach: ${naturalLayout}`);
    }
  }

  /**
   * Layout can be hinted either by the [PositioningHints] of the groups, or by the ordinal order
   * of the elements in the container. If the layout of the container is HORIZONTAL or VERTICAL,
   * favour the ordinal, otherwise favour the [PositioningHints] where available.
   */
  private getHintedLayout(
    gg: CompoundGroup,
    setHoriz: boolean,
    setVert: boolean,
    prescribed: Layout | null,
  ): Layout | null {
    let bx: number | null = null;
    let by: number | null = null;
    let out: Layout | null = null;
    const a = gg.a;
    const b = gg.b;
    if (setVert) {
      if (prescribed === Layout.VERTICAL) {
        return this.getVerticalOrdinalLayout(a, b);
      } else if (prescribed == null) {
        by = compareEitherYBounds(a.hints, b.hints);
        out = this.getVerticalOrdinalLayout(a, b);
      }
    }
    if (setHoriz) {
      if (prescribed === Layout.HORIZONTAL) {
        return this.getHorizontalOrdinalLayout(a, b);
      } else if (prescribed == null) {
        bx = compareEitherXBounds(a.hints, b.hints);
        out = this.getHorizontalOrdinalLayout(a, b);
      }
    }
    if (bx != null) {
      if (bx === 1) {
        return Layout.LEFT;
      } else if (bx === -1) {
        return Layout.RIGHT;
      }
    }
    if (by != null) {
      if (by === 1) {
        return Layout.UP;
      } else if (by === -1) {
        return Layout.DOWN;
      }
    }
    return out;
  }

  private getHorizontalOrdinalLayout(a: Group, b: Group): Layout {
    return a.groupOrdinal < b.groupOrdinal ? Layout.RIGHT : Layout.LEFT;
  }

  private getVerticalOrdinalLayout(a: Group, b: Group): Layout {
    return a.groupOrdinal < b.groupOrdinal ? Layout.DOWN : Layout.UP;
  }

  private groupsNeedLayout(
    a: Group,
    b: Group,
    horizLayoutUnknown: boolean,
    vertLayoutUnknown: boolean,
    l: Layout | null,
  ): boolean {
    if (this.groupsOverlap(a, b)) {
      return true;
    }
    const straightVerticals = this.groupsHaveStraightEdges(a, b, false);
    if ((horizLayoutUnknown || l === Layout.VERTICAL) && straightVerticals) {
      return true;
    }
    const straightHorizontals = this.groupsHaveStraightEdges(a, b, true);
    return (vertLayoutUnknown || l === Layout.HORIZONTAL) && straightHorizontals;
  }

  private groupsHaveStraightEdges(a: Group, b: Group, horiz: boolean): boolean {
    const mask = DirectedLinkManager.createMask(
      null,
      false,
      false,
      horiz ? Direction.LEFT : Direction.UP,
      horiz ? Direction.RIGHT : Direction.DOWN,
    );
    const aHasLinks = a.linkManager.subset(mask).length > 0;
    const bHasLinks = b.linkManager.subset(mask).length > 0;
    return aHasLinks || bHasLinks;
  }

  private groupsOverlap(a: Group, b: Group): boolean {
    const ari = a.axis.getPosition(this.rh, true);
    const bri = b.axis.getPosition(this.rh, true);
    return this.rh.overlaps(ari, bri);
  }

  private tryPlacement(
    gg: CompoundGroup,
    best: PlacementApproach | null,
    d: Layout | null,
    natural: boolean,
  ): PlacementApproach | null {
    if (d != null && (best == null || best.score > 0)) {
      const newpl = this.createPlacementApproach(gg, d, natural);
      newpl.evaluate();
      this.log.send(
        this.log.go() ? null : `${gg.groupNumber} going ${d}  score: ${newpl.score}`,
      );
      if (best == null) {
        return newpl;
      } else if (best.score <= newpl.score + TOLERANCE) {
        return best;
      } else if (best.score >= newpl.score + TOLERANCE) {
        return newpl;
      } else if (best.natural) {
        return best;
      } else if (newpl.natural) {
        return newpl;
      } else {
        return best;
      }
    }
    return best;
  }

  protected abstract createPlacementApproach(
    gg: CompoundGroup,
    ld: Layout | null,
    natural: boolean,
  ): PlacementApproach;

  private chooseBestPlacement(lq: LayoutQueue): void {
    let g = lq.poll();
    while (g != null) {
      g.axis.getPosition(this.rh, false);
      this.log.send(
        this.log.go()
          ? null
          : "Ordering " +
              g.groupNumber +
              " size=" +
              g.size +
              " links=" +
              g.linkManager.linkCount,
      );
      this.log.send("");
      if (isCompoundGroup(g)) {
        const cg = g;
        this.chooseBestCompoundGroupPlacement(cg);
        lq.complete(cg);
        lq.offer(cg.a);
        lq.offer(cg.b);
      }
      g = lq.poll();
    }
  }

  layout(mr: GroupResult, lq: LayoutQueue): void {
    const g = mr.groups()[Symbol.iterator]().next().value as Group;
    lq.offer(g);
    this.chooseBestPlacement(lq);
  }
}
