import {
  BorderTraversal,
  Dimension,
  Direction,
  Layout,
  PLACEMENT_NONE,
  getDimensionForDirection,
  getDirectionForAxis,
} from "@kite9/model";
import type {
  ConnectedRectangular,
  PlacementPositioned,
  Positioned,
  Rectangular,
} from "@kite9/model";
import type { GridPositioner } from "../../common/elements/grid/GridPositioner.js";
import { isAlignedRectangular, isConnectedRectangular, isPort, isRectangular } from "../../common/elements/TypeGuards.js";
import { LogicException } from "../../logging/LogicException.js";
import { ConnectedGroupLinkNode } from "../../planarization/rhd/grouping/ConnectedGroupLinkNode.js";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import type { LeafGroup } from "../../planarization/rhd/grouping/basic/group/LeafGroup.js";
import type { ElementSizer } from "../../sizer.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import { IntersectAnchor, Purpose } from "../anchors/IntersectAnchor.js";
import { OrbitAnchor } from "../anchors/OrbitAnchor.js";
import { Permeability, RectAnchor } from "../anchors/RectAnchor.js";
import { KeyedMap, objectId } from "../CollectionUtils.js";
import type { Compaction } from "../Compaction.js";
import { CompactionSlideable } from "../CompactionSlideable.js";
import type { RectangularSlideableSet } from "../sets/RectangularSlideableSet.js";
import { RectangularSlideableSetImpl } from "../sets/RectangularSlideableSetImpl.js";
import type { RoutableSlideableSet } from "../sets/RoutableSlideableSet.js";
import { RoutableSlideableSetImpl } from "../sets/RoutableSlideableSetImpl.js";
import { getSideForDirection, Side } from "../Side.js";
import type { SlackOptimisation } from "../SlackOptimisation.js";

/** Kotlin `AbstractC2BuilderCompactionStep.Quad` data class. */
export interface Quad {
  readonly c: Rectangular;
  readonly i: number;
  readonly d: Dimension;
  readonly s: Side;
}

/** Kotlin `Triple<Rectangular, Int, Dimension>`. */
export type GridKey = readonly [Rectangular, number, Dimension];

export const quadKey = (q: Quad): string => `${objectId(q.c)}|${q.i}|${q.d}|${q.s}`;
const gridKey = (k: GridKey): string => `${objectId(k[0])}|${k[1]}|${k[2]}`;

/**
 * Kotlin `is PlacementPositioned`: positioned elements (ports, grouping hubs) whose container
 * position is a `Placement`, as opposed to rectangulars.
 */
export function isPlacementPositioned(x: unknown): x is PlacementPositioned {
  return (
    !isRectangular(x) &&
    typeof (x as Partial<PlacementPositioned> | null)?.getContainerPosition === "function"
  );
}

export abstract class AbstractBuilderCompactionStep extends AbstractCompactionStep {
  readonly gridRectSlideables = new KeyedMap<GridKey, CompactionSlideable>(gridKey);
  readonly gridIntersectSlideables = new KeyedMap<GridKey, CompactionSlideable>(gridKey);
  readonly gridOrbitSlideables = new KeyedMap<Quad, CompactionSlideable>(quadKey);

  constructor(
    cd: ElementSizer,
    readonly gp: GridPositioner,
  ) {
    super(cd);
  }

  ensureNoOldGridOrbitSlideables(): void {
    for (const [k, v] of [...this.gridOrbitSlideables]) {
      if (v.isDone()) {
        this.gridOrbitSlideables.set(k, v.getNotDoneVersion());
      }
    }
  }

