/** Mutable layout — resize, margins, and future edit constraints. */

import type {
  BoxInsets,
  GridLayout,
  LayoutData,
  LayoutPlacement,
  RouteLayout,
  Size,
} from "@kite9/model";

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

/** Physical 0-based index of content column `col` (1-based) in `colSizes`. */
function contentColPhysicalIndex(col: number): number {
  return 2 * col;
}

/** Physical 0-based index of content row `row` (1-based) in `rowSizes`. */
function contentRowPhysicalIndex(row: number): number {
  return 2 * row;
}

function syncPhysicalContentTracks(grid: GridLayout): void {
  for (let c = 0; c < grid.contentColSizes.length; c++) {
    const idx = contentColPhysicalIndex(c + 1);
    if (idx < grid.colSizes.length) {
      grid.colSizes[idx] = grid.contentColSizes[c]!;
    }
  }
  for (let r = 0; r < grid.contentRowSizes.length; r++) {
    const idx = contentRowPhysicalIndex(r + 1);
    if (idx < grid.rowSizes.length) {
      grid.rowSizes[idx] = grid.contentRowSizes[r]!;
    }
  }
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
    this.routes = data.routes;
  }

  /** Deep-clone `data` into a mutable session layout. */
  static from(data: LayoutData): AdjustableLayout {
    return new AdjustableLayout(
      JSON.parse(JSON.stringify(data)) as LayoutData,
    );
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

  /** Content size plus margins — track occupancy for a cell placement. */
  static occupiedSize(p: { size?: Size; margin?: BoxInsets }): Size {
    const s = p.size ?? { w: 0, h: 0 };
    const m = p.margin;
    if (!m) return { w: s.w, h: s.h };
    return {
      w: s.w + m.left + m.right,
      h: s.h + m.top + m.bottom,
    };
  }

  /**
   * Update an element's placement size and the content tracks it occupies.
   * Returns false if `id` has no cell placement.
   */
  resizeElement(id: string, size: Size): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    placement.size = { w: size.w, h: size.h };
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  /**
   * Update cell-placement margins and recompute occupied tracks.
   * Returns false if `id` has no cell placement.
   */
  setMargin(id: string, margin: BoxInsets): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    placement.margin = {
      top: margin.top,
      right: margin.right,
      bottom: margin.bottom,
      left: margin.left,
    };
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  /** Clear margins on a cell placement and recompute tracks. */
  clearMargin(id: string): boolean {
    const placement = this.placements[id];
    if (!placement || !isCellPlacement(placement)) return false;
    delete placement.margin;
    this.recomputeTracksForPlacement(placement);
    return true;
  }

  /**
   * Ensure a cell placement is at least `min` (e.g. parent grows with nested child).
   * Returns false if `id` has no cell placement.
   */
  growToFit(id: string, min: Size): boolean {
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
