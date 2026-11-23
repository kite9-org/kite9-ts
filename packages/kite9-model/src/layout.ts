/** Shape of a completed diagram layout (grid tracks, element placements, link routes). */

export type Size = { w: number; h: number };

/** Where an element sits after layout — content-grid cell or edge anchor. */
export type LayoutPlacement =
  | { col: number; row: number; colEnd?: number; rowEnd?: number; size: Size }
  | { anchor: string; side: string };

export type RouteLayout = {
  points: Array<{ x: number; y: number }>;
  labels: Record<string, { x: number; y: number }>;
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

/** Completed layout: sized grid, element placements, and connection routes. */
export type CompletedLayout = {
  grid: GridLayout;
  placements: Record<string, LayoutPlacement>;
  routes: Record<string, RouteLayout>;
};
