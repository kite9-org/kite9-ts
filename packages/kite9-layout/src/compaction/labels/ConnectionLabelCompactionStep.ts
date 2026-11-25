import { Dimension, Direction } from "@kite9/model";
import type {
  Connected,
  ConnectedRectangular,
  Connection,
  Label,
  Positioned,
} from "@kite9/model";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AnchorType } from "../anchors/ConnAnchor.js";
import { KeyedMap, objectId } from "../CollectionUtils.js";
import type { Compaction } from "../Compaction.js";
import { CompactionSlideable } from "../CompactionSlideable.js";
import { AbstractBuilderCompactionStep } from "../hierarchy/AbstractBuilderCompactionStep.js";
import { RoutePoint } from "../routing/RoutePoint.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

type S = CompactionSlideable;
/** Kotlin `Pair<Connected, Side>` */
type ConnectedSide = readonly [Connected, Side];
type Edge = readonly [S, S];

const connectedSideKey = (p: ConnectedSide): string => `${objectId(p[0])}|${p[1]}`;

export class ConnectionLabelCompactionStep extends AbstractBuilderCompactionStep {
  get prefix(): string {
    return "C2LA";
  }

  private prepareConnectedMap(c2: Compaction): KeyedMap<ConnectedSide, Set<Label>> {
    const out = new KeyedMap<ConnectedSide, Set<Label>>(connectedSideKey);

    const ensureMapping = (ll: Label | null, s: Side, c: Connected): void => {
      if (ll != null) {
        out.getOrPut([c, s], () => new Set()).add(ll);
      }
    };

    const getSide = (e: Connected, c: Connection, so2: SlackOptimisation): Side => {
      const ss = so2.getSlideablesFor(e);

      if (ss != null) {
        if (ss.l.getConnAnchors().some((it) => it.e === c)) {
          return Side.START;
        } else if (ss.r.getConnAnchors().some((it) => it.e === c)) {
          return Side.END;
        }
      }

      return Side.NEITHER;
    };

    const doDimension = (so1: SlackOptimisation, so2: SlackOptimisation): void => {
      for (const s of so1.getAllSlideables()) {
        for (const ca of s.getConnAnchors()) {
          const e = ca.e;

          const from = e.getFrom();
          const fromSide = getSide(from, e, so2);
          if (fromSide !== Side.NEITHER) {
            ensureMapping(e.getFromLabel(), fromSide, from);
          }

          const to = e.getTo();
          const toSide = getSide(to, e, so2);
          if (toSide !== Side.NEITHER) {
            ensureMapping(e.getToLabel(), toSide, to);
          }
        }
      }
    };

    doDimension(c2.getSlackOptimisation(Dimension.V), c2.getSlackOptimisation(Dimension.H));
    doDimension(c2.getSlackOptimisation(Dimension.H), c2.getSlackOptimisation(Dimension.V));

    return out;
  }

  private prepareLabelMap(so1: SlackOptimisation): Map<Label, S> {
    const out = new Map<Label, S>();
    for (const s of so1.getAllSlideables()) {
      for (const ca of s.getConnAnchors()) {
        const idx = ca.s;
        if (ca.type === AnchorType.TERMINAL) {
          const label = idx === 0 ? ca.e.getToLabel() : ca.e.getFromLabel();
          if (label != null && !out.has(label)) {
            out.set(label, s);
          }
        } else if (ca.type === AnchorType.AFTER_FAN) {
          // we're doing fanning- overrides terminal labelling
          const label = idx === 0.4 ? ca.e.getToLabel() : ca.e.getFromLabel();
          if (label != null) {
            out.set(label, s);
          }
        }
      }
    }

    return out;
  }

  private prepareFanMap(so1: SlackOptimisation): KeyedMap<ConnectedSide, Set<S>> {
    const out = new KeyedMap<ConnectedSide, Set<S>>(connectedSideKey);
    for (const s of so1.getAllSlideables()) {
      for (const ca of s.getConnAnchors()) {
        if (ca.connectedEnd != null && ca.connectedSide !== Side.NEITHER) {
          out.getOrPut([ca.connectedEnd, ca.connectedSide], () => new Set()).add(s);
        }
      }
    }

    return out;
  }

  private prepareArrivalSideMap(c2: Compaction): Map<Label, Direction> {
    const out = new Map<Label, Direction>();

    const storeArrivalSide = (l: Label | null, r: Connected, s: S, hv: Dimension): void => {
      if (l == null) {
        return;
      }

      for (const it of s.getRectAnchors()) {
        if (it.e === r) {
          let d: Direction;
          if (it.s === Side.START) {
            d = hv === Dimension.V ? Direction.UP : Direction.LEFT;
          } else {
            d = hv === Dimension.V ? Direction.DOWN : Direction.RIGHT;
          }
          out.set(l, d);
        }
      }
    };

    const doDimension = (so1: SlackOptimisation, d: Dimension): void => {
      for (const s of so1.getAllSlideables()) {
        for (const ca of s.getConnAnchors()) {
          if (ca.type !== AnchorType.TERMINAL) continue;
          const e = ca.e;
          storeArrivalSide(e.getFromLabel(), e.getFrom(), s, d);
          storeArrivalSide(e.getToLabel(), e.getTo(), s, d);
        }
      }
    };

    doDimension(c2.getSlackOptimisation(Dimension.V), Dimension.V);
    doDimension(c2.getSlackOptimisation(Dimension.H), Dimension.H);

    return out;
  }

