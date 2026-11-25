import type { DiagramElement } from "@kite9/model";
import type { PathLocation } from "../../common/algorithms/ssp/PathLocation.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RouteCosting } from "./RouteCosting.js";
import { RouteCoords } from "./RouteCoords.js";
import type { RoutePoint } from "./RoutePoint.js";

/** Kotlin `C2Route`: a (linked-list) partial route through the compaction's slideables. */
export class Route implements PathLocation<Route> {
  private active = true;

  constructor(
    readonly prev: Route | null,
    readonly coords: RouteCoords,
    readonly point: RoutePoint,
    readonly cost: RouteCosting,
    readonly container: DiagramElement,
  ) {}

  compareTo(other: Route): number {
    return this.cost.compareTo(other.cost);
  }

  getLocation(): unknown {
    return this.point;
  }

  isActive(): boolean {
    return this.active;
  }

  setActive(b: boolean): void {
    this.active = b;
  }

  toString(): string {
    return `Route(points=[${this.getPoints().join(", ")}], cost=${this.cost}, coords=${this.coords} active=${this.active} container=${String(this.container)})`;
  }

  private getPoints(): RoutePoint[] {
    const rest = this.prev == null ? [] : this.prev.getPoints();
    return [this.point, ...rest];
  }

  getSlideables(): CompactionSlideable[] {
    const out = new Set<CompactionSlideable>();
    for (const p of this.getPoints()) {
      out.add(p.b);
      out.add(p.a);
    }
    return [...out];
  }

  explainRoute(): Route[] {
    return this.prev != null ? [...this.prev.explainRoute(), this] : [this];
  }

  updateCost(newCost: RouteCosting): Route {
    return new Route(
      Route.simplifyRoute(this, this.point),
      Route.buildCoords(this, this.point),
      this.point,
      newCost,
      this.container,
    );
  }

  advance(newPoint: RoutePoint, newCost: RouteCosting): Route {
    return new Route(
      Route.simplifyRoute(this, newPoint),
      Route.buildCoords(this, newPoint),
      newPoint,
      newCost,
      this.container,
    );
  }

  changeContainer(container: DiagramElement, newCost: RouteCosting): Route {
    return new Route(
      Route.simplifyRoute(this, this.point),
      Route.buildCoords(this, this.point),
      this.point,
      newCost,
      container,
    );
  }

  private static buildCoords(r: Route | null, point: RoutePoint): RouteCoords {
    return r == null
      ? RouteCoords.createInitialCoords(point)
      : RouteCoords.createFollowingCoords(r.coords, point);
  }

  /**
   * Removes parts of the route in the same direction, so we only record changes
   * in direction
   */
  private static simplifyRoute(r: Route | null, point: RoutePoint): Route | null {
    let out = r;
    while (out != null && out.prev != null && out.point.d === point.d) {
      out = out.prev;
    }
    return out;
  }
}
