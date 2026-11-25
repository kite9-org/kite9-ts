import type { DiagramElement } from "@kite9/model";
import type { Anchor } from "./Anchor.js";

export enum Purpose {
  PORT = "PORT",
  GLYPH_LAYOUT_MIDPOINT = "GLYPH_LAYOUT_MIDPOINT",
  CONTAINER_LAYOUT_MIDPOINT = "CONTAINER_LAYOUT_MIDPOINT",
  LABEL_LAYOUT = "LABEL_LAYOUT",
}

/**
 * The slideable intersects the element.
 * The purpose indicates why this was created, which might be useful later.
 */
export class IntersectAnchor implements Anchor<Purpose> {
  constructor(
    readonly e: DiagramElement,
    readonly s: Purpose,
  ) {}

  equals(other: unknown): boolean {
    return other instanceof IntersectAnchor && other.e === this.e && other.s === this.s;
  }

  toString(): string {
    return `IntersectAnchor(e=${String(this.e)}, s=${this.s})`;
  }
}
