import { Dimension, Direction, getDimensionForDirection } from "@kite9/model";
import type {
  ConnectedRectangular,
  DiagramElement,
  PlacementPositioned,
  Positioned,
} from "@kite9/model";
import { isRectangular } from "../../common/elements/TypeGuards.js";
import { LogicException } from "../../logging/LogicException.js";
import {
  isCompoundGroup,
  isLeafGroup,
  type Group,
} from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { LeafGroup } from "../../planarization/rhd/grouping/basic/group/LeafGroup.js";
import { KeyedMap, objectId } from "../CollectionUtils.js";
import type { Compaction } from "../Compaction.js";
import { CompactionSlideable } from "../CompactionSlideable.js";
import type { RoutableSlideableSet } from "../sets/RoutableSlideableSet.js";
import { RoutableSlideableSetImpl } from "../sets/RoutableSlideableSetImpl.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";
import { isPlacementPositioned, type Quad } from "./AbstractBuilderCompactionStep.js";
import { AbstractContainerCompactionStep, type RoutablePair } from "./AbstractContainerCompactionStep.js";

type S = CompactionSlideable;
type Range = readonly [number, number];
/** Kotlin `Pair<Pair<Double, Double>, Pair<Double, Double>>`: an (x-range, y-range) cell. */
type Space = readonly [Range, Range];

const spaceKey = (s: Space): string => `${s[0][0]},${s[0][1]}|${s[1][0]},${s[1][1]}`;

/** Kotlin `List<Double>.sorted().windowed(2, 1)`. */
function adjacentPairs(values: Iterable<number>): Range[] {
  const sorted = [...values].sort((a, b) => a - b);
  const out: Range[] = [];
  for (let i = 0; i + 1 < sorted.length; i++) {
    out.push([sorted[i]!, sorted[i + 1]!]);
  }
  return out;
}

function mergeAll(so: SlackOptimisation, items: readonly (S | null)[]): S | null {
  if (items.length === 0) return null;
  let acc: S | null = items[0] ?? null;
  for (let i = 1; i < items.length; i++) {
    acc = so.mergeSlideables(acc, items[i]);
  }
  return acc;
}

export class HierarchicalCompactionStep extends AbstractContainerCompactionStep {
  first = true;
  leafGroupElements: ReadonlySet<DiagramElement> = new Set();

