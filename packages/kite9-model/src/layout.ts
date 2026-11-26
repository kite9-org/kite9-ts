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

/** Where an element sits after layout — content cell, edge track, or host-side anchor. */
export type LayoutPlacement =
  | {
      col: number;
      row: number;
      colEnd?: number;
      rowEnd?: number;
      /**
       * Only when the element authors CSS `width` / `height` (not content-sized).
       * Track sizes live on {@link GridLayout}; omit for minimize/auto boxes.
       */
      size?: Size;
      /** Outside content `size`; included in track occupancy. */
      margin?: BoxInsets;
    }
  /** Port/socket on the start/end of a content row (`LEFT`/`RIGHT`) or column (`UP`/`DOWN`). `along` is 1-based. */
  | { edge: Direction; along: number; size?: Size }
  | { anchor: string; side: Direction };

/**
 * Intersection of a vertical grid edge (`xi`) and a horizontal grid edge (`yi`).
 * `xi` ∈ `0..colSizes.length`, `yi` ∈ `0..rowSizes.length`.
 */
export type GridVertex = { xi: number; yi: number };

/**
 * Connection route in diagram pixel space (orthogonal polyline).
 * Prefer compaction RI waypoints remapped into the painted grid.
 */
export type RouteLayout = {
  points: Point2D[];
  /** Paint corner radius in px; consumers may default when omitted. */
  cornerRadius?: number;
  labels: Record<string, Point2D>;
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
  /**
   * Physical 0-based start index into {@link colSizes} for each content column.
   * Omitted → legacy `2 * (col)` (1-based col). Raised when connection lanes
   * split a content track.
   */
  contentColStarts?: number[];
  /** Physical track counts per content column (default 1). */
  contentColCounts?: number[];
  /** Physical 0-based start index into {@link rowSizes} for each content row. */
  contentRowStarts?: number[];
  /** Physical track counts per content row (default 1). */
  contentRowCounts?: number[];
};

/** Serializable layout snapshot: sized grid, element placements, and connection routes. */
export type LayoutData = {
  grid: GridLayout;
  placements: Record<string, LayoutPlacement>;
  routes: Record<string, RouteLayout>;
};
