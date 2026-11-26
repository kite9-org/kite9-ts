/** Grid-edge polylines → SVG path `d` with optional corner radius (RoutePainter-style). */

import { Direction, type GridLayout, type GridVertex, type Point2D } from "@kite9/model";

export const DEFAULT_CORNER_RADIUS = 8;

/** Cumulative edge coordinates: length = trackSizes.length + 1. */
export function edgeCoords(trackSizes: readonly number[]): number[] {
  const out = [0];
  let sum = 0;
  for (const s of trackSizes) {
    sum += s;
    out.push(sum);
  }
  return out;
}

/** Physical span of content column `col` (1-based) in `colSizes`. */
export function contentColSpan(
  grid: GridLayout,
  col: number,
): { start: number; count: number } {
  const i = col - 1;
  const start = grid.contentColStarts?.[i] ?? 2 * col;
  const count = grid.contentColCounts?.[i] ?? 1;
  return { start, count: Math.max(1, count) };
}

/** Physical span of content row `row` (1-based) in `rowSizes`. */
export function contentRowSpan(
  grid: GridLayout,
  row: number,
): { start: number; count: number } {
  const i = row - 1;
  const start = grid.contentRowStarts?.[i] ?? 2 * row;
  const count = grid.contentRowCounts?.[i] ?? 1;
  return { start, count: Math.max(1, count) };
}

/**
 * Ensure `grid.colSizes` / `rowSizes` have an edge near `coord`.
 * Splits the containing track when needed and updates content span metadata
 * so placements still cover the full logical content cell.
 */
export function ensureGridEdge(
  grid: GridLayout,
  axis: "col" | "row",
  coord: number,
  eps = 0.75,
): number {
  const sizes = axis === "col" ? grid.colSizes : grid.rowSizes;
  const edges = edgeCoords(sizes);
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < edges.length; i++) {
    const d = Math.abs(edges[i]! - coord);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  if (bestDist <= eps) return best;

  let track = -1;
  for (let i = 0; i < sizes.length; i++) {
    const a = edges[i]!;
    const b = edges[i + 1]!;
    if (coord > a + eps && coord < b - eps) {
      track = i;
      break;
    }
  }
  if (track < 0) return best;

  const a = edges[track]!;
  const left = coord - a;
  const right = sizes[track]! - left;
  sizes.splice(track, 1, left, right);

  if (axis === "col") {
    bumpContentSpansAfterSplit(grid, "col", track);
  } else {
    bumpContentSpansAfterSplit(grid, "row", track);
  }
  return track + 1;
}

function bumpContentSpansAfterSplit(
  grid: GridLayout,
  axis: "col" | "row",
  splitTrack: number,
): void {
  const n = axis === "col" ? grid.contentCols : grid.contentRows;
  const startsKey = axis === "col" ? "contentColStarts" : "contentRowStarts";
  const countsKey = axis === "col" ? "contentColCounts" : "contentRowCounts";

  if (!grid[startsKey] || !grid[countsKey]) {
    const starts: number[] = [];
    const counts: number[] = [];
    for (let i = 1; i <= n; i++) {
      const span =
        axis === "col" ? contentColSpan(grid, i) : contentRowSpan(grid, i);
      starts.push(span.start);
      counts.push(span.count);
    }
    grid[startsKey] = starts;
    grid[countsKey] = counts;
  }

  const starts = grid[startsKey]!;
  const counts = grid[countsKey]!;
  for (let i = 0; i < n; i++) {
    const start = starts[i]!;
    const end = start + counts[i]! - 1;
    if (splitTrack >= start && splitTrack <= end) {
      counts[i] = counts[i]! + 1;
      for (let j = i + 1; j < n; j++) starts[j] = starts[j]! + 1;
      return;
    }
    if (splitTrack < start) {
      for (let j = i; j < n; j++) starts[j] = starts[j]! + 1;
      return;
    }
  }
  // Split after all content (in trailing pads) — shift nothing content-side.
}

