import {
  Dimension,
  Direction,
  reverseDirection,
  rotateAntiClockwise,
  rotateClockwise,
} from "@kite9/model";
import type {
  Connected,
  ConnectedRectangular,
  Connection,
  DiagramElement,
  Port,
  Rectangular,
} from "@kite9/model";
import { NoFurtherPathException } from "../../common/algorithms/ssp/NoFurtherPathException.js";
import {
  isConnectedRectangular,
  isConnection,
  isPort,
} from "../../common/elements/TypeGuards.js";
import { LogicException } from "../../logging/LogicException.js";
import { isCompoundGroup, type Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { RankBasedConnectionQueue } from "../../planarization/rhd/links/RankBasedConnectionQueue.js";
import { PositionRoutableHandler2D } from "../../planarization/rhd/position/PositionRoutableHandler2D.js";
import { AnchorType, ConnAnchor } from "../anchors/ConnAnchor.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionImpl } from "../CompactionImpl.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import { AbstractBuilderCompactionStep } from "../hierarchy/AbstractBuilderCompactionStep.js";
import { NeighbourCheckingStep } from "../hierarchy/NeighbourCheckingStep.js";
import { Side } from "../Side.js";
import { Route } from "./Route.js";
import { RoutePoint } from "./RoutePoint.js";
import { SlideableSSP } from "./SlideableSSP.js";

type S = CompactionSlideable;

/** Kotlin `Set<C2Point>`: de-duplicates on `RoutePoint.equals`. */
function pointSet(points: Iterable<RoutePoint>): Set<RoutePoint> {
  const out: RoutePoint[] = [];
  for (const p of points) {
    if (!out.some((x) => x.equals(p))) out.push(p);
  }
  return new Set(out);
}

export class ConnectionRouterCompactionStep extends AbstractBuilderCompactionStep {
  get prefix(): string {
    return "C2CR";
  }

  private createPoints(
    c2: Compaction,
    d: Connected,
    arriving: boolean,
    drawDirection: Direction | null,
  ): Set<RoutePoint> {
    if (isConnectedRectangular(d)) {
      return this.createPointsOnRectangular(c2, d, arriving, drawDirection);
    } else if (isPort(d)) {
      return this.createPointsOnPort(c2, d, arriving);
    } else {
      throw new LogicException(`Unknown connected type ${d}`);
    }
  }

  private createPointsOnPort(c2: Compaction, p: Port, arriving: boolean): Set<RoutePoint> {
    const parent = p.getParent() as Rectangular;
    const h = c2.getSlackOptimisation(Dimension.H);
    const v = c2.getSlackOptimisation(Dimension.V);
    const parenthss = h.getSlideablesFor(parent)!;
    const parentvss = v.getSlideablesFor(parent)!;
    const porthss = h.getPPSlideablesFor(p);
    const portvss = v.getPPSlideablesFor(p);
    const d = p.getPortDirection();
    const facing = arriving ? reverseDirection(d)! : d;
    let out: RoutePoint;
    switch (d) {
      case Direction.RIGHT:
        out = new RoutePoint(portvss!.c!, parenthss.r, facing);
        break;
      case Direction.LEFT:
        out = new RoutePoint(portvss!.c!, parenthss.l, facing);
        break;
      case Direction.UP:
        out = new RoutePoint(porthss!.c!, parentvss.l, facing);
        break;
      case Direction.DOWN:
        out = new RoutePoint(porthss!.c!, parentvss.r, facing);
        break;
      default:
        throw new LogicException("Can't proceed");
    }

    return new Set([out]);
  }

  private createPointsOnRectangular(
    c2: Compaction,
    d: ConnectedRectangular,
    arriving: boolean,
    drawDirection: Direction | null,
  ): Set<RoutePoint> {
    const h = c2.getSlackOptimisation(Dimension.H);
    const v = c2.getSlackOptimisation(Dimension.V);
    const hss = h.getSlideablesFor(d)!;
    const vss = v.getSlideablesFor(d)!;

    const pointsOn = (
      side: Direction,
      edge: S,
      arrivingDir: Direction,
      leavingDir: Direction,
    ): RoutePoint[] =>
      this.allowed(arriving, drawDirection, side)
        ? [...c2.getLocationsOn(edge)]
            .filter((it) => it.getIntersectingElements().has(d))
            .map((it) => new RoutePoint(it, edge, arriving ? arrivingDir : leavingDir))
        : [];

    const up = pointsOn(Direction.UP, vss.l, Direction.DOWN, Direction.UP);
    const down = pointsOn(Direction.DOWN, vss.r, Direction.UP, Direction.DOWN);
    const left = pointsOn(Direction.LEFT, hss.l, Direction.RIGHT, Direction.LEFT);
    const right = pointsOn(Direction.RIGHT, hss.r, Direction.LEFT, Direction.RIGHT);

    return pointSet([...up, ...down, ...left, ...right]);
  }

  private allowed(arriving: boolean, drawDirection: Direction | null, d: Direction): boolean {
    if (drawDirection == null) {
      return true;
    }
    const dd = arriving ? reverseDirection(drawDirection) : drawDirection;
    return dd === d;
  }

  getElementHierarchy(e: DiagramElement | null): Set<DiagramElement> {
    const out = new Set<DiagramElement>();
    for (let x = e; x != null; x = x.getParent()) out.add(x);
    return out;
  }

  private insertLink(c2: Compaction, c: Connection): Route | null {
    try {
      const d = c.getRenderingInformation().isContradicting ? null : c.getDrawDirection();
      const startingPoints = this.createPoints(c2, c.getFrom(), false, d);
      const endingPoints = this.createPoints(c2, c.getTo(), true, d);

      // we might be able to reduce the call frequency of this part - it's expensive.
      // but for now I can live with it until it works.
      c2.getSlackOptimisation(Dimension.H).updateSlideableOrdering();
      c2.getSlackOptimisation(Dimension.V).updateSlideableOrdering();

      const startRect = c.getFrom();
      const endRect = c.getTo();
      const startHier = this.getElementHierarchy(c.getFrom());
      const endHier = this.getElementHierarchy(c.getTo());
      const crossable = new Set<DiagramElement>();
      for (const x of startHier) if (!endHier.has(x)) crossable.add(x);
      for (const x of endHier) if (!startHier.has(x)) crossable.add(x);

      const doer = new SlideableSSP(
        c,
        startingPoints,
        endingPoints,
        crossable,
        startRect,
        endRect,
        d,
        c2,
        this.log,
      );

      this.log.send("Starting Points", startingPoints);
      this.log.send("Ending Points", endingPoints);

      this.log.send(`Routing: ${c} via`, doer.allowedToLeave);
      const out = doer.createShortestPath();

      this.log.send(`Found shortest path for ${c}: ${out}`);
      this.log.send("Using: ", out.getSlideables());
      this.log.send("Route", out.explainRoute());

      const replacements = new Map<S, S>();
      const out2 = this.simplifyShortestPath(out, c2, doer, replacements);
      const out3 = this.handleRouteReplacements(out2, replacements)!;

      if (out3.prev != null) {
        this.ensureSlackForConnection(out3.point, out3.prev, c, true);
      }

      if (replacements.size > 0) {
        // since we have re-ordered the diagram, re-check neighbour map
        NeighbourCheckingStep.joinOverlappingNeighbourGroups(c2 as CompactionImpl);
      }

      c2.checkConsistency();

      this.log.send("Horizontal Segments:", c2.getSlackOptimisation(Dimension.H).getAllSlideables());
      this.log.send("Vertical Segments:", c2.getSlackOptimisation(Dimension.V).getAllSlideables());

      return out3;
    } catch (e) {
      if (e instanceof NoFurtherPathException || e instanceof LogicException) {
        console.error(e);
        this.log.error(`Couldn't route: ${c}`);
        return null;
      }
      throw e;
    }
  }

  private handlePointReplacements(p: RoutePoint, replacements: ReadonlyMap<S, S>): RoutePoint {
    if (replacements.has(p.a) || replacements.has(p.b)) {
      const newA = replacements.get(p.a) ?? p.a;
      const newB = replacements.get(p.b) ?? p.b;
      return this.handlePointReplacements(new RoutePoint(newA, newB, p.d), replacements);
    } else {
      return p;
    }
  }

  private handleRouteReplacements(r: Route | null, replacements: ReadonlyMap<S, S>): Route | null {
    if (r != null) {
      return new Route(
        this.handleRouteReplacements(r.prev, replacements),
        r.coords,
        this.handlePointReplacements(r.point, replacements),
        r.cost,
        r.container,
      );
    } else {
      return null;
    }
  }

  /**
   * This looks for opportunities to merge slideables where there is a "dog-leg"
   * in the routing.
   */
  private simplifyShortestPath(
    r: Route,
    c2: Compaction,
    ssp: SlideableSSP,
    replacements: Map<S, S>,
  ): Route {
    const second = r.prev;
    const third = r.prev?.prev ?? null;

    if (third != null && third.point.d === r.point.d) {
      const s1 = third.point.getAlong();
      const s2 = r.point.getAlong();

      this.log.send(`Comparing: \n   ${s1}\n   ${s2}`);
      const minDist =
        s1.minimumPosition < s2.minimumPosition ? s1.minimumDistanceTo(s2) : s2.minimumDistanceTo(s1);
      if (minDist === 0) {
        // ok, these slideables can be merged then we can simplify the route
        const so = third.point.getAlong().so;
        const ns = so.mergeSlideables(s1, s2)!;
        this.updateReplacements(s1, s2, ns, replacements);

        // remove the second, rewrite the first
        const nsp = this.handleRouteReplacements(third, replacements)!;
        const newFirst = this.handlePointReplacements(r.point, replacements);
        return new Route(
          this.simplifyShortestPath(nsp, c2, ssp, replacements),
          r.coords,
          new RoutePoint(ns, newFirst.getPerp(), newFirst.d),
          r.cost,
          r.container,
        );
      }
    }

    return second != null
      ? new Route(
          this.simplifyShortestPath(second, c2, ssp, replacements),
          r.coords,
          r.point,
          r.cost,
          r.container,
        )
      : r;
  }

  private updateReplacements(s1: S, s2: S, ns: S, replacements: Map<S, S>): void {
    const replace = (old: S): void => {
      if (old !== ns) {
        replacements.set(old, ns);
        for (const [k, v] of replacements) {
          if (v === old) replacements.set(k, ns);
        }
      }
    };
    replace(s1);
    replace(s2);
  }

  private ensureSlackForConnection(
    start: RoutePoint,
    rest: Route,
    c: Connection,
    connectionStart: boolean,
  ): void {
    const end = rest.point;
    const d = start.d;
    const from = start.getPerp();
    const to = end.get(from.dimension);

    // handle connection minimum length
    const connectionEnd = rest.prev == null;
    let length: number;
    if (connectionStart && connectionEnd) {
      length = c.getFromDecoration().getReservedLength() + c.getToDecoration().getReservedLength();
    } else if (connectionStart) {
      length = c.getFromDecoration().getReservedLength();
    } else if (connectionEnd) {
      length = c.getToDecoration().getReservedLength();
    } else {
      length = c.getMinimumLength();
    }
    length += c.getMinimumLength();

    if (SlideableSSP.isIncreasing(start.d)) {
      from.so.ensureMinimumDistance(to, from, Math.ceil(length));
    } else {
      from.so.ensureMinimumDistance(from, to, Math.ceil(length));
    }

    // handle connection margins
    const margin = Math.max(
      c.getMargin(rotateAntiClockwise(d)),
      c.getMargin(rotateClockwise(d)),
    );

    const along = start.getAlong();
    for (const it of along.getForwardSlideables<S>(true)) {
      along.so.ensureMinimumDistance(along, it, Math.ceil(margin));
    }

    for (const it of along.getForwardSlideables<S>(false)) {
      along.so.ensureMinimumDistance(it, along, Math.ceil(margin));
    }

    // continue
    if (rest.prev != null) {
      this.ensureSlackForConnection(end, rest.prev, c, false);
    }
  }

  private buildQueue(g: Group, queue: RankBasedConnectionQueue): void {
    if (isCompoundGroup(g)) {
      this.buildQueue(g.a, queue);
      this.buildQueue(g.b, queue);
    }

    queue.handleLinks(g);
  }

  usingGroups(_contents: readonly ConnectedRectangular[], _topGroup: Group | null): boolean {
    return false;
  }

  compact(c: Compaction, g: Group): void {
    const queue = new RankBasedConnectionQueue(new PositionRoutableHandler2D());
    this.buildQueue(g, queue);

    for (const it of [...queue]) {
      if (isConnection(it)) {
        const route = this.insertLink(c, it);
        if (route != null) {
          this.writeRoute(it, route, 0, null);
        }
      }
    }

    this.log.send("Done");
  }

  private writeRoute(c: Connection, r: Route | null, i: number, comingFrom: Direction | null): void {
    if (r != null) {
      const p = r.point;
      const terminal = i === 0 || r.prev == null;
      const anchorType = terminal ? AnchorType.TERMINAL : AnchorType.REGULAR;
      let side: Side;
      if (terminal) {
        switch (p.d) {
          case Direction.LEFT:
          case Direction.UP:
            side = i === 0 ? Side.END : Side.START;
            break;
          case Direction.DOWN:
          case Direction.RIGHT:
            side = i === 0 ? Side.START : Side.END;
            break;
        }
      } else {
        side = Side.NEITHER;
      }

      const connectedEnd = terminal ? (i < 1 ? c.getTo() : c.getFrom()) : null;

      const ca = new ConnAnchor(c, i, anchorType, side, connectedEnd, comingFrom, reverseDirection(p.d));
      p.getAlong().addConnAnchor(ca);
      p.getPerp().addConnAnchor(ca);
      this.writeRoute(c, r.prev, i + 1, p.d);
    }
  }
}
