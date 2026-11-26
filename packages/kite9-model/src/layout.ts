/** Layout snapshot types (grid tracks, element placements, link routes). */

import type { End } from "@kite9/css";
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

export type RouteLayout = {
  points: Point2D[];
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
};

/** Serializable layout snapshot: sized grid, element placements, and connection routes. */
export type LayoutData = {
  grid: GridLayout;
  placements: Record<string, LayoutPlacement>;
  routes: Record<string, RouteLayout>;
};

/** Connection body geometry for SVG rendering. */
export type ConnectionRenderLayout = {
  id: string;
  points: Point2D[];
  /** Decoration style at the from end (`ARROW` / `NONE`) — drives `marker-start`. */
  fromStyle: string;
  /** Decoration style at the to end — drives `marker-end`. */
  toStyle: string;
};

/** Terminator pose + decoration style at a link end (hit-box + marker def). */
export type TerminatorRenderLayout = {
  style: string;
  end: End;
  point: Point2D;
};

/** Connection label pose for SVG foreignObject (text comes from the label host/model). */
export type LabelRenderLayout = {
  id: string;
  end: End;
  point: Point2D;
  size: Size;
};
