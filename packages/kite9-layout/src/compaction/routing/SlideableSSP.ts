import {
  Dimension,
  Direction,
  isHorizontalDirection,
  isVerticalDirection,
  rotateAntiClockwise,
  rotateClockwise,
} from "@kite9/model";
import type { Connected, Connection, DiagramElement } from "@kite9/model";
import { AbstractSSP } from "../../common/algorithms/ssp/AbstractSSP.js";
import type { State } from "../../common/algorithms/ssp/State.js";
import { isDiagram } from "../../common/elements/TypeGuards.js";
import type { Kite9Log } from "../../logging/Kite9Log.js";
import type { RectAnchor } from "../anchors/RectAnchor.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import { isEntering } from "../Side.js";
import { Route } from "./Route.js";
import { CostFreeTurn, RouteCosting } from "./RouteCosting.js";
import { RouteCoords } from "./RouteCoords.js";
import { RoutePoint } from "./RoutePoint.js";

type S = CompactionSlideable;

/** Kotlin `C2SlideableSSP`: shortest-path search for a connection route over slideables. */
export class SlideableSSP extends AbstractSSP<Route> {
  readonly allowedToLeave: ReadonlyMap<DiagramElement, number>;

  constructor(
    readonly e: Connection,
    readonly start: ReadonlySet<RoutePoint>,
    readonly end: ReadonlySet<RoutePoint>,
    readonly crossableElements: ReadonlySet<DiagramElement>,
    private readonly startElem: Connected,
    private readonly endElem: Connected,
    private readonly direction: Direction | null,
    private readonly c2: Compaction,
    readonly log: Kite9Log,
  ) {
    super();
    this.allowedToLeave = this.computeAllowedToLeave();
  }

  private computeAllowedToLeave(): Map<DiagramElement, number> {
    let se: DiagramElement = this.startElem;
    let ee: DiagramElement = this.endElem;
    const out = new Set<DiagramElement>();
    while (se !== ee) {
      out.add(se);
      out.add(ee);

      if (se.getDepth() > ee.getDepth()) {
        se = se.getParent()!;
      } else if (ee.getDepth() > se.getDepth()) {
        ee = ee.getParent()!;
      } else {
        se = se.getParent()!;
        ee = ee.getParent()!;
      }
    }

    out.add(ee);

    return new Map([...out].map((it) => [it, it.getDepth()]));
  }

  protected pathComplete(r: Route): boolean {
    const atEnd = [...this.end].some((p) => p.equals(r.point));
    return atEnd && (this.direction != null ? r.point.d === this.direction : true);
  }

  isDestination(ra: readonly RectAnchor[]): boolean {
    return ra.some((it) => it.e === this.endElem);
  }

  protected generateSuccessivePaths(r: Route, s: State<Route>): void {
    const along = r.point.getAlong();
    const perp = r.point.getPerp();
    const d = r.point.d;
    this.log.send(`Extending: ${r}`);

    // straight line advancement
    this.advance(d, perp, r.updateCost(r.cost.addStep()), along, s);

    if (perp.getRectAnchors().length === 0) {
      const dc = rotateClockwise(d);
      const nextScoreDc = r.cost.addTurn(CostFreeTurn.CLOCKWISE);
      this.advance(dc, along, r.updateCost(nextScoreDc), perp, s);

      const dac = rotateAntiClockwise(d);
      const nextScoreDac = r.cost.addTurn(CostFreeTurn.ANTICLOCKWISE);
      this.advance(dac, along, r.updateCost(nextScoreDac), perp, s);
    }
  }

  private generateNextSteps(d: Direction, perp: S, r: Route, along: S): Route[] {
    return [...this.nextInDirection(perp, d, along)]
      .filter((k) => r.coords.isInBounds(k, d))
      .map((k) => {
        const p = new RoutePoint(along, k, d);
        const stride = r.coords.distanceTo(p);
        const possibleRemainingDistance = this.getMinimumRemainingDistance(k);
        const expensive = this.expensiveDirection(p);
        const newCost = r.cost.addDistance(stride, possibleRemainingDistance, expensive);
        return r.advance(p, newCost);
      });
  }

  private advance(d: Direction, perp: S, r: Route, along: S, s: State<Route>): void {
    if (along.canMoveAlongInside(r.container)) {
      const out1 = this.generateNextSteps(d, perp, r, along);
      const out2 = out1.flatMap((r2) => {
        const along2 = r2.point.getAlong();
        const perp2 = r2.point.getPerp();
        const d2 = r2.point.d;
        const ra = perp2.getRectAnchors();
        if (ra.length > 0 && !this.isDestination(ra)) {
          // if we arrive at a rectangular, we need to cross it
          const route2 = this.crossThreshold(perp2, r2, d2, r2.cost, along2);
          return route2 != null ? this.generateNextSteps(d2, perp2, route2, along2) : [];
        } else {
          return [r2];
        }
      });
      for (const it of out2) {
        if (s.add(it)) {
          this.log.send(`Added: ${it}`);
        }
      }
    }
  }