  usingGroups(_contents: readonly ConnectedRectangular[], _topGroup: Group | null): boolean {
    return false;
  }

  compact(c: Compaction, _g: Group): void {
    const hso = c.getSlackOptimisation(Dimension.H);
    const vso = c.getSlackOptimisation(Dimension.V);

    const vLabelMap = this.prepareLabelMap(vso);
    const hLabelMap = this.prepareLabelMap(hso);

    const vFanMap = this.prepareFanMap(vso);
    const hFanMap = this.prepareFanMap(hso);

    const directionMap = this.prepareArrivalSideMap(c);
    const connectedMap = this.prepareConnectedMap(c);

    this.label1d(c, vso, hso, connectedMap, vFanMap, directionMap, hLabelMap, vLabelMap, Direction.LEFT);
    this.label1d(c, vso, hso, connectedMap, vFanMap, directionMap, hLabelMap, vLabelMap, Direction.RIGHT);
    this.label1d(c, hso, vso, connectedMap, hFanMap, directionMap, hLabelMap, vLabelMap, Direction.UP);
    this.label1d(c, hso, vso, connectedMap, hFanMap, directionMap, hLabelMap, vLabelMap, Direction.DOWN);
  }

  private getLabelOrder(_c: ConnectedSide, allEdges: readonly Edge[]): Edge[] {
    const unique: Edge[] = [];
    for (const e of allEdges) {
      if (!unique.some((u) => u[0] === e[0] && u[1] === e[1])) unique.push(e);
    }
    return unique.sort((a, b) => a[0].minimumPosition - b[0].minimumPosition);
  }

  private label1d(
    co: Compaction,
    _so: SlackOptimisation,
    so2: SlackOptimisation,
    connectedMap: KeyedMap<ConnectedSide, Set<Label>>,
    fanMap: KeyedMap<ConnectedSide, Set<S>>,
    directionMap: ReadonlyMap<Label, Direction>,
    hLabelMap: ReadonlyMap<Label, S>,
    vLabelMap: ReadonlyMap<Label, S>,
    d: Direction,
  ): void {
    for (const [c, labels] of connectedMap) {
      // collect all labels
      const toDo = [...labels].filter((it) => directionMap.get(it) === d);

      // the list of all slideables on one side.
      const fanEdges = new Set(fanMap.get(c) ?? []);

      if (toDo.length > 0) {
        const labelledEdges: Edge[] = toDo.map((label) => {
          const vSlideable = CompactionSlideable.getNonDoneVersion(vLabelMap.get(label))!;
          const hSlideable = CompactionSlideable.getNonDoneVersion(hLabelMap.get(label))!;
          return this.handleLabel(label, new RoutePoint(vSlideable, hSlideable, Direction.DOWN), co, d, c);
        });

        const flattenedLabelEdges = new Set(labelledEdges.flatMap((p) => [p[0], p[1]]));

        const unlabelledEdges: Edge[] = [...fanEdges]
          .map((s) => CompactionSlideable.getNonDoneVersion(s)!)
          .filter((s) => !flattenedLabelEdges.has(s))
          .map((s): Edge => [s, s]);

        const sortedEdges = this.getLabelOrder(c, [...labelledEdges, ...unlabelledEdges]);

        // separate edges
        let prev: Edge | null = null;
        for (const e of sortedEdges) {
          if (prev != null) {
            so2.ensureMinimumDistance(prev[1], e[0], 5);
          }
          prev = e;
        }
      }
    }
  }

