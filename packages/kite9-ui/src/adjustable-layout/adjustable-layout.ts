/** Mutable layout — resize, margins, and future edit constraints. */

import type {
  BoxInsets,
  GridLayout,
  GridVertex,
  LayoutData,
  LayoutPlacement,
  Point2D,
  RouteLayout,
  Size,
} from "@kite9/model";
import {
  DEFAULT_CORNER_RADIUS,
  contentColSpan,
  contentRowSpan,
  orthogonalPathD,
  vertexPoint as gridVertexPoint,
  verticesToPoints,
} from "./route-path.js";

/** Legacy route shape when routes used grid-edge vertices. */
type LegacyRoute = {
  points?: Point2D[];
  vertices?: GridVertex[];
  cornerRadius?: number;
  labels?: Record<string, Point2D>;
};

/** Prefer `points`; upgrade legacy `vertices` against the current grid. */
function normalizeRoutes(
  grid: GridLayout,
  routes: Record<string, RouteLayout | LegacyRoute>,
): Record<string, RouteLayout> {
  const out: Record<string, RouteLayout> = {};
  for (const [id, raw] of Object.entries(routes)) {
    const route = raw as LegacyRoute;
    if (route.points && route.points.length >= 2) {
      out[id] = {
        points: route.points,
        ...(route.cornerRadius !== undefined
          ? { cornerRadius: route.cornerRadius }
          : {}),
        labels: route.labels ?? {},
      };
      continue;
    }
    if (route.vertices && route.vertices.length >= 2) {
      out[id] = {
        points: verticesToPoints(grid, route.vertices),
        ...(route.cornerRadius !== undefined
          ? { cornerRadius: route.cornerRadius }
          : {}),
        labels: route.labels ?? {},
      };
      continue;
    }
  }
  return out;
}

type CellPlacement = Extract<LayoutPlacement, { col: number; row: number }>;

function isCellPlacement(p: LayoutPlacement): p is CellPlacement {
  return "col" in p && "row" in p;
}

function colSpan(p: CellPlacement): { start: number; end: number; count: number } {
  const start = p.col;
  const end = p.colEnd ?? p.col;
  return { start, end, count: end - start + 1 };
}

function rowSpan(p: CellPlacement): { start: number; end: number; count: number } {
  const start = p.row;
  const end = p.rowEnd ?? p.row;
  return { start, end, count: end - start + 1 };
}

function syncPhysicalContentTracks(grid: GridLayout): void {
  for (let c = 0; c < grid.contentColSizes.length; c++) {
    syncContentAxis(
      grid.colSizes,
      contentColSpan(grid, c + 1),
      grid.contentColSizes[c]!,
    );
  }
  for (let r = 0; r < grid.contentRowSizes.length; r++) {
    syncContentAxis(
      grid.rowSizes,
      contentRowSpan(grid, r + 1),
      grid.contentRowSizes[r]!,
    );
  }
}

/** Write logical content size into one or more physical tracks (preserve mid-lane zeros). */
function syncContentAxis(
  sizes: number[],
  span: { start: number; count: number },
  total: number,
): void {
  const { start, count } = span;
  if (start < 0 || start >= sizes.length) return;
  if (count <= 1) {
    sizes[start] = total;
    return;
  }
  let sum = 0;
  let flex = 0;
  for (let i = 0; i < count; i++) {
    const s = sizes[start + i] ?? 0;
    sum += s;
    if (s > 0) flex += s;
  }
  if (flex <= 0) {
    sizes[start] = total;
    return;
  }
  const scale = total / flex;
  let written = 0;
  for (let i = 0; i < count; i++) {
    const idx = start + i;
    if (idx >= sizes.length) break;
    if (i === count - 1) {
      sizes[idx] = Math.max(0, total - written);
    } else if ((sizes[idx] ?? 0) > 0) {
      const next = sizes[idx]! * scale;
      sizes[idx] = next;
      written += next;
    }
  }
  void sum;
}

/**
 * Editable view of {@link LayoutData}. Deep-clones on construction so
 * fixture imports stay immutable.
 */
export class AdjustableLayout {
  grid: GridLayout;
  placements: Record<string, LayoutPlacement>;
  routes: Record<string, RouteLayout>;

  private constructor(data: LayoutData) {
    this.grid = data.grid;
    this.placements = data.placements;
    this.routes = normalizeRoutes(data.grid, data.routes);
  }

  /** Deep-clone `data` into a mutable session layout. */
  static from(data: LayoutData): AdjustableLayout {
    const cloned = JSON.parse(JSON.stringify(data)) as LayoutData;
    return new AdjustableLayout(cloned);
  }

