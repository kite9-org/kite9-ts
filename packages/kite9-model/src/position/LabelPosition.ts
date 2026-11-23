import type { Label } from "../elements.js";
import { Direction } from "./Direction.js";

export function getLabelPlacementDefaulted(l: Label): Direction {
  return l.getLabelPlacement() ?? Direction.DOWN;
}

export function connectionLabelPlacementDirection(
  l: Label,
  d: Direction,
  defaultDirection: Direction,
): Direction {
  if (d === Direction.UP || d === Direction.DOWN) {
    return l.getLabelPlacement() === Direction.LEFT
      ? Direction.RIGHT
      : defaultDirection;
  }
  return l.getLabelPlacement() === Direction.UP
    ? Direction.DOWN
    : defaultDirection;
}