  /**
   * This is used to create a RectangularSlideableSet from a diagram element
   * where the element doesn't have a Group
   */
  protected checkCreateElement(
    de: Rectangular,
    d: Dimension,
    cso: SlackOptimisation,
    cExisting: CompactionSlideable | null,
    topGroup: Group | null,
  ): RectangularSlideableSet {
    const addToGridRectSlideables = (
      c: Rectangular,
      lineNumber: number,
      d: Dimension,
      s: Side,
      p: Permeability,
    ): CompactionSlideable => {
      const key: GridKey = [c, lineNumber, d];
      const existing = this.gridRectSlideables.get(key);
      if (existing == null) {
        const created = CompactionSlideable.forRectangular(cso, d, de, s, p);
        this.gridRectSlideables.set(key, created);
        return created;
      } else {
        // just add the anchor
        existing.addRectAnchor(new RectAnchor(de, s, p));
        return existing;
      }
    };

    let ss = cso.getSlideablesFor(de);

    if (ss == null) {
      const container = de.getContainer();
      const containerLayoutIsGrid = container?.getLayout() === Layout.GRID;
      const myLayoutIsGrid = de.getLayout() === Layout.GRID;
      this.log.send(`Creating ${de}`);

      // ensure we've laid out the grid if one is needed
      if (containerLayoutIsGrid) {
        this.gp.placeOnGrid(container!);
      } else if (myLayoutIsGrid) {
        this.gp.placeOnGrid(de);
      }

      // we need to create these then
      const ms = this.getMinimumDistanceBetween(de, Side.START, de, Side.END, d, null, false);
      const lp = this.getRectangularPermeability(de, d, Side.START);
      const rp = this.getRectangularPermeability(de, d, Side.END);

      let l: CompactionSlideable;
      if (myLayoutIsGrid) {
        l = addToGridRectSlideables(de, 0, d, Side.START, lp);
      } else if (containerLayoutIsGrid) {
        const place = this.gp.getPlaceOnGrid(de, d, Side.START);
        l = addToGridRectSlideables(container!, place, d, Side.START, lp);
      } else {
        l = CompactionSlideable.forRectangular(cso, d, de, Side.START, lp);
      }

      let r: CompactionSlideable;
      if (myLayoutIsGrid) {
        const place = this.gp.getMaxPlace(de, d);
        r = addToGridRectSlideables(de, place, d, Side.END, rp);
      } else if (containerLayoutIsGrid) {
        const place = this.gp.getPlaceOnGrid(de, d, Side.END);
        r = addToGridRectSlideables(container!, place, d, Side.END, rp);
      } else {
        r = CompactionSlideable.forRectangular(cso, d, de, Side.END, rp);
      }

      const created = new RectangularSlideableSetImpl(de, l, r);
      ss = created;

      const position = isAlignedRectangular(de) ? de.getConnectionAlignment(d) : PLACEMENT_NONE;

      this.ensureCentreSlideablePosition(cso, created, cExisting, position);
      cso.add(de, created);

      cso.ensureMinimumDistance(l, r, Math.trunc(ms));

      this.checkCreateElementContentItems(cso, de, d, de.getLayout(), created, topGroup);

      this.log.send(`Created RectangularSlideableSetImpl: ${created.e}`, created.getAll());
    }

    return ss;
  }

  protected checkCreateIntersectionOnly(
    cso: SlackOptimisation,
    g: LeafGroup,
    c: Rectangular,
    d: Dimension,
  ): RoutableSlideableSet {
    const connected = g.connected;

    const getGridPosition = (c: unknown): readonly [number, number] | null =>
      c instanceof ConnectedGroupLinkNode ? c.gridPosition : null;

    const createOrReuseOrbitSlideable = (
      gridMidpoint: readonly [number, number] | null,
      side: Side,
    ): CompactionSlideable | null => {
      if (gridMidpoint != null) {
        const gridContainer = c.getParent() as Rectangular;
        const idx = d === Dimension.H ? gridMidpoint[0] : gridMidpoint[1];
        const key: Quad = { c: gridContainer, i: idx, d, s: side };
        const existing = this.gridOrbitSlideables.get(key);
        if (existing != null) {
          existing.addOrbitAnchor(new OrbitAnchor(connected as Positioned, side));
          return existing;
        } else {
          const out = new CompactionSlideable(cso, d, [
            new OrbitAnchor(connected as Positioned, side),
          ]);
          this.gridOrbitSlideables.set(key, out);
          return out;
        }
      } else {
        // only grids need the internal orbit
        return null;
      }
    };

    const createOrReuseIntersectionSlideable = (
      gridMidpoint: readonly [number, number] | null,
      purpose: Purpose,
    ): CompactionSlideable => {
      if (gridMidpoint != null) {
        const gridContainer = c.getParent() as Rectangular;
        const idx = d === Dimension.H ? gridMidpoint[0] : gridMidpoint[1];
        const key: GridKey = [gridContainer, idx, d];
        const existing = this.gridIntersectSlideables.get(key);
        if (existing != null) {
          existing.addIntersectAnchor(new IntersectAnchor(connected, purpose));
          return existing;
        } else {
          const out = CompactionSlideable.forIntersection(cso, d, connected, purpose);
          this.gridIntersectSlideables.set(key, out);
          return out;
        }
      } else {
        return CompactionSlideable.forIntersection(cso, d, connected, purpose);
      }
    };

    const reuseContainerSlideable = (side: Direction, r: Rectangular): CompactionSlideable => {
      // we should use the edge of the container to intersect with the port
      // this returns something we already created
      const rss = this.checkCreateElement(r, d, cso, null, null);
      if (side === Direction.UP || side === Direction.LEFT) {
        return rss.l;
      } else {
        return rss.r;
      }
    };

    if (!isPlacementPositioned(connected)) {
      throw new LogicException("So what is it?");
    }

    const gridMidpoint = getGridPosition(connected);
    let ic: CompactionSlideable;
    if (!isPort(connected)) {
      ic = createOrReuseIntersectionSlideable(gridMidpoint, Purpose.CONTAINER_LAYOUT_MIDPOINT);
    } else {
      const port = connected;
      const dir = port.getPortDirection();
      if (getDimensionForDirection(dir) === d) {
        ic = reuseContainerSlideable(dir, port.getContainer()!);
        const side = getSideForDirection(dir);
        ic.addRectAnchor(new RectAnchor(port, side, Permeability.ALL));
      } else {
        ic = createOrReuseIntersectionSlideable(gridMidpoint, Purpose.PORT);
      }
    }
    const bl = createOrReuseOrbitSlideable(gridMidpoint, Side.START);
    const br = createOrReuseOrbitSlideable(gridMidpoint, Side.END);
    if (bl != null) {
      cso.ensureMinimumDistance(bl, ic, 5); // TODO: Fixme
    }
    if (br != null) {
      cso.ensureMinimumDistance(ic, br, 5);
    }
    const out = new RoutableSlideableSetImpl(ic, bl, br);
    cso.add(connected, out);

    this.log.send(`Created a RoutableSlideableSet for ${c}: `, out.getAll());
    return out;
  }

