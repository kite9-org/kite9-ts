import { Dimension, Direction, Layout } from "@kite9/model";
import type { DiagramElement, Rectangular, SizedRectangular } from "@kite9/model";
import type { GridPositioner } from "../../common/elements/grid/GridPositioner.js";
import type { RoutingInfo } from "../../common/elements/RoutingInfo.js";
import { isRectangular } from "../../common/elements/TypeGuards.js";
import { LogicException } from "../../logging/LogicException.js";
import { ConnectedGroupLinkNode } from "../../planarization/rhd/grouping/ConnectedGroupLinkNode.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { LeafGroup } from "../../planarization/rhd/grouping/basic/group/LeafGroup.js";
import type { PositionRoutableHandler2D } from "../../planarization/rhd/position/PositionRoutableHandler2D.js";
import type { PositionRoutingInfo } from "../../planarization/rhd/position/PositionRoutingInfo.js";
import type { ElementSizer } from "../../sizer.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RoutableSlideableSet } from "../sets/RoutableSlideableSet.js";
import { Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";
import { AbstractBuilderCompactionStep, type Quad } from "./AbstractBuilderCompactionStep.js";

/** Horizontal and vertical routable sets for a leaf group (Kotlin `Pair<RSS?, RSS?>`). */
export type RoutablePair = readonly [RoutableSlideableSet | null, RoutableSlideableSet | null];

function isSizedRectangular(r: Rectangular): r is SizedRectangular {
  return typeof (r as Partial<SizedRectangular>).getPadding === "function";
}

/**
 * This makes sure that any time we have all the groups to complete a container, we wrap the groups in the
 * container(s) and use that instead.
 */
export abstract class AbstractContainerCompactionStep extends AbstractBuilderCompactionStep {
  constructor(
    cd: ElementSizer,
    readonly rr: PositionRoutableHandler2D,
    gp: GridPositioner,
  ) {
    super(cd, gp);
  }

  getEdgePosition(k: LeafGroup, d: Direction): number | null {
    const p = this.rr.getPlacedPosition(k) as PositionRoutingInfo | null;
    if (p == null) {
      return null;
    }
    switch (d) {
      case Direction.UP:
        return p.getMinY();
      case Direction.DOWN:
        return p.getMaxY();
      case Direction.LEFT:
        return p.getMinX();
      case Direction.RIGHT:
        return p.getMaxX();
    }
  }

  findClosestToEdge(
    _c: Rectangular,
    d: Direction,
    allLeafGroups: ReadonlySet<LeafGroup>,
  ): Set<LeafGroup> {
    const positions: [LeafGroup, number][] = [];
    for (const e of allLeafGroups) {
      const v = this.getEdgePosition(e, d);
      if (v != null) positions.push([e, v]);
    }

    if (positions.length > 0) {
      const positionNumbers = positions.map(([, v]) => v);
      const maxPosition = Math.max(...positionNumbers);
      const minPosition = Math.min(...positionNumbers);

      const relevant = positions.filter(([, v]) => {
        switch (d) {
          case Direction.UP:
          case Direction.LEFT:
            return v === minPosition;
          case Direction.RIGHT:
          case Direction.DOWN:
            return v === maxPosition;
        }
      });

      return new Set(relevant.map(([k]) => k));
    } else {
      return new Set();
    }
  }

  private getContainerPadding(c: Rectangular, s: Side, d: Dimension): number {
    let dir: Direction;
    if (s === Side.START) {
      dir = d === Dimension.H ? Direction.LEFT : Direction.UP;
    } else {
      dir = d === Dimension.H ? Direction.RIGHT : Direction.DOWN;
    }

    return isSizedRectangular(c) ? Math.ceil(c.getPadding(dir) / 2.0) : 1;
  }

  applyContainerEdge(
    so: SlackOptimisation,
    c: Rectangular,
    to: ReadonlySet<LeafGroup>,
    s: Side,
    map: Map<LeafGroup, RoutablePair>,
    dimension: Dimension,
    topGroup: Group,
  ): void {
    this.log.send(`Applying container edge ${c.getID()} ${s} to`, to);

    // slideable we are wrapping with
    const outer = this.checkCreateElement(c, dimension, so, null, topGroup);
    const isGridCell = c.getContainer()?.getLayout() === Layout.GRID;
    const useOrbit = !isGridCell;

    // inner orbits we can merge together
    const allMergableRoutables = new Set<CompactionSlideable>();

    // should contain only the orbit of outer, or outer side itself if a grid
    const allAddedSlideables = new Set<CompactionSlideable>();

    // set if we're adding sides to an empty grid square
    let hub: ConnectedGroupLinkNode | null = null;

    for (const lg of to) {
      if (lg.connected instanceof ConnectedGroupLinkNode && lg.connected.gridPosition != null) {
        hub = lg.connected;
      }
      const routables = map.get(lg)!;
      const theRSS = dimension === Dimension.H ? routables[0] : routables[1];
      const altRSS = dimension === Dimension.V ? routables[0] : routables[1];
      if (theRSS != null) {
        const padding = this.getContainerPadding(c, s, dimension) + 5; // TODO: FIxme
        const newRSS = so.addSide(outer, theRSS, s, useOrbit, padding);
        if (s === Side.START) {
          const bl = theRSS.bl?.getNotDoneVersion() ?? null;
          if (bl != null && bl !== outer.l) {
            so.ensureMinimumDistance(outer.l.getNotDoneVersion(), bl, padding);
          }
          if (bl != null) {
            allMergableRoutables.add(bl);
          }
          allAddedSlideables.add(newRSS.bl!);
          // for port intersection
          so.compaction.addNeighbour(altRSS?.c, outer.l, newRSS.bl);
        } else {
          const br = theRSS.br?.getNotDoneVersion() ?? null;
          if (br != null && br !== outer.r) {
            so.ensureMinimumDistance(br, outer.r, padding);
          }
          if (br != null) {
            allMergableRoutables.add(br);
          }
          allAddedSlideables.add(newRSS.br!);
          // for port intersection
          so.compaction.addNeighbour(altRSS?.c, outer.r, newRSS.br);
        }

        if (dimension === Dimension.H) {
          map.set(lg, [newRSS, routables[1]]);
        } else {
          map.set(lg, [routables[0], newRSS]);
        }
      }
    }

    let done: CompactionSlideable | null = null;
    for (const it of allMergableRoutables) {
      done = done == null ? it : so.mergeSlideables(done, it)!;
    }

    const container = c.getContainer();
    if (container?.getLayout() === Layout.GRID) {
      // this handles merging in the temporary hub elements of a grid
      if (hub == null) {
        throw new LogicException("grid cell without hub");
      }

      const i = dimension === Dimension.H ? hub.gridPosition?.[0] : hub.gridPosition?.[1];
      const q: Quad = { c: container, i: i!, d: dimension, s };
      const existing = this.gridOrbitSlideables.get(q);

      if (existing != null) {
        this.gridOrbitSlideables.set(q, so.mergeSlideables(existing, done)!);
        this.ensureNoOldGridOrbitSlideables();
      } else {
        // we need to create a slideable
        throw new LogicException("was expecting orbit slideable for grid element");
      }
    }

    if (allAddedSlideables.size !== 1) {
      throw new LogicException("Should be one added slideable for a container");
    }
  }

  private completeContainers(
    c: Rectangular,
    co: Compaction,
    map: Map<LeafGroup, RoutablePair>,
    topGroup: Group,
    elementMapping: Map<DiagramElement, ReadonlySet<LeafGroup>>,
  ): void {
    this.log.send(`Completing ${c}`);
    const pp = this.rr.getPlacedPosition(c);
    if (pp == null) {
      for (const it of c.getContents()) {
        if (isRectangular(it)) this.completeContainers(it, co, map, topGroup, elementMapping);
      }

      const allLeafGroups = new Set<LeafGroup>();
      for (const it of c.getContents()) {
        for (const lg of elementMapping.get(it) ?? []) allLeafGroups.add(lg);
      }

      elementMapping.set(c, allLeafGroups);

      const leftMost = this.findClosestToEdge(c, Direction.LEFT, allLeafGroups);
      const rightMost = this.findClosestToEdge(c, Direction.RIGHT, allLeafGroups);
      const topMost = this.findClosestToEdge(c, Direction.UP, allLeafGroups);
      const bottomMost = this.findClosestToEdge(c, Direction.DOWN, allLeafGroups);

      if (leftMost.size > 0 && topMost.size > 0) {
        const sox = co.getSlackOptimisation(Dimension.H);
        const soy = co.getSlackOptimisation(Dimension.V);

        this.applyContainerEdge(sox, c, leftMost, Side.START, map, Dimension.H, topGroup);
        this.applyContainerEdge(sox, c, rightMost, Side.END, map, Dimension.H, topGroup);
        this.applyContainerEdge(soy, c, topMost, Side.START, map, Dimension.V, topGroup);
        this.applyContainerEdge(soy, c, bottomMost, Side.END, map, Dimension.V, topGroup);

        let containerBounds: RoutingInfo | null = null;
        let first = true;
        for (const it of c.getContents()) {
          const p = this.rr.getPlacedPosition(it);
          if (first) {
            containerBounds = p;
            first = false;
          } else if (containerBounds != null && p != null) {
            containerBounds = this.rr.increaseBounds(containerBounds, p);
          } else {
            containerBounds = containerBounds ?? p;
          }
        }

        this.rr.setPlacedPosition(c, containerBounds!);

        const cx = sox.getSlideablesFor(c);
        const cy = soy.getSlideablesFor(c);
        if (cx != null && cy != null) {
          const sx = sox.getContainers(cx);
          const sy = soy.getContainers(cy);

          if (sx.size > 0 && sy.size > 0) {
            const x1 = sx.values().next().value!;
            const y1 = sy.values().next().value!;
            this.createRoutableNeighbours(co, x1, y1, cx, cy);
          }
        }
      }
    }
  }

  private ensurePositionsOfElements(mapping: Map<DiagramElement, ReadonlySet<LeafGroup>>): void {
    for (const [k, v] of mapping) {
      const pos = this.rr.getPlacedPosition(v.values().next().value);
      this.rr.setPlacedPosition(k, pos!);
    }
  }

  wrapContainersIntoGroups(
    c2: Compaction,
    map: ReadonlyMap<LeafGroup, RoutablePair>,
    topGroup: Group,
  ): Map<LeafGroup, RoutablePair> {
    const elementMapping = this.relevantElements(map.keys());
    this.ensurePositionsOfElements(elementMapping);
    const mutableMap = new Map(map);
    this.completeContainers(c2.getDiagram(), c2, mutableMap, topGroup, elementMapping);
    return mutableMap;
  }

  private relevantElements(
    all: Iterable<LeafGroup>,
  ): Map<DiagramElement, ReadonlySet<LeafGroup>> {
    const out = new Map<DiagramElement, ReadonlySet<LeafGroup>>();
    for (const it of all) {
      out.set(it.connected, new Set([it]));
    }
    return out;
  }
}
