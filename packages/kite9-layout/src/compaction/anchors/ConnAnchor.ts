import type { Connected, Connection, Direction } from "@kite9/model";
import type { Side } from "../Side.js";
import type { Anchor } from "./Anchor.js";

export enum AnchorType {
  REGULAR = "REGULAR",
  PRE_FAN = "PRE_FAN",
  AFTER_FAN = "AFTER_FAN",
  TERMINAL = "TERMINAL",
}

/**
 * Anchor for a point in a connection, numbered from zero
 */
export class ConnAnchor implements Anchor<number> {
  constructor(
    readonly e: Connection,
    readonly s: number,
    readonly type: AnchorType,
    readonly connectedSide: Side,
    readonly connectedEnd: Connected | null,
    readonly comingFrom: Direction | null,
    readonly goingTo: Direction | null,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof ConnAnchor &&
      other.e === this.e &&
      other.s === this.s &&
      other.type === this.type &&
      other.connectedSide === this.connectedSide &&
      other.connectedEnd === this.connectedEnd &&
      other.comingFrom === this.comingFrom &&
      other.goingTo === this.goingTo
    );
  }

  toString(): string {
    return `ConnAnchor(e=${String(this.e)}, s=${this.s}, type=${this.type}, connectedSide=${this.connectedSide}, connectedEnd=${String(this.connectedEnd)}, comingFrom=${this.comingFrom}, goingTo=${this.goingTo})`;
  }
}
