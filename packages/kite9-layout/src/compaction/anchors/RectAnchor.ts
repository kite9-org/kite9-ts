import { Direction } from "@kite9/model";
import type { DiagramElement, Positioned } from "@kite9/model";
import type { Side } from "../Side.js";
import type { Anchor } from "./Anchor.js";

export enum Permeability {
  INCREASING = "INCREASING",
  DECREASING = "DECREASING",
  ALL = "ALL",
  NONE = "NONE",
}

/**
 * Anchor for part of a rectangular in a slideable, e.g. top, bottom etc.
 */
export class RectAnchor implements Anchor<Side> {
  constructor(
    readonly e: Positioned,
    readonly s: Side,
    readonly permeability: Permeability,
  ) {}

  /**
   * Takes permeability into account when deciding whether we can cross over this element
   * when routing.
   *
   * Sometimes we have to ignore permeability - if we are crossing to something inside e,
   * we just have to do it, hence the passport: elements that we are definitely allowed to cross.
   */
  canCross(d: Direction, passport: ReadonlySet<DiagramElement>): boolean {
    if (passport.has(this.e)) {
      return true;
    }

    switch (d) {
      case Direction.UP:
      case Direction.LEFT:
        return (
          this.permeability === Permeability.DECREASING || this.permeability === Permeability.ALL
        );
      case Direction.DOWN:
      case Direction.RIGHT:
        return (
          this.permeability === Permeability.INCREASING || this.permeability === Permeability.ALL
        );
    }
  }

  equals(other: unknown): boolean {
    return (
      other instanceof RectAnchor &&
      other.e === this.e &&
      other.s === this.s &&
      other.permeability === this.permeability
    );
  }

  toString(): string {
    return `RectAnchor(e=${String(this.e)}, s=${this.s}, permeability=${this.permeability})`;
  }
}