/** Seed span arrays for the standard doubled-pad + gutter track pattern. */
export function initContentSpans(grid: GridLayout): void {
  const colStarts: number[] = [];
  const colCounts: number[] = [];
  for (let c = 1; c <= grid.contentCols; c++) {
    colStarts.push(2 * c);
    colCounts.push(1);
  }
  const rowStarts: number[] = [];
  const rowCounts: number[] = [];
  for (let r = 1; r <= grid.contentRows; r++) {
    rowStarts.push(2 * r);
    rowCounts.push(1);
  }
  grid.contentColStarts = colStarts;
  grid.contentColCounts = colCounts;
  grid.contentRowStarts = rowStarts;
  grid.contentRowCounts = rowCounts;
}

export function vertexPoint(
  grid: GridLayout,
  v: GridVertex,
): Point2D {
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const xi = Math.max(0, Math.min(v.xi, xs.length - 1));
  const yi = Math.max(0, Math.min(v.yi, ys.length - 1));
  return { x: xs[xi]!, y: ys[yi]! };
}

export function verticesToPoints(
  grid: GridLayout,
  vertices: readonly GridVertex[],
): Point2D[] {
  return vertices.map((v) => vertexPoint(grid, v));
}

type Move = {
  xs: number;
  ys: number;
  xe: number;
  ye: number;
};

function moveLength(m: Move): number {
  return Math.abs(m.xe - m.xs) + Math.abs(m.ye - m.ys);
}

function moveDirection(m: Move): Direction {
  if (m.xe > m.xs) return Direction.RIGHT;
  if (m.xe < m.xs) return Direction.LEFT;
  if (m.ye > m.ys) return Direction.DOWN;
  if (m.ye < m.ys) return Direction.UP;
  return Direction.RIGHT;
}

function trimMove(m: Move, start: number, end: number): Move {
  const out = { ...m };
  if (out.xs === out.xe) {
    if (out.ys > out.ye) {
      out.ys -= start;
      out.ye += end;
    } else if (out.ys < out.ye) {
      out.ys += start;
      out.ye -= end;
    }
  } else if (out.xs > out.xe) {
    out.xs -= start;
    out.xe += end;
  } else if (out.xs < out.xe) {
    out.xs += start;
    out.xe -= end;
  }
  return out;
}

function roundCoord(n: number): number {
  return Math.round(n);
}

/** Merge collinear same-direction segments into moves. */
function createMoves(points: readonly Point2D[]): Move[] {
  if (points.length < 2) return [];
  const out: Move[] = [];
  let a: Move | null = null;
  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1]!;
    const cur = points[i]!;
    let b: Move = {
      xs: prev.x,
      ys: prev.y,
      xe: cur.x,
      ye: cur.y,
    };
    if (a != null) {
      if (moveDirection(a) === moveDirection(b) && moveLength(b) > 0) {
        b = { xs: a.xs, ys: a.ys, xe: b.xe, ye: b.ye };
      } else {
        out.push(a);
      }
    }
    a = b;
  }
  if (a != null) out.push(a);
  return out;
}

