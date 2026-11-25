import { Direction } from "@kite9/model";

/** Which end of an extent along an axis: START (up/left), END (down/right), or NEITHER. */
export enum Side {
  START = "START",
  END = "END",
  NEITHER = "NEITHER",
}

/** Kotlin `Side.isEntering(d)`. */
export function isEntering(side: Side, d: Direction): boolean {
  switch (side) {
    case Side.START:
      return d === Direction.RIGHT || d === Direction.DOWN;
    case Side.END:
      return d === Direction.LEFT || d === Direction.UP;
    case Side.NEITHER:
      return false;
  }
}

/** Kotlin `Side.getSideForDirection(d)`. */
export function getSideForDirection(d: Direction): Side {
  switch (d) {
    case Direction.UP:
    case Direction.LEFT:
      return Side.START;
    case Direction.DOWN:
    case Direction.RIGHT:
      return Side.END;
  }
}
