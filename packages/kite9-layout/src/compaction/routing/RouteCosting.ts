import type { Comparable } from "@kite9/model";

export enum CostFreeTurn {
  CLOCKWISE = "CLOCKWISE",
  ANTICLOCKWISE = "ANTICLOCKWISE",
}

interface CostingFields {
  allEdgeCrossings: number;
  turns: number;
  costFreeTurn: CostFreeTurn | null;
  steps: number;
  illegalEdgeCrossings: number;
  totalWeightedDistance: number;
  minimumPossibleDistance: number;
  expensiveAxisDistance: number;
  containerDepth: number;
}

function cmp(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** Kotlin `C2Costing`: the cost of a partial route, ordered by priority. */
export class RouteCosting implements Comparable<RouteCosting>, Readonly<CostingFields> {
  readonly allEdgeCrossings: number;
  readonly turns: number;
  readonly costFreeTurn: CostFreeTurn | null;
  readonly steps: number;
  readonly illegalEdgeCrossings: number;
  readonly totalWeightedDistance: number;
  readonly minimumPossibleDistance: number;
  readonly expensiveAxisDistance: number;
  readonly containerDepth: number;

  constructor(fields: Partial<CostingFields> & { containerDepth: number }) {
    this.allEdgeCrossings = fields.allEdgeCrossings ?? 0;
    this.turns = fields.turns ?? 0;
    this.costFreeTurn = fields.costFreeTurn ?? null;
    this.steps = fields.steps ?? 1;
    this.illegalEdgeCrossings = fields.illegalEdgeCrossings ?? 0;
    this.totalWeightedDistance = fields.totalWeightedDistance ?? 0;
    this.minimumPossibleDistance = fields.minimumPossibleDistance ?? 0;
    this.expensiveAxisDistance = fields.expensiveAxisDistance ?? 0;
    this.containerDepth = fields.containerDepth;
  }

  /** Kotlin `C2Costing(startContainerDepth)`. */
  static initial(startContainerDepth: number): RouteCosting {
    return new RouteCosting({ steps: 0, containerDepth: startContainerDepth });
  }

  /** Kotlin `C2Costing(c, ...)` copy-constructor: overrides fields and increments `steps`. */
  private next(changes: Partial<Omit<CostingFields, "steps">>): RouteCosting {
    return new RouteCosting({
      allEdgeCrossings: this.allEdgeCrossings,
      turns: this.turns,
      costFreeTurn: this.costFreeTurn,
      illegalEdgeCrossings: this.illegalEdgeCrossings,
      totalWeightedDistance: this.totalWeightedDistance,
      minimumPossibleDistance: this.minimumPossibleDistance,
      expensiveAxisDistance: this.expensiveAxisDistance,
      containerDepth: this.containerDepth,
      ...changes,
      steps: this.steps + 1,
    });
  }

  addTurn(d: CostFreeTurn): RouteCosting {
    if (d === this.costFreeTurn) {
      // complete 180
      return this.next({ turns: this.turns + 2, costFreeTurn: d });
    } else {
      // currently just a dog-leg or straight, count as zero
      return this.next({ costFreeTurn: d });
    }
  }

  addDistance(stride: number, left: number, expensive: boolean): RouteCosting {
    const travelledDistance = this.totalWeightedDistance + stride * this.containerDepth;
    const expensiveDistance = this.expensiveAxisDistance + (expensive ? stride : 0);
    const possibleDistance = Math.max(travelledDistance + left, this.minimumPossibleDistance);
    const newCostFreeTurn = stride > 0 ? null : this.costFreeTurn;
    const newTurns = this.costFreeTurn != null && stride > 0 ? this.turns + 1 : this.turns;
    return this.next({
      minimumPossibleDistance: possibleDistance,
      totalWeightedDistance: travelledDistance,
      turns: newTurns,
      costFreeTurn: newCostFreeTurn,
      expensiveAxisDistance: expensiveDistance,
    });
  }

  addStep(): RouteCosting {
    return this.next({});
  }

  addCrossing(legal: boolean, newContainerDepth: number): RouteCosting {
    return this.next({
      allEdgeCrossings: this.allEdgeCrossings + 1,
      illegalEdgeCrossings: this.illegalEdgeCrossings + (legal ? 0 : 1),
      containerDepth: newContainerDepth,
    });
  }

  compareTo(other: RouteCosting): number {
    // expensive (i.e. more important than crossings)
    if (this.expensiveAxisDistance !== other.expensiveAxisDistance) {
      return cmp(this.expensiveAxisDistance, other.expensiveAxisDistance);
    }

    if (this.illegalEdgeCrossings !== other.illegalEdgeCrossings) {
      return cmp(this.illegalEdgeCrossings, other.illegalEdgeCrossings);
    }

    // route with minimum amount of crossing
    if (this.allEdgeCrossings !== other.allEdgeCrossings) {
      return cmp(this.allEdgeCrossings, other.allEdgeCrossings);
    }

    // try to minimize turns
    if (this.turns !== other.turns) {
      return cmp(this.turns, other.turns);
    }

    // try to minimize A* minimum possible distance
    if (this.minimumPossibleDistance !== other.minimumPossibleDistance) {
      return cmp(this.minimumPossibleDistance, other.minimumPossibleDistance);
    }

    // pick the route that has gone farthest
    if (this.totalWeightedDistance !== other.totalWeightedDistance) {
      return -cmp(this.totalWeightedDistance, other.totalWeightedDistance);
    }

    if (this.steps !== other.steps) {
      return cmp(this.steps, other.steps);
    }

    return 0;
  }

  equals(other: unknown): boolean {
    return (
      other instanceof RouteCosting &&
      other.allEdgeCrossings === this.allEdgeCrossings &&
      other.turns === this.turns &&
      other.costFreeTurn === this.costFreeTurn &&
      other.steps === this.steps &&
      other.illegalEdgeCrossings === this.illegalEdgeCrossings &&
      other.totalWeightedDistance === this.totalWeightedDistance &&
      other.minimumPossibleDistance === this.minimumPossibleDistance &&
      other.expensiveAxisDistance === this.expensiveAxisDistance &&
      other.containerDepth === this.containerDepth
    );
  }

  toString(): string {
    // reported in priority order
    return `COST[ead=${this.expensiveAxisDistance}, ix=${this.illegalEdgeCrossings} x=${this.allEdgeCrossings} t=${this.turns} mpd=${this.minimumPossibleDistance} td=${this.totalWeightedDistance} s=${this.steps} cft=${this.costFreeTurn} d=${this.containerDepth}]`;
  }
}