function appendCorner(
  parts: string[],
  m: Move,
  da: Direction,
  db: Direction,
  aRadius: number,
  bRadius: number,
): void {
  if (aRadius <= 0 && bRadius <= 0) return;
  const { xe, ye } = m;
  let x1 = xe;
  let y1 = ye;
  let x2 = xe;
  let y2 = ye;
  let clockwise = false;

  switch (da) {
    case Direction.RIGHT:
      if (db === Direction.UP) {
        x1 = xe - aRadius;
        y1 = ye;
        x2 = xe;
        y2 = ye - bRadius;
        clockwise = false;
      } else if (db === Direction.DOWN) {
        x1 = xe - aRadius;
        y1 = ye;
        x2 = xe;
        y2 = ye + bRadius;
        clockwise = true;
      } else return;
      break;
    case Direction.LEFT:
      if (db === Direction.UP) {
        x1 = xe + aRadius;
        y1 = ye;
        x2 = xe;
        y2 = ye - bRadius;
        clockwise = true;
      } else if (db === Direction.DOWN) {
        x1 = xe + aRadius;
        y1 = ye;
        x2 = xe;
        y2 = ye + bRadius;
        clockwise = false;
      } else return;
      break;
    case Direction.UP:
      if (db === Direction.LEFT) {
        x1 = xe;
        y1 = ye + aRadius;
        x2 = xe - bRadius;
        y2 = ye;
        clockwise = false;
      } else if (db === Direction.RIGHT) {
        x1 = xe;
        y1 = ye + aRadius;
        x2 = xe + bRadius;
        y2 = ye;
        clockwise = true;
      } else return;
      break;
    case Direction.DOWN:
      if (db === Direction.LEFT) {
        x1 = xe;
        y1 = ye - aRadius;
        x2 = xe - bRadius;
        y2 = ye;
        clockwise = true;
      } else if (db === Direction.RIGHT) {
        x1 = xe;
        y1 = ye - aRadius;
        x2 = xe + bRadius;
        y2 = ye;
        clockwise = false;
      } else return;
      break;
  }

  const rx = Math.abs(x2 - x1);
  const ry = Math.abs(y2 - y1);
  parts.push(
    `A${roundCoord(rx)} ${roundCoord(ry)} 0 0 ${clockwise ? 1 : 0} ${roundCoord(x2)} ${roundCoord(y2)}`,
  );
}

/**
 * Build an SVG path `d` from orthogonal waypoints, with optional corner radius
 * (Kotlin `RoutePainterImpl.CurvedCornerHopDisplayer`, hops omitted).
 */
export function orthogonalPathD(
  points: readonly Point2D[],
  cornerRadius = DEFAULT_CORNER_RADIUS,
): string | null {
  if (points.length < 2) return null;
  const moves = createMoves(points);
  if (moves.length === 0) return null;

  const parts: string[] = [];
  const first = moves[0]!;
  parts.push(`M${roundCoord(first.xs)} ${roundCoord(first.ys)}`);

  for (let i = 0; i < moves.length; i++) {
    const m1 = moves[i]!;
    const next = i < moves.length - 1 ? moves[i + 1]! : null;
    if (next != null && cornerRadius > 0) {
      const aRadius = Math.min(cornerRadius, moveLength(m1) / 2);
      const bRadius = Math.min(cornerRadius, moveLength(next) / 2);
      const trimmed = trimMove(m1, 0, aRadius);
      parts.push(`L${roundCoord(trimmed.xe)} ${roundCoord(trimmed.ye)}`);
      appendCorner(
        parts,
        m1,
        moveDirection(m1),
        moveDirection(next),
        aRadius,
        bRadius,
      );
    } else {
      parts.push(`L${roundCoord(m1.xe)} ${roundCoord(m1.ye)}`);
    }
  }

  return parts.join(" ");
}

