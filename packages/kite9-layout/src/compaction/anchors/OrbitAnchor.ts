import type { Positioned } from "@kite9/model";
import type { Side } from "../Side.js";
import type { Anchor } from "./Anchor.js";

/**
 * Anchor to say that the slideable passes to the side of this element.
 */
export class OrbitAnchor implements Anchor<Side> {
  constructor(
    readonly e: Positioned,
    readonly s: Side,
  ) {}

  equals(other: unknown): boolean {
    return other instanceof OrbitAnchor && other.e === this.e && other.s === this.s;
  }

  toString(): string {
    return `OrbitAnchor(e=${String(this.e)}, s=${this.s})`;
  }
}