  /**
   * This works out whether we can route connections through this element (and in which direction).
   */
  getRectangularPermeability(de: Rectangular, d: Dimension, s: Side): Permeability {
    const increasing = s !== Side.START;
    const direction = getDirectionForAxis(d, increasing);
    switch (de.getTraversalRule(direction)) {
      case BorderTraversal.ALWAYS:
        return Permeability.ALL;
      case BorderTraversal.LEAVING:
        return increasing ? Permeability.INCREASING : Permeability.DECREASING;
      case BorderTraversal.PREVENT:
        return Permeability.NONE;
    }
  }

  private checkCreateElementContentItems(
    cso: SlackOptimisation,
    de: Rectangular,
    d: Dimension,
    l: Layout | null,
    container: RectangularSlideableSet,
    topGroup: Group | null,
  ): void {
    const contents = de.getContents().filter(isConnectedRectangular);

    const relyOnGroupLayout = this.usingGroups(contents, topGroup);
    const contentMap: [Rectangular, RectangularSlideableSet][] = contents.map((it) => [
      it,
      this.checkCreateElement(it, d, cso, null, topGroup),
    ]);

    if (l !== Layout.GRID) {
      // make sure contents are inside their containers.
      for (const [e, v] of contentMap) this.embed(d, container, v, cso, e);
    }

    // ensure internal ordering
    if (!relyOnGroupLayout) {
      switch (l) {
        case Layout.RIGHT:
        case Layout.HORIZONTAL:
        case null:
          if (d === Dimension.H) this.setupInternalOrdering(contentMap, d, cso);
          break;
        case Layout.LEFT:
          if (d === Dimension.H) this.setupInternalOrdering([...contentMap].reverse(), d, cso);
          break;
        case Layout.DOWN:
        case Layout.VERTICAL:
          if (d === Dimension.V) this.setupInternalOrdering(contentMap, d, cso);
          break;
        case Layout.UP:
          if (d === Dimension.V) this.setupInternalOrdering([...contentMap].reverse(), d, cso);
          break;
        case Layout.GRID:
          // handled by checkCreateElement
          break;
      }
    } else {
      this.log.send(`Using groups: ${de}`);
    }
  }

  abstract usingGroups(contents: readonly ConnectedRectangular[], topGroup: Group | null): boolean;

  createRoutableNeighbours(
    c: Compaction,
    hss: RoutableSlideableSet | null,
    vss: RoutableSlideableSet | null,
    hr: RectangularSlideableSet | null,
    vr: RectangularSlideableSet | null,
  ): void {
    if (vss != null && hss != null) {
      c.addNeighbour(hss.bl, vss.bl, vss.c);
      c.addNeighbour(hss.bl, vss.c, vss.br);

      c.addNeighbour(hss.br, vss.bl, vss.c);
      c.addNeighbour(hss.br, vss.c, vss.br);

      c.addNeighbour(vss.bl, hss.bl, hss.c);
      c.addNeighbour(vss.bl, hss.c, hss.br);

      c.addNeighbour(vss.br, hss.bl, hss.c);
      c.addNeighbour(vss.br, hss.c, hss.br);

      if (hr != null) {
        c.addNeighbour(vss.c, hss.bl, hr.l);
        c.addNeighbour(vss.c, hss.br, hr.r);
      } else {
        // add a route straight through
        c.addNeighbour(vss.c, hss.bl, hss.br);
      }

      if (vr != null) {
        c.addNeighbour(hss.c, vss.bl, vr.l);
        c.addNeighbour(hss.c, vss.br, vr.r);
      } else {
        // add a route straight through
        c.addNeighbour(hss.c, vss.bl, vss.br);
      }
    }
  }

  private setupInternalOrdering(
    orderedContents: readonly [Rectangular, RectangularSlideableSet][],
    d: Dimension,
    cso: SlackOptimisation,
  ): void {
    for (let i = 1; i < orderedContents.length; i++) {
      const prev = orderedContents[i - 1]!;
      const current = orderedContents[i]!;
      const dist = this.getMinimumDistanceBetween(
        prev[0],
        Side.END,
        current[0],
        Side.START,
        d,
        null,
        true,
      );
      this.separateRectangular(prev[1], Side.END, current[1], Side.START, cso, dist);
    }
  }
}