function nearestEdgeIndex(edges: readonly number[], coord: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < edges.length; i++) {
    const d = Math.abs(edges[i]! - coord);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Left/top edge index of the track that contains `coord` (clamped). */
export function floorEdgeIndex(
  trackSizes: readonly number[],
  coord: number,
): number {
  let sum = 0;
  for (let i = 0; i < trackSizes.length; i++) {
    const next = sum + trackSizes[i]!;
    if (coord <= next || i === trackSizes.length - 1) return i;
    sum = next;
  }
  return Math.max(0, trackSizes.length - 1);
}

/** Right/bottom edge index of the track that contains `coord`. */
export function ceilEdgeIndex(
  trackSizes: readonly number[],
  coord: number,
): number {
  return Math.min(
    trackSizes.length,
    floorEdgeIndex(trackSizes, coord) + 1,
  );
}

/** Snap a pixel point to the nearest grid edge intersection. */
export function snapToGridVertex(
  grid: GridLayout,
  p: Point2D,
): GridVertex {
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  return {
    xi: nearestEdgeIndex(xs, p.x),
    yi: nearestEdgeIndex(ys, p.y),
  };
}

/**
 * Orthogonal grid vertices covering a pixel polyline: nearest edge on the
 * constant axis, floor/ceil edges on the span of the varying axis so short
 * channels inside a track still produce a non-degenerate segment.
 */
export function snapPolylineToVertices(
  grid: GridLayout,
  points: readonly Point2D[],
): GridVertex[] {
  if (points.length === 0) return [];
  if (points.length === 1) return [snapToGridVertex(grid, points[0]!)];

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const dx = maxX - minX;
  const dy = maxY - minY;

  if (dx >= dy) {
    const yi = nearestEdgeIndex(edgeCoords(grid.rowSizes), (minY + maxY) / 2);
    const xi0 = floorEdgeIndex(grid.colSizes, minX);
    const xi1 = ceilEdgeIndex(grid.colSizes, maxX);
    const lo = Math.min(xi0, xi1);
    const hi = Math.max(xi0, xi1);
    if (lo === hi) {
      return simplifyVertices([
        { xi: lo, yi },
        { xi: Math.min(lo + 1, grid.colSizes.length), yi },
      ]);
    }
    // Preserve polyline order (left→right vs right→left).
    const startX = points[0]!.x;
    const endX = points[points.length - 1]!.x;
    return startX <= endX
      ? [
          { xi: lo, yi },
          { xi: hi, yi },
        ]
      : [
          { xi: hi, yi },
          { xi: lo, yi },
        ];
  }

  const xi = nearestEdgeIndex(edgeCoords(grid.colSizes), (minX + maxX) / 2);
  const yi0 = floorEdgeIndex(grid.rowSizes, minY);
  const yi1 = ceilEdgeIndex(grid.rowSizes, maxY);
  const lo = Math.min(yi0, yi1);
  const hi = Math.max(yi0, yi1);
  if (lo === hi) {
    return simplifyVertices([
      { xi, yi: lo },
      { xi, yi: Math.min(lo + 1, grid.rowSizes.length) },
    ]);
  }
  const startY = points[0]!.y;
  const endY = points[points.length - 1]!.y;
  return startY <= endY
    ? [
        { xi, yi: lo },
        { xi, yi: hi },
      ]
    : [
        { xi, yi: hi },
        { xi, yi: lo },
      ];
}

/**
 * Collapse consecutive vertices that continue in the same axis direction
 * (C2Route.simplifyRoute).
 */
export function simplifyVertices(
  vertices: readonly GridVertex[],
): GridVertex[] {
  if (vertices.length <= 2) return [...vertices];
  const out: GridVertex[] = [vertices[0]!];
  for (let i = 1; i < vertices.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = vertices[i]!;
    const next = vertices[i + 1]!;
    const dx1 = cur.xi - prev.xi;
    const dy1 = cur.yi - prev.yi;
    const dx2 = next.xi - cur.xi;
    const dy2 = next.yi - cur.yi;
    const sameDir =
      (dx1 === 0 && dx2 === 0 && Math.sign(dy1) === Math.sign(dy2) && dy1 !== 0) ||
      (dy1 === 0 && dy2 === 0 && Math.sign(dx1) === Math.sign(dx2) && dx1 !== 0);
    if (sameDir) continue;
    if (cur.xi === prev.xi && cur.yi === prev.yi) continue;
    out.push(cur);
  }
  const last = vertices[vertices.length - 1]!;
  const tail = out[out.length - 1]!;
  if (last.xi !== tail.xi || last.yi !== tail.yi) out.push(last);
  return out;
}
