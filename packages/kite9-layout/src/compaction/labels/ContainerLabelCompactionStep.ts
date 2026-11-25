import {
  DiagramElementType,
  Dimension,
  Direction,
  HorizontalAlignment,
  VerticalAlignment,
  isHoriz,
  isHorizontalDirection,
} from "@kite9/model";
import type { ConnectedRectangular, DiagramElement, Label, Rectangular } from "@kite9/model";
import { isConnectedRectangular, isRectangular } from "../../common/elements/TypeGuards.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { Compaction } from "../Compaction.js";
import { CompactionSlideable } from "../CompactionSlideable.js";
import { AbstractBuilderCompactionStep } from "../hierarchy/AbstractBuilderCompactionStep.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

const HORIZONTAL_ORDINAL: Record<HorizontalAlignment, number> = {
  [HorizontalAlignment.LEFT]: 0,
  [HorizontalAlignment.CENTER]: 1,
  [HorizontalAlignment.RIGHT]: 2,
};

const VERTICAL_ORDINAL: Record<VerticalAlignment, number> = {
  [VerticalAlignment.TOP]: 0,
  [VerticalAlignment.CENTER]: 1,
  [VerticalAlignment.BOTTOM]: 2,
};

function isLabel(de: DiagramElement): de is Label {
  return de.getType() === DiagramElementType.LABEL;
}

export class ContainerLabelCompactionStep extends AbstractBuilderCompactionStep {
  private firstGroup = true;

  get prefix(): string {
    return "C2LB";
  }

  usingGroups(_contents: readonly ConnectedRectangular[], _topGroup: Group | null): boolean {
    return false;
  }

  compact(c: Compaction, _g: Group): void {
    if (this.firstGroup) {
      this.addLabels(c.getDiagram(), c);
      this.firstGroup = false;
    }
  }

  private addLabels(c: Rectangular, c2: Compaction): void {
    // handle recursion
    for (const it of c.getContents()) {
      if (isRectangular(it)) this.addLabels(it, c2);
    }

    const allContent: Rectangular[] = c.getContents().filter(isConnectedRectangular);
    const allLabels = c.getContents().filter(isLabel);

    const labelsBySide = new Map<Direction, Label[]>();
    for (const l of allLabels) {
      const k = l.getLabelPlacement() ?? Direction.DOWN;
      let ll = labelsBySide.get(k);
      if (ll == null) {
        ll = [];
        labelsBySide.set(k, ll);
      }
      ll.push(l);
    }
    for (const [k, ll] of labelsBySide) {
      if (isHorizontalDirection(k)) {
        ll.sort(
          (a, b) =>
            HORIZONTAL_ORDINAL[a.getHorizontalAlignment()] -
            HORIZONTAL_ORDINAL[b.getHorizontalAlignment()],
        );
      } else {
        ll.sort(
          (a, b) =>
            VERTICAL_ORDINAL[a.getVerticalAlignment()] - VERTICAL_ORDINAL[b.getVerticalAlignment()],
        );
      }
    }

    const leftLabels = labelsBySide.get(Direction.LEFT) ?? [];
    this.addLabelsToSide(Direction.LEFT, leftLabels, c, c2, allContent);

    const rightLabels = labelsBySide.get(Direction.RIGHT) ?? [];
    this.addLabelsToSide(Direction.RIGHT, rightLabels, c, c2, [...allContent, ...leftLabels]);

    const upLabels = labelsBySide.get(Direction.UP) ?? [];
    this.addLabelsToSide(Direction.UP, upLabels, c, c2, [
      ...allContent,
      ...leftLabels,
      ...rightLabels,
    ]);

    const downLabels = labelsBySide.get(Direction.DOWN) ?? [];
    this.addLabelsToSide(Direction.DOWN, downLabels, c, c2, [
      ...allContent,
      ...leftLabels,
      ...rightLabels,
      ...upLabels,
    ]);
  }

  private createSlideables(
    cso: SlackOptimisation,
    ll: ReadonlySet<Label>,
    d: Dimension,
    dd: Direction,
  ): RectangularSlideableSet[] {
    const needsIntersection = isHoriz(d) === isHorizontalDirection(dd) && ll.size > 1;
    const c = needsIntersection ? CompactionSlideable.forLabels(cso, d, [...ll]) : null;
    if (c != null) {
      cso.addSlideable(c);
    }
    return [...ll].map((it) => {
      this.log.send(`Creating ${it}`);
      return this.checkCreateElement(it, d, cso, c, null);
    });
  }

