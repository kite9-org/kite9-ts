import { Direction, Layout } from "@kite9/model";
import type { RoutingInfo } from "../../../common/elements/RoutingInfo.js";
import { BasicBounds } from "../../../common/objects/BasicBounds.js";
import type { Bounds } from "../../../common/objects/Bounds.js";
import { LogicException } from "../../../logging/LogicException.js";
import type { Group } from "../grouping/basic/group/Group.js";
import type { LinkDetail } from "../links/LinkManager.js";
import { DPos, type RoutableHandler2D } from "../position/RoutableHandler2D.js";

/** Numeric values are the Kotlin ordinals, used as matrix indices. */
export enum RelativeSide {
  FACING,
  MIDDLE,
  OPPOSITE,
}

/** Kotlin `Direction.ordinal` (UP, LEFT, DOWN, RIGHT). */
function directionOrdinal(d: Direction): number {
  switch (d) {
    case Direction.UP:
      return 0;
    case Direction.LEFT:
      return 1;
    case Direction.DOWN:
      return 2;
    case Direction.RIGHT:
      return 3;
  }
}

/**
 * The exit matrix keeps track of links leaving a group in order that we can perform
 * evaluation of the best way to layout it's parent.
 *
 * @author robmoffat
 */
export class ExitMatrix {
  private counts: number[][];

  private spans: Bounds[] = [
    BasicBounds.EMPTY_BOUNDS,
    BasicBounds.EMPTY_BOUNDS,
    BasicBounds.EMPTY_BOUNDS,
    BasicBounds.EMPTY_BOUNDS,
  ];

  private sizex: Bounds = BasicBounds.EMPTY_BOUNDS;
  private sizey: Bounds = BasicBounds.EMPTY_BOUNDS;

  private _isEmpty = true;

  constructor(counts?: number[][], empty?: boolean) {
    if (counts !== undefined) {
      this.counts = counts;
      this._isEmpty = empty ?? true;
    } else {
      this.counts = [
        [0, 0, 0],
        [0, 0, 0],
        [0, 0, 0],
      ];
    }
  }

  get isEmpty(): boolean {
    return this._isEmpty;
  }

  private getCount(x: number, y: number): number {
    return this.counts[y]![x]!;
  }

  private incrCount(x: DPos, y: DPos, v: number): void {
    const row = this.counts[y]!;
    row[x] = Math.fround(row[x]! + v);
  }

  toString(): string {
    let sb = "ExitMatrix[spans=";
    for (const it of this.spans) {
      sb += `${it} `;
    }
    for (const row of this.counts) {
      sb += row.map((it) => `${it} `).join("") + " / ";
    }
    sb += "]";
    return sb;
  }

  setSpans(spans: Bounds[]): void {
    this.spans = spans;
  }

  setSize(x: Bounds, y: Bounds): void {
    this.sizex = x;
    this.sizey = y;
  }

  addLink(
    originatingGroup: Group,
    destinationGroup: Group,
    ld: LinkDetail,
    rh: RoutableHandler2D,
  ): void {
    const oPos = originatingGroup.axis.getPosition(rh, true);
    const dPos = destinationGroup.axis.getPosition(rh, true);
    const xCompare = rh.compareBounds(rh.getBoundsOf(dPos, true), rh.getBoundsOf(oPos, true));
    const yCompare = rh.compareBounds(rh.getBoundsOf(dPos, false), rh.getBoundsOf(oPos, false));
    this.incrCount(xCompare, yCompare, ld.numberOfLinks);
    if (yCompare === DPos.OVERLAP) {
      if (xCompare === DPos.BEFORE) {
        this.expandBounds(Direction.LEFT, oPos, rh);
      } else if (xCompare === DPos.AFTER) {
        this.expandBounds(Direction.RIGHT, oPos, rh);
      }
    }
    if (xCompare === DPos.OVERLAP) {
      if (yCompare === DPos.BEFORE) {
        this.expandBounds(Direction.UP, oPos, rh);
      } else if (yCompare === DPos.AFTER) {
        this.expandBounds(Direction.DOWN, oPos, rh);
      }
    }
    this._isEmpty = false;
  }

  private expandBounds(d: Direction, oPos: RoutingInfo, rh: RoutableHandler2D): void {
    const horizontalSpan = d === Direction.UP || d === Direction.DOWN;
    const b = rh.getBoundsOf(oPos, horizontalSpan);
    const i = directionOrdinal(d);
    this.spans[i] = this.spans[i]!.expand(b);
  }

  getLinkCount(d: Layout | null, rs: RelativeSide, rank: number): number {
    const rsRank = rs as number;
    switch (d) {
      case Layout.UP:
        return this.getCount(rank + 1, rsRank);
      case Layout.DOWN:
        return this.getCount(rank + 1, 2 - rsRank);
      case Layout.LEFT:
        return this.getCount(rsRank, rank + 1);
      case Layout.RIGHT:
        return this.getCount(2 - rsRank, rank + 1);
      default:
        throw new LogicException("Not sure what to return");
    }
  }

  getSpanInDirectionOfLayout(d: Layout): Bounds | null {
    switch (d) {
      case Layout.UP:
        return this.spans[directionOrdinal(Direction.UP)]!;
      case Layout.DOWN:
        return this.spans[directionOrdinal(Direction.DOWN)]!;
      case Layout.LEFT:
        return this.spans[directionOrdinal(Direction.LEFT)]!;
      case Layout.RIGHT:
        return this.spans[directionOrdinal(Direction.RIGHT)]!;
      default:
        throw new LogicException(`Span not defined for ${d}`);
    }
  }

  getSizeInDirectionOfLayout(d: Layout | null): Bounds {
    switch (d) {
      case Layout.DOWN:
      case Layout.UP:
      case Layout.VERTICAL:
        return this.sizey;
      default:
        return this.sizex;
    }
  }
}
