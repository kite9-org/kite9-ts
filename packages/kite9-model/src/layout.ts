/** Layout snapshot types (grid tracks, element placements, link routes). */

import type { Direction } from "./position/Direction.js";

export type Size = { w: number; h: number };

export type Point2D = { x: number; y: number };

/** CSS-box insets (`margin-top` / …) outside the content `size`. */
export type BoxInsets = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type RectangularConnectedLayoutPlacement = {
  id: string
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
  size?: Size;
  margin?: BoxInsets;
};

export type PortOrHubLayoutPlacement = {
  id: string  // for hubs (default ports that aren't declared in the template) an id is generated
  onId: string // the ID of the element that this port is on
  edge: Direction;
  along: number;
  type: "pixels" | "percentage";
};


/** Where an element sits after layout — content cell, edge track, or host-side anchor. */
export type LayoutPlacement =
  | RectangularConnectedLayoutPlacement
  | PortOrHubLayoutPlacement

/**
 * Target a single grid track. Paint moves perpendicular onto it from the
 * current point (hub or previous vertex).
 * - `{ xi }` — vertical edge index ∈ `0..colSizes.length`
 * - `{ yi }` — horizontal edge index ∈ `0..rowSizes.length`
 */
export type GridVertex =
  | { xi: number; yi?: never }
  | { yi: number; xi?: never };

/**
 * Connection route in diagram pixel space (orthogonal polyline).
 * Prefer compaction RI waypoints remapped into the painted grid.
 */
export type RouteLayout = {
  startId: string // port or hub id
  endId: string // port or hub id
  /** Paint corner radius in px; consumers may default when omitted. */
  cornerRadius?: number;
  route: GridVertex[];
  //labels: Record<string, Point2D>;
};

export type GridLayout = {
  contentCols: number;
  contentRows: number;
  gutter: number;
  minCol: number;
  minRow: number;
  contentColSizes: number[];
  contentRowSizes: number[];
  colSizes: number[];
  rowSizes: number[];
  minWidth?: number;
  minHeight?: number;
};

/** Serializable layout snapshot: sized grid, element placements, and connection routes. */
export type LayoutData = {
  grid: GridLayout;
  placements: LayoutPlacement[];
  /** Omitted by grid-only placers (`@kite9/grid`); always set by `@kite9/layout`. */
  routes?: Record<string, RouteLayout>;
};