  private getAbsoluteDistance(from: S, to: S): number {
    return Math.abs(to.minimumPosition - from.minimumPosition);
  }

  private getMinimumRemainingDistance(from: S): number {
    let min: number | null = null;
    for (const it of this.end) {
      const dist = this.getAbsoluteDistance(it.get(from.dimension), from);
      min = min == null ? dist : Math.min(min, dist);
    }
    return min ?? 0;
  }

  private nextInDirection(from: S, d: Direction, along: S): Set<S> {
    const positionBefore = (a: S, b: S): boolean => a.minimumPosition < b.minimumPosition;
    const positionSame = (a: S, b: S): boolean => a.minimumPosition === b.minimumPosition;
    const positionAfter = (a: S, b: S): boolean => a.minimumPosition > b.minimumPosition;
    const numericallyBefore = (a: S, b: S): boolean => a.number < b.number;
    const numericallyAfter = (a: S, b: S): boolean => a.number > b.number;

    const neighbours = [...this.c2.getNeighbours(along, from)];

    let inRightDirection: S[];
    switch (d) {
      case Direction.UP:
      case Direction.LEFT:
        inRightDirection = neighbours.filter(
          (it) => positionBefore(it, from) || (positionSame(it, from) && numericallyBefore(it, from)),
        );
        break;
      case Direction.RIGHT:
      case Direction.DOWN:
        inRightDirection = neighbours.filter(
          (it) => positionAfter(it, from) || (positionSame(it, from) && numericallyAfter(it, from)),
        );
        break;
    }

    if (inRightDirection.length === 0) {
      return new Set();
    }
    const minDistance = Math.min(...inRightDirection.map((it) => this.getAbsoluteDistance(from, it)));
    return new Set(inRightDirection.filter((it) => this.getAbsoluteDistance(from, it) === minDistance));
  }

  private crossThreshold(
    perp: S,
    routeIn: Route,
    d: Direction,
    c: RouteCosting,
    _along: S,
  ): Route | null {
    const a = perp.getRelevantRectAnchor(routeIn.container);

    if (a == null) {
      if (isDiagram(routeIn.container)) {
        // trying to leave the diagram
        return null;
      } else {
        // crossing grid cells
        return routeIn;
      }
    } else if (a.canCross(d, this.crossableElements)) {
      const entering = isEntering(a.s, d);
      const newContainer = !entering ? a.e.getContainer() : a.e;
      if (newContainer == null) {
        return null;
      } else {
        const oldDepth = routeIn.cost.containerDepth;
        const newDepth = entering ? oldDepth + 1 : oldDepth - 1;
        const newCost = c.addCrossing(true, newDepth);
        return routeIn.changeContainer(newContainer, newCost);
      }
    } else {
      return null;
    }
  }

  private hasHorizontalConstraint(): boolean {
    return this.direction != null && isVerticalDirection(this.direction);
  }

  private hasVerticalConstraint(): boolean {
    return this.direction != null && isHorizontalDirection(this.direction);
  }

  private expensiveDirection(p: RoutePoint): boolean {
    switch (p.getPerp().dimension) {
      case Dimension.V:
        return this.hasVerticalConstraint();
      case Dimension.H:
        return this.hasHorizontalConstraint();
    }
  }

  protected createInitialPaths(s: State<Route>): void {
    for (const it of this.start) {
      if (!this.directionOk(it)) continue;
      // head out from each point as far as possible in each direction
      const along = it.getAlong();
      const perp = it.getPerp();
      const mrd1 = this.getMinimumRemainingDistance(perp);
      const mrd2 = this.getMinimumRemainingDistance(along);
      const initialDepth = this.allowedToLeave.get(this.startElem)!;
      const initialContainer = this.startElem.getParent()!;
      const initialCoords = RouteCoords.createInitialCoords(it);
      const initialCost = RouteCosting.initial(initialDepth).addDistance(0, mrd1 + mrd2, false);
      const r = new Route(null, initialCoords, it, initialCost, initialContainer);
      this.advance(r.point.d, perp, r, along, s);
    }
  }

  private directionOk(p: RoutePoint): boolean {
    return this.direction != null ? p.d === this.direction : true;
  }

  static isIncreasing(d: Direction): boolean {
    switch (d) {
      case Direction.UP:
      case Direction.LEFT:
        return false;
      case Direction.DOWN:
      case Direction.RIGHT:
        return true;
    }
  }
}