  clone(): AdjustableLayout {
    return AdjustableLayout.from(this.toJSON());
  }

  toJSON(): LayoutData {
    return JSON.parse(
      JSON.stringify({
        grid: this.grid,
        placements: this.placements,
        routes: this.routes,
      }),
    ) as LayoutData;
  }

  static occupiedSize(p: CellPlacement): Size {
    const s = p.size ?? { w: 0, h: 0 };
    const m = p.margin;
    if (!m) return { ...s };
    return {
      w: s.w + m.left + m.right,
      h: s.h + m.top + m.bottom,
    };
  }

  resizeElement(id: string, size: Size): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    placement.size = { ...size };
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  setMargin(id: string, margin: BoxInsets): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    placement.margin = { ...margin };
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  growToAtLeast(id: string, min: Size): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    const cur = placement.size ?? { w: 0, h: 0 };
    const next = {
      w: Math.max(cur.w, min.w),
      h: Math.max(cur.h, min.h),
    };
    if (placement.size && next.w === cur.w && next.h === cur.h) return true;
    return this.resizeElement(id, next);
  }

  /** Recompute tracks for the cell placement with `id`. */
  recomputeTracks(id: string): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  /** Pixel position of a grid-edge vertex under current track sizes. */
  vertexPoint(v: GridVertex): Point2D {
    return gridVertexPoint(this.grid, v);
  }

  /** Orthogonal polyline for a route id (empty if missing / too short). */
  routePolyline(id: string): Point2D[] {
    const route = this.routes[id];
    if (!route?.points?.length) return [];
    return route.points;
  }

  /**
   * SVG path `d` for a route, with corner radius from the route or `radius`.
   * Returns null when the route has fewer than two points.
   */
  routePathD(id: string, radius?: number): string | null {
    const route = this.routes[id];
    if (!route?.points || route.points.length < 2) return null;
    const r = radius ?? route.cornerRadius ?? DEFAULT_CORNER_RADIUS;
    return orthogonalPathD(route.points, r);
  }

  private maxWidthInContentCol(col: number): number {
    let max = this.grid.minCol;
    for (const p of Object.values(this.placements)) {
      if (!isCellPlacement(p) || !p.size) continue;
      const cs = colSpan(p);
      if (cs.count === 1 && cs.start === col) {
        max = Math.max(max, AdjustableLayout.occupiedSize(p).w);
      }
    }
    return max;
  }

  private maxHeightInContentRow(row: number): number {
    let max = this.grid.minRow;
    for (const p of Object.values(this.placements)) {
      if (!isCellPlacement(p) || !p.size) continue;
      const rs = rowSpan(p);
      if (rs.count === 1 && rs.start === row) {
        max = Math.max(max, AdjustableLayout.occupiedSize(p).h);
      }
    }
    return max;
  }

  /**
   * Update tracks spanned by a cell placement from current placement sizes.
   * Preserves gutter / outer pad tracks already in `colSizes` / `rowSizes`.
   * Content-sized placements (no `size`) leave measured tracks alone.
   */
  private recomputeTracksForPlacement(placement: CellPlacement): void {
    if (!placement.size) return;

    const { grid } = this;
    const cs = colSpan(placement);
    const rs = rowSpan(placement);

    if (cs.count === 1) {
      grid.contentColSizes[cs.start - 1] = this.maxWidthInContentCol(cs.start);
    } else {
      const need = AdjustableLayout.occupiedSize(placement).w;
      let span = grid.gutter * (cs.count - 1);
      for (let c = cs.start; c <= cs.end; c++) {
        span += grid.contentColSizes[c - 1] ?? grid.minCol;
      }
      if (need > span) {
        const grow = (need - span) / cs.count;
        for (let c = cs.start; c <= cs.end; c++) {
          grid.contentColSizes[c - 1] =
            (grid.contentColSizes[c - 1] ?? grid.minCol) + grow;
        }
      }
    }

    if (rs.count === 1) {
      grid.contentRowSizes[rs.start - 1] = this.maxHeightInContentRow(rs.start);
    } else {
      const need = AdjustableLayout.occupiedSize(placement).h;
      let span = grid.gutter * (rs.count - 1);
      for (let r = rs.start; r <= rs.end; r++) {
        span += grid.contentRowSizes[r - 1] ?? grid.minRow;
      }
      if (need > span) {
        const grow = (need - span) / rs.count;
        for (let r = rs.start; r <= rs.end; r++) {
          grid.contentRowSizes[r - 1] =
            (grid.contentRowSizes[r - 1] ?? grid.minRow) + grow;
        }
      }
    }

    syncPhysicalContentTracks(grid);
  }
}
