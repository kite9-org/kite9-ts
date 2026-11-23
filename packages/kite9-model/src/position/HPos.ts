import { Direction } from "./Direction.js";

export enum HPos {
  LEFT = "LEFT",
  RIGHT = "RIGHT",
}

export function hPosDirection(value: HPos): Direction {
  return value === HPos.LEFT ? Direction.LEFT : Direction.RIGHT;
}

export function hPosFromDirection(d: Direction | null): HPos | null {
  if (d === Direction.LEFT) return HPos.LEFT;
  if (d === Direction.RIGHT) return HPos.RIGHT;
  return null;
}