  private handleLabel(
    l: Label,
    start: RoutePoint,
    c2: Compaction,
    d: Direction,
    p: ConnectedSide,
  ): Edge {
    const csoh = c2.getSlackOptimisation(Dimension.H);
    const csov = c2.getSlackOptimisation(Dimension.V);

    const rssh = this.checkCreateElement(l, Dimension.H, csoh, null, null);
    const rssv = this.checkCreateElement(l, Dimension.V, csov, null, null);

    const hc = start.getPerp();
    const vc = start.getAlong();
    const dest = p[0];

    // really simple merge for now
    const leftBuffer = this.getOrbitSlideable(dest, Side.START, csoh)!;
    const rightBuffer = this.getOrbitSlideable(dest, Side.END, csoh)!;
    const topBuffer = this.getOrbitSlideable(dest, Side.START, csov)!;
    const bottomBuffer = this.getOrbitSlideable(dest, Side.END, csov)!;

    let out: Edge;
    switch (d) {
      case Direction.RIGHT: {
        this.ensureDistance(dest, l, Dimension.V, csoh);
        this.ensureDistanceToBuffer(l, rightBuffer, Dimension.V, csoh);
        const upper = csov.mergeSlideables(vc, rssv.l)!;
        this.ensureAfter(hc, rssh.l, csoh);
        out = [upper, rssv.r];
        break;
      }
      case Direction.DOWN: {
        this.ensureDistance(dest, l, Dimension.H, csov);
        this.ensureDistanceToBuffer(l, bottomBuffer, Dimension.H, csov);
        const left = csoh.mergeSlideables(hc, rssh.l)!;
        this.ensureAfter(vc, rssv.l, csov);
        out = [left, rssh.r];
        break;
      }
      case Direction.LEFT: {
        this.ensureDistance(l, dest, Dimension.V, csoh);
        this.ensureDistanceFromBuffer(leftBuffer, l, Dimension.V, csoh);
        const upper = csov.mergeSlideables(vc, rssv.l)!;
        this.ensureAfter(rssh.r, hc, csoh);
        out = [upper, rssv.r];
        break;
      }
      case Direction.UP: {
        this.ensureDistance(l, dest, Dimension.H, csov);
        this.ensureDistanceFromBuffer(topBuffer, l, Dimension.H, csov);
        const left = csoh.mergeSlideables(hc, rssh.l)!;
        this.ensureAfter(rssv.r, vc, csov);
        out = [left, rssh.r];
        break;
      }
    }

    this.inside(l, dest, Dimension.H, csoh);
    this.inside(l, dest, Dimension.V, csov);
    return out;
  }

  private ensureAfter(a: S, b: S, so: SlackOptimisation): void {
    so.ensureMinimumDistance(a, b, 0);
  }

  /** Kotlin `ensureDistanceFromBuffer(bs: C2Slideable, to: Positioned, ...)`: `to` follows buffer `bs`. */
  private ensureDistanceFromBuffer(bs: S, to: Positioned, d: Dimension, so: SlackOptimisation): void {
    const rs = this.getRectangularSlideable(to, Side.START, so)!;
    so.ensureMinimumDistance(bs, rs, 0);
    for (const ls of bs.getForwardSlideables<S>(false)) {
      this.ensureMinimumDistanceBetweenRectangularSlideables(ls, rs, d, so);
    }
  }

  /** Kotlin `ensureDistanceFromBuffer(from: Positioned, bs: C2Slideable, ...)`: buffer `bs` follows `from`. */
  private ensureDistanceToBuffer(from: Positioned, bs: S, d: Dimension, so: SlackOptimisation): void {
    const ls = this.getRectangularSlideable(from, Side.END, so)!;
    so.ensureMinimumDistance(ls, bs, 0);
    for (const rs of bs.getForwardSlideables<S>(true)) {
      this.ensureMinimumDistanceBetweenRectangularSlideables(ls, rs, d, so);
    }
  }

  private ensureMinimumDistanceBetweenRectangularSlideables(
    from: S,
    to: S,
    d: Dimension,
    so: SlackOptimisation,
  ): void {
    let dist = 0;
    const fromAnchors = from.getRectAnchors();
    const toAnchors = to.getRectAnchors();
    if (fromAnchors.length > 0) {
      dist = Math.max(
        ...fromAnchors.map((fa) =>
          toAnchors.length > 0
            ? Math.max(
                ...toAnchors.map((ta) =>
                  Math.trunc(this.getMinimumDistanceBetween(fa.e, fa.s, ta.e, ta.s, d, null, true)),
                ),
              )
            : 0,
        ),
      );
    }

    so.ensureMinimumDistance(from, to, dist);
  }

  private ensureDistance(from: Positioned, to: Positioned, d: Dimension, so: SlackOptimisation): void {
    const ld = Math.trunc(this.getMinimumDistanceBetween(from, Side.END, to, Side.START, d, null, true));
    const fromSS = so.getSlideablesFor(from)!;
    const toSS = so.getSlideablesFor(to)!;
    so.ensureMinimumDistance(fromSS.r, toSS.l, ld);
  }

  private getOrbitSlideable(de: Positioned, side: Side, so: SlackOptimisation): S | null {
    for (const os of so.getAllSlideables()) {
      if (os.getOrbitAnchors().some((it) => it.e === de && it.s === side)) return os;
    }
    return null;
  }

  private getRectangularSlideable(de: Positioned, side: Side, so: SlackOptimisation): S | null {
    for (const os of so.getAllSlideables()) {
      if (os.getRectAnchors().some((it) => it.e === de && it.s === side)) return os;
    }
    return null;
  }

  private inside(innerDe: Label, outerDe: Connected, d: Dimension, so: SlackOptimisation): void {
    const bl = this.getOrbitSlideable(outerDe, Side.START, so)!;
    const br = this.getOrbitSlideable(outerDe, Side.END, so)!;

    const inner = so.getSlideablesFor(innerDe)!;

    if (inner.l !== bl) {
      this.ensureDistanceFromBuffer(bl, innerDe, d, so);
    }

    if (inner.r !== br) {
      this.ensureDistanceToBuffer(innerDe, br, d, so);
    }
  }
}