  private addLabelsToSide(
    d: Direction,
    ll: readonly Label[],
    c: Rectangular,
    c2: Compaction,
    allContent: readonly Rectangular[],
  ): void {
    if (ll.length === 0) {
      return;
    }
    const csoh = c2.getSlackOptimisation(Dimension.H);
    const csov = c2.getSlackOptimisation(Dimension.V);

    // label slideable sets
    const hss = this.createSlideables(csoh, new Set(ll), Dimension.H, d);
    const vss = this.createSlideables(csov, new Set(ll), Dimension.V, d);

    // container slideable sets
    const cssh = csoh.getSlideablesFor(c);
    const cssv = csov.getSlideablesFor(c);

    // content slideable sets
    const hssContent = allContent.map((it) => csoh.getSlideablesFor(it));
    const vssContent = allContent.map((it) => csov.getSlideablesFor(it));

    if (cssh == null || cssv == null) {
      // can't place labels if container is invisible
      return;
    }

    switch (d) {
      case Direction.RIGHT:
        this.log.send("Elements with direction RIGHT: ", ll);
        this.separateItems(vss, Dimension.V, csov, cssv);
        this.ensureSeparateInternal(hss, cssh, Dimension.H, csoh);
        this.ensureSeparated(hssContent, hss, Dimension.H, csoh);
        break;
      case Direction.LEFT:
        this.log.send("Elements with direction RIGHT: ", ll);
        this.separateItems(vss, Dimension.V, csov, cssv);
        this.ensureSeparateInternal(hss, cssh, Dimension.H, csoh);
        this.ensureSeparated(hss, hssContent, Dimension.H, csoh);
        break;
      case Direction.DOWN:
        this.log.send("Elements with direction DOWN: ", ll);
        this.separateItems(hss, Dimension.H, csoh, cssh);
        this.ensureSeparated(vssContent, vss, Dimension.V, csov);
        this.ensureSeparateInternal(vss, cssv, Dimension.V, csov);
        break;
      case Direction.UP:
        this.log.send("Elements with direction UP: ", ll);
        this.separateItems(hss, Dimension.H, csoh, cssh);
        this.ensureSeparateInternal(vss, cssv, Dimension.V, csov);
        this.ensureSeparated(vss, vssContent, Dimension.V, csov);
        break;
    }
  }

  private ensureSeparated(
    above: readonly (RectangularSlideableSet | null)[],
    below: readonly (RectangularSlideableSet | null)[],
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    for (const a of above) {
      if (a == null) continue;
      const deA = a.e;
      for (const b of below) {
        if (b == null) continue;
        const deB = b.e;
        const dist = this.getMinimumDistanceBetween(deA, Side.END, deB, Side.START, d, null, true);
        cso.ensureMinimumDistance(a.r, b.l, Math.trunc(dist));
      }
    }
  }

  private ensureSeparateInternal(
    inside: readonly (RectangularSlideableSet | null)[],
    o: RectangularSlideableSet,
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    const deOut = o.e;

    for (const i of inside) {
      if (i == null) continue;
      const deIn = i.e;
      const distUp = this.getMinimumDistanceBetween(deOut, Side.START, deIn, Side.START, d, null, true);
      const distDown = this.getMinimumDistanceBetween(deIn, Side.END, deOut, Side.END, d, null, true);
      cso.ensureMinimumDistance(o.l, i.l, Math.trunc(distUp));
      cso.ensureMinimumDistance(i.r, o.r, Math.trunc(distDown));
    }
  }

  private separateItems(
    values: readonly RectangularSlideableSet[],
    d: Dimension,
    cso: SlackOptimisation,
    containerSS: RectangularSlideableSet,
  ): void {
    let prev: RectangularSlideableSet | null = null;
    for (const it of values) {
      if (prev != null) {
        this.separateTwo(prev, it, d, cso);
      } else {
        this.separateInternalStart(containerSS, it, d, cso);
      }
      prev = it;
    }

    this.separateInternalEnd(containerSS, values[values.length - 1]!, d, cso);
  }

  private separateTwo(
    left: RectangularSlideableSet,
    right: RectangularSlideableSet,
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    const dist = this.getMinimumDistanceBetween(left.e, Side.END, right.e, Side.START, d, null, false);
    cso.ensureMinimumDistance(left.r, right.l, Math.trunc(dist));
  }

  private separateInternalStart(
    outer: RectangularSlideableSet,
    inner: RectangularSlideableSet,
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    const dist = this.getMinimumDistanceBetween(outer.e, Side.START, inner.e, Side.START, d, null, true);
    cso.ensureMinimumDistance(outer.l, inner.l, Math.trunc(dist));
  }

  private separateInternalEnd(
    outer: RectangularSlideableSet,
    inner: RectangularSlideableSet,
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    const dist = this.getMinimumDistanceBetween(inner.e, Side.END, outer.e, Side.START, d, null, true);
    cso.ensureMinimumDistance(inner.r, outer.r, Math.trunc(dist));
  }
}
