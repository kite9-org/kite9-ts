import type { IntegerRange } from "@kite9/model";

/** An integer range, from and to. Used for grid positioning in each axis. */
export class BasicIntegerRange implements IntegerRange {
  constructor(
    readonly from: number,
    readonly to: number,
  ) {}

  equals(other: unknown): boolean {
    return (
      other instanceof BasicIntegerRange &&
      other.from === this.from &&
      other.to === this.to
    );
  }

  hashCode(): number {
    return (this.from * 31 + this.to) | 0;
  }

  toString(): string {
    return this.from > this.to ? "*" : `${this.from} ${this.to}`;
  }
}
