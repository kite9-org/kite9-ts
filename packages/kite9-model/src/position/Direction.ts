import { Direction } from "@kite9/css";
import { Dimension } from "../common.js";
import { Turn, turnValue } from "./Turn.js";

export { Direction };

const CLOCKWISE: ReadonlyArray<Direction> = [
  Direction.UP,
  Direction.RIGHT,
  Direction.DOWN,
  Direction.LEFT,
];

export function getDirectionChange(from: Direction, to: Direction): Turn {
  const fi = CLOCKWISE.indexOf(from);
  const ti = CLOCKWISE.indexOf(to);
  const delta = (((ti - fi) % 4) + 4) % 4;
  switch (delta) {
    case 0:
      return Turn.STRAIGHT;
    case 1:
      return Turn.RIGHT;
    case 2:
      return Turn.BACK;
    default:
      return Turn.LEFT;
  }
}

export function rotateAntiClockwise(d: Direction): Direction {
  const i = CLOCKWISE.indexOf(d);
  return CLOCKWISE[(i + 3) % 4]!;
}

export function rotateClockwise(d: Direction): Direction {
  const i = CLOCKWISE.indexOf(d);
  return CLOCKWISE[(i + 1) % 4]!;
}

export function reverseDirection(d: Direction | null): Direction | null {
  if (d == null) return null;
  switch (d) {
    case Direction.UP:
      return Direction.DOWN;
    case Direction.DOWN:
      return Direction.UP;
    case Direction.LEFT:
      return Direction.RIGHT;
    case Direction.RIGHT:
      return Direction.LEFT;
  }
}

export function isHorizontalDirection(d: Direction): boolean {
  return d === Direction.LEFT || d === Direction.RIGHT;
}

export function isVerticalDirection(d: Direction): boolean {
  return d === Direction.UP || d === Direction.DOWN;
}

export function getDimensionForDirection(d: Direction): Dimension {
  return isHorizontalDirection(d) ? Dimension.H : Dimension.V;
}

export function getDirectionForAxis(
  d: Dimension,
  increasing: boolean,
): Direction {
  if (d === Dimension.H) {
    return increasing ? Direction.RIGHT : Direction.LEFT;
  }
  return increasing ? Direction.DOWN : Direction.UP;
}

export function directionTurnCost(from: Direction, to: Direction): number {
  return Math.abs(turnValue(getDirectionChange(from, to)));
}