  compact(c: Compaction, g: Group): void {
    if (!this.first) {
      return;
    }

    this.first = true;

    const distinctKey = (g: Group): string => {
      if (isCompoundGroup(g)) {
        return `C|${g.groupNumber}`;
      } else if (isLeafGroup(g) && g.connected != null) {
        return `E|${objectId(g.connected)}|1`;
      } else {
        return `E|${objectId((g as LeafGroup).container)}|2`;
      }
    };

    const seen = new Set<string>();
    const allGroups = this.collectGroups(g).filter((it) => {
      const k = distinctKey(it);
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const leafGroups = allGroups.filter(isLeafGroup);

    this.leafGroupElements = new Set(leafGroups.map((it) => it.connected));

    const leafGroupMap = new Map<LeafGroup, RoutablePair>(
      leafGroups.map((it) => [it, this.processLeafGroup(it, c, g)]),
    );
    const wrappedLeafGroupMap = this.wrapContainersIntoGroups(c, leafGroupMap, g);

    const left = this.alignLeafGroups(wrappedLeafGroupMap, Direction.LEFT);
    const right = this.alignLeafGroups(wrappedLeafGroupMap, Direction.RIGHT);
    const up = this.alignLeafGroups(wrappedLeafGroupMap, Direction.UP);
    const down = this.alignLeafGroups(wrappedLeafGroupMap, Direction.DOWN);

    const hso = c.getSlackOptimisation(Dimension.H);
    const vso = c.getSlackOptimisation(Dimension.V);

    const left2 = this.mergeSide(left, Side.START, hso);
    const right2 = this.mergeSide(right, Side.END, hso);
    const up2 = this.mergeSide(up, Side.START, vso);
    const down2 = this.mergeSide(down, Side.END, vso);

    const hOrbits = this.joinSides(right2, left2, hso, Dimension.H);
    const vOrbits = this.joinSides(down2, up2, vso, Dimension.V);
    this.createEmptySpaceIntersections(
      c,
      new Set([...left.keys(), ...right.keys()]),
      new Set([...up.keys(), ...down.keys()]),
      wrappedLeafGroupMap,
      hOrbits,
      vOrbits,
    );

    // stitch together orbits from next-to containers in a grid
    this.handleGridNeighbours(c);
  }

  private createEmptySpaceIntersections(
    c: Compaction,
    hp: ReadonlySet<number>,
    vp: ReadonlySet<number>,
    lg: ReadonlyMap<LeafGroup, RoutablePair>,
    hOrbits: ReadonlyMap<number, S>,
    vOrbits: ReadonlyMap<number, S>,
  ): KeyedMap<Space, RoutablePair> {
    const hIntersects = new Map<number, S>();
    const vIntersects = new Map<number, S>();

    const createOrReuseIntersect = (at: number, d: Dimension): S => {
      const m = d === Dimension.H ? hIntersects : vIntersects;
      let s = m.get(at);
      if (s == null) {
        s = new CompactionSlideable(c.getSlackOptimisation(d), d);
        m.set(at, s);
      }
      return s;
    };

    const overlaps = (a: Range, b: Range): boolean => a[0] < b[1] && b[0] < a[1];

    const isOccupied = (e: Space): boolean => {
      for (const it of lg.keys()) {
        const l = this.getEdgePosition(it, Direction.LEFT);
        const r = this.getEdgePosition(it, Direction.RIGHT);
        const u = this.getEdgePosition(it, Direction.UP);
        const d = this.getEdgePosition(it, Direction.DOWN);

        if (l != null && r != null && u != null && d != null) {
          if (overlaps(e[0], [l, r]) && overlaps(e[1], [u, d])) {
            return true;
          }
        }
      }
      return false;
    };

    const hpPairs = adjacentPairs(hp);
    const vpPairs = adjacentPairs(vp);
    const allPossibleSpaces: Space[] = hpPairs.flatMap((h) => vpPairs.map((v): Space => [h, v]));

    const intersections = new KeyedMap<Space, RoutablePair>(spaceKey);
    const hso = c.getSlackOptimisation(Dimension.H);
    const vso = c.getSlackOptimisation(Dimension.V);
    for (const s of allPossibleSpaces.filter((it) => !isOccupied(it))) {
      const hbl = hOrbits.get(s[0][0])!;
      const hbr = hOrbits.get(s[0][1])!;
      const vbl = vOrbits.get(s[1][0])!;
      const vbr = vOrbits.get(s[1][1])!;
      const hmid = (s[0][0] + s[0][1]) / 2;
      const vmid = (s[1][0] + s[1][1]) / 2;
      const hc = createOrReuseIntersect(hmid, Dimension.H);
      const vc = createOrReuseIntersect(vmid, Dimension.V);
      const hrss = new RoutableSlideableSetImpl(hc, hbl, hbr);
      const vrss = new RoutableSlideableSetImpl(vc, vbl, vbr);
      hso.add(hrss);
      vso.add(vrss);
      hso.ensureMinimumDistance(hbl, hc, 1); //FIXME
      hso.ensureMinimumDistance(hc, hbr, 1); //FIXME
      vso.ensureMinimumDistance(vbl, vc, 1); //FIXME
      vso.ensureMinimumDistance(vc, vbr, 1); //FIXME
      this.createRoutableNeighbours(c, hrss, vrss, null, null);
      intersections.set(s, [hrss, vrss]);
    }
    return intersections;
  }

  private handleGridNeighbours(c: Compaction): void {
    for (const it of [...this.gridOrbitSlideables.keys()]) {
      const counterpart: Quad =
        it.s === Side.START
          ? { c: it.c, i: it.i - 1, d: it.d, s: Side.END }
          : { c: it.c, i: it.i + 1, d: it.d, s: Side.START };
      const slideableA = CompactionSlideable.getNonDoneVersion(
        this.gridOrbitSlideables.get(counterpart),
      );
      const slideableB = CompactionSlideable.getNonDoneVersion(this.gridOrbitSlideables.get(it));
      c.copyNeighbourMap(slideableB, slideableA);
      c.copyNeighbourMap(slideableA, slideableB);
    }
  }

  mergeSide(
    leaves: ReadonlyMap<number, ReadonlySet<RoutableSlideableSet>>,
    s: Side,
    so: SlackOptimisation,
  ): Map<number, S | null> {
    const ensureOrbitSlideableSet = (
      rs: RoutableSlideableSet,
      side: Side,
    ): RoutableSlideableSet => {
      const slideable = side === Side.START ? rs.bl : rs.br;

      if (slideable == null) {
        return rs;
      }

      const slideableToCheck = slideable.getNotDoneVersion();
      if (slideableToCheck.getRectAnchors().length > 0) {
        // ok, get the previous version and test again
        const previous = rs.previous;
        if (previous == null) {
          throw new LogicException("Should be a wrapper slideable set");
        } else {
          return ensureOrbitSlideableSet(previous, side);
        }
      } else {
        return rs;
      }
    };

    const mergeSlideablesInMap = (
      l2: ReadonlyMap<number, ReadonlySet<RoutableSlideableSet>>,
    ): Map<number, S | null> => {
      const out = new Map<number, S | null>();
      for (const [k, r] of l2) {
        const items = [...r].map((it) =>
          CompactionSlideable.getNonDoneVersion(s === Side.START ? it.bl : it.br),
        );
        out.set(k, mergeAll(so, items));
      }
      return out;
    };

    const orbitLeaves = new Map<number, ReadonlySet<RoutableSlideableSet>>();
    for (const [k, r] of leaves) {
      orbitLeaves.set(k, new Set([...r].map((it) => ensureOrbitSlideableSet(it, s))));
    }
    const rectLeaves = new Map<number, ReadonlySet<RoutableSlideableSet>>();
    for (const [k, v] of leaves) {
      const orbits = orbitLeaves.get(k) ?? new Set();
      rectLeaves.set(k, new Set([...v].filter((it) => !orbits.has(it))));
    }

    const mergedOrbitLeaves = mergeSlideablesInMap(orbitLeaves);
    const mergedRectLeaves = mergeSlideablesInMap(rectLeaves);

    // which to return?  Choose rect if it's available as it will be the grid around the orbit.
    const combinedLeaves = new Map<number, S | null>();
    for (const [k, v] of mergedOrbitLeaves) {
      combinedLeaves.set(k, mergedRectLeaves.get(k) ?? v);
    }

    return combinedLeaves;
  }

  joinSides(
    start: ReadonlyMap<number, S | null>,
    end: ReadonlyMap<number, S | null>,
    so: SlackOptimisation,
    d: Dimension,
  ): Map<number, S> {
    const out = new Map<number, S>();
    const allKeys = new Set([...start.keys(), ...end.keys()]);
    for (const k of allKeys) {
      const startS = start.get(k) ?? null;
      const endS = end.get(k) ?? null;

      if (startS != null && endS != null) {
        const startR = [...startS.getOrbitingElements()];
        const endR = [...endS.getOrbitingElements()];

        const joined = so.mergeSlideables(startS, endS);
        out.set(k, joined!);

        // ensure Separation of rectangulars
        let distance = 2.0;
        if (startR.length > 0 && endR.length > 0) {
          distance = Math.max(
            ...startR.map((ae) =>
              Math.max(
                ...endR.map((be) =>
                  this.getMinimumDistanceBetween(ae, Side.END, be, Side.START, d, null, true),
                ),
              ),
            ),
          );
        }

        const startRects = startR
          .map((it) => so.getSlideablesFor(it as Positioned)?.r)
          .filter((it): it is S => it != null);

        const endRects = endR
          .map((it) => so.getSlideablesFor(it as Positioned)?.l)
          .filter((it): it is S => it != null);

        for (const aS of startRects) {
          for (const bS of endRects) {
            so.ensureMinimumDistance(aS, bS, Math.ceil(distance));
          }
        }
      } else if (startS != null) {
        out.set(k, startS);
      } else if (endS != null) {
        out.set(k, endS);
      }
    }

    return out;
  }

  alignLeafGroups(
    contents: ReadonlyMap<LeafGroup, RoutablePair>,
    d: Direction,
  ): Map<number, Set<RoutableSlideableSet>> {
    const horizontal = getDimensionForDirection(d) === Dimension.H;
    const out = new Map<number, Set<RoutableSlideableSet>>();
    for (const [k, v] of contents) {
      const key = this.getEdgePosition(k, d);
      if (key == null) continue;
      let set = out.get(key);
      if (set == null) {
        set = new Set();
        out.set(key, set);
      }
      const value = horizontal ? v[0] : v[1];
      if (value != null) set.add(value);
    }
    return out;
  }

  processLeafGroup(g: LeafGroup, c: Compaction, topGroup: Group): RoutablePair {
    const e = g.connected;
    if (isRectangular(e)) {
      const hso = c.getSlackOptimisation(Dimension.H);
      const vso = c.getSlackOptimisation(Dimension.V);
      const hr = this.checkCreateElement(e, Dimension.H, hso, null, topGroup);
      const vr = this.checkCreateElement(e, Dimension.V, vso, null, topGroup);

      const hss = hr.wrapInRoutable();
      const vss = vr.wrapInRoutable();

      hso.add(hss);
      vso.add(vss);

      this.createRoutableNeighbours(c, hss, vss, hr, vr);

      if (hss != null && vss != null) {
        hso.contains(hss, hr);
        vso.contains(vss, vr);
      }

      return [hss, vss];
    } else if (isPlacementPositioned(e)) {
      // leaf node is a port
      const pp: PlacementPositioned = e;
      const f = g.container;

      const vso = c.getSlackOptimisation(Dimension.V);
      const pvi = this.checkCreateIntersectionOnly(vso, g, f, Dimension.V);
      const vr = this.checkCreateElement(f, Dimension.V, vso, null, topGroup);
      this.ensureCentreSlideablePosition(vso, vr, pvi.c, pp.getContainerPosition(Dimension.V));

      const hso = c.getSlackOptimisation(Dimension.H);
      const phi = this.checkCreateIntersectionOnly(hso, g, f, Dimension.H);
      const hr = this.checkCreateElement(f, Dimension.H, hso, null, topGroup);
      this.ensureCentreSlideablePosition(hso, hr, phi.c, pp.getContainerPosition(Dimension.H));

      this.createRoutableNeighbours(c, phi, pvi, hr, vr);

      return [phi, pvi];
    } else {
      throw new LogicException("Can't process this element type");
    }
  }

  private collectGroups(g: Group): Group[] {
    if (isCompoundGroup(g)) {
      return [g, ...this.collectGroups(g.a), ...this.collectGroups(g.b)];
    } else {
      return [g];
    }
  }

  /**
   * Either content are laid out using the Group process, or they aren't connected, so we need
   * to just follow layout.
   */
  usingGroups(contents: readonly ConnectedRectangular[], _topGroup: Group | null): boolean {
    return contents.length > 0 && contents.every((it) => this.hasGroup(it));
  }

  private hasGroup(item: DiagramElement): boolean {
    if (this.leafGroupElements.has(item)) {
      return true;
    }

    if (isRectangular(item)) {
      if (item.getContents().some((it) => this.hasGroup(it))) {
        return true;
      }
    }

    return false;
  }

  get prefix(): string {
    return "HIER";
  }
}
