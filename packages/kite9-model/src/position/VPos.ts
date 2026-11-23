import { Direction } from "./Direction.js";

export enum VPos {
  UP = "UP",
  DOWN = "DOWN",
}

export function vPosDirection(value: VPos): Direction {
  return value === VPos.UP ? Direction.UP : Direction.DOWN;
}

export function vPosFromDirection(d: Direction | null): VPos | null {
  if (d === Direction.UP) return VPos.UP;
  if (d === Direction.DOWN) return VPos.DOWN;
  return null;
}
