/** Grid-edge polylines → SVG path `d` with optional corner radius (RoutePainter-style). */

import {
  Direction,
  type GridLayout,
  type GridVertex,
  type LayoutPlacement,
  type Point2D,
  type PortOrHubLayoutPlacement,
  type RectangularConnectedLayoutPlacement,
} from "@kite9/model";

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

/** Physical span of content column `col` (1-based) in `colSizes` (1:1). */
export function contentColSpan(
  _grid: GridLayout,
  col: number,
): { start: number; count: number } {
  return { start: col - 1, count: 1 };
}

/** Physical span of content row `row` (1-based) in `rowSizes` (1:1). */
export function contentRowSpan(
  _grid: GridLayout,
  row: number,
): { start: number; count: number } {
  return { start: row - 1, count: 1 };
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
  // Content tracks are 1:1 with physical tracks; splitting a physical track
  // inserts a lane without separate contentColStarts metadata.
  void grid;
  void axis;
  void splitTrack;
}

/** No-op: content spans are 1:1 with physical tracks. */
export function initContentSpans(_grid: GridLayout): void {}

export function hasXi(
  v: GridVertex,
): v is { xi: number; yi?: never } {
  return "xi" in v && typeof (v as { xi?: number }).xi === "number";
}

export function hasYi(
  v: GridVertex,
): v is { yi: number; xi?: never } {
  return "yi" in v && typeof (v as { yi?: number }).yi === "number";
}

/** Move `prev` perpendicular onto track `v`. */
export function applyVertex(
  grid: GridLayout,
  v: GridVertex,
  prev: Point2D,
): Point2D {
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  if (hasXi(v)) {
    const xi = Math.max(0, Math.min(v.xi, xs.length - 1));
    return { x: xs[xi]!, y: prev.y };
  }
  const yi = Math.max(0, Math.min(v.yi, ys.length - 1));
  return { x: prev.x, y: ys[yi]! };
}

/**
 * @deprecated Single-axis vertices need a prior point — use {@link applyVertex}
 * or {@link resolveRouteToPoints}. Falls back to the opposite-axis origin (0).
 */
export function vertexPoint(
  grid: GridLayout,
  v: GridVertex,
  prev: Point2D = { x: 0, y: 0 },
): Point2D {
  return applyVertex(grid, v, prev);
}

/** Drop consecutive duplicates; collapse middle points on a straight run. */
export function simplifyPoints(points: readonly Point2D[]): Point2D[] {
  if (points.length <= 2) return points.map((p) => ({ ...p }));
  const out: Point2D[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = points[i]!;
    const next = points[i + 1]!;
    if (cur.x === prev.x && cur.y === prev.y) continue;
    const colinear =
      (cur.x === prev.x && next.x === cur.x) ||
      (cur.y === prev.y && next.y === cur.y);
    if (colinear) continue;
    out.push({ ...cur });
  }
  const last = points[points.length - 1]!;
  const tip = out[out.length - 1]!;
  if (last.x !== tip.x || last.y !== tip.y) out.push({ ...last });
  return out;
}

/**
 * Resolve single-axis track targets to a pixel polyline.
 * Seed at `start`, move perpendicular onto each vertex, then finish at `end`.
 */
export function resolveRouteToPoints(
  grid: GridLayout,
  vertices: readonly GridVertex[],
  start: Point2D,
  end: Point2D,
): Point2D[] {
  const pts: Point2D[] = [{ ...start }];
  let cur = { ...start };
  for (const v of vertices) {
    const next = applyVertex(grid, v, cur);
    if (next.x !== cur.x || next.y !== cur.y) {
      pts.push(next);
      cur = next;
    }
  }
  if (cur.x !== end.x || cur.y !== end.y) pts.push({ ...end });
  return simplifyPoints(pts);
}

/**
 * Legacy helper: resolve without terminals by starting at the origin.
 * Prefer {@link resolveRouteToPoints} with hub anchors.
 */
export function verticesToPoints(
  grid: GridLayout,
  vertices: readonly GridVertex[],
): Point2D[] {
  if (vertices.length === 0) return [];
  let cur = { x: 0, y: 0 };
  const pts: Point2D[] = [];
  for (const v of vertices) {
    cur = applyVertex(grid, v, cur);
    pts.push({ ...cur });
  }
  return simplifyPoints(pts);
}

function isRectPlacement(
  p: LayoutPlacement,
): p is RectangularConnectedLayoutPlacement {
  return "col" in p && "row" in p;
}

function isPortOrHub(
  p: LayoutPlacement,
): p is PortOrHubLayoutPlacement {
  return "onId" in p && "edge" in p;
}

/** Pixel rect of a content-cell placement in the physical track lattice. */
export function placementCellRect(
  grid: GridLayout,
  p: RectangularConnectedLayoutPlacement,
): { x: number; y: number; w: number; h: number } {
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const c0 = p.col - 1;
  const c1 = (p.colEnd ?? p.col) - 1;
  const r0 = p.row - 1;
  const r1 = (p.rowEnd ?? p.row) - 1;
  const x0 = xs[c0] ?? 0;
  const x1 = xs[c1 + 1] ?? x0;
  const y0 = ys[r0] ?? 0;
  const y1 = ys[r1 + 1] ?? y0;
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/**
 * Pixel position of a port/hub on its host **content** edge (`along` % or px),
 * inset by placement margin so adjacent side hubs are not coincident on a
 * shared cell seam.
 */
export function hubAnchorPoint(
  grid: GridLayout,
  placements: Readonly<Record<string, LayoutPlacement>>,
  id: string,
): Point2D | null {
  const p = placements[id];
  if (!p || !isPortOrHub(p)) return null;
  const host = placements[p.onId];
  if (!host || !isRectPlacement(host)) return null;
  const full = placementCellRect(grid, host);
  const m = host.margin;
  const left = Math.max(0, m?.left ?? 0);
  const right = Math.max(0, m?.right ?? 0);
  const top = Math.max(0, m?.top ?? 0);
  const bottom = Math.max(0, m?.bottom ?? 0);
  const box = {
    x: full.x + left,
    y: full.y + top,
    w: Math.max(0, full.w - left - right),
    h: Math.max(0, full.h - top - bottom),
  };
  const alongFrac =
    p.type === "percentage"
      ? Math.min(1, Math.max(0, p.along / 100))
      : null;
  const alongY =
    alongFrac != null
      ? box.y + box.h * alongFrac
      : box.y + Math.min(box.h, Math.max(0, p.along));
  const alongX =
    alongFrac != null
      ? box.x + box.w * alongFrac
      : box.x + Math.min(box.w, Math.max(0, p.along));
  switch (p.edge) {
    case Direction.LEFT:
      return { x: box.x, y: alongY };
    case Direction.RIGHT:
      return { x: box.x + box.w, y: alongY };
    case Direction.UP:
      return { x: alongX, y: box.y };
    case Direction.DOWN:
      return { x: alongX, y: box.y + box.h };
    default:
      return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }
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
  const dx = m.xe - m.xs;
  const dy = m.ye - m.ys;
  // Dominant axis — tiny remap noise must not flip a vertical into RIGHT/LEFT.
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx > 0) return Direction.RIGHT;
    if (dx < 0) return Direction.LEFT;
  }
  if (dy > 0) return Direction.DOWN;
  if (dy < 0) return Direction.UP;
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

/**
 * Snap a pixel point to the nearer axis as a single-track vertex
 * (vertical vs horizontal distance to the nearest edge).
 */
export function snapToGridVertex(
  grid: GridLayout,
  p: Point2D,
): GridVertex {
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const xi = nearestEdgeIndex(xs, p.x);
  const yi = nearestEdgeIndex(ys, p.y);
  const dx = Math.abs((xs[xi] ?? 0) - p.x);
  const dy = Math.abs((ys[yi] ?? 0) - p.y);
  return dx <= dy ? { xi } : { yi };
}

/**
 * Orthogonal single-axis track targets covering a pixel polyline.
 * Horizontal runs → `{ xi }` visits (y carried from terminals);
 * vertical runs → `{ yi }` visits.
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
    const xi0 = floorEdgeIndex(grid.colSizes, minX);
    const xi1 = ceilEdgeIndex(grid.colSizes, maxX);
    const lo = Math.min(xi0, xi1);
    const hi = Math.max(xi0, xi1);
    if (lo === hi) {
      return [{ xi: lo }];
    }
    const startX = points[0]!.x;
    const endX = points[points.length - 1]!.x;
    return startX <= endX
      ? [{ xi: lo }, { xi: hi }]
      : [{ xi: hi }, { xi: lo }];
  }

  const yi0 = floorEdgeIndex(grid.rowSizes, minY);
  const yi1 = ceilEdgeIndex(grid.rowSizes, maxY);
  const lo = Math.min(yi0, yi1);
  const hi = Math.max(yi0, yi1);
  if (lo === hi) {
    return [{ yi: lo }];
  }
  const startY = points[0]!.y;
  const endY = points[points.length - 1]!.y;
  return startY <= endY
    ? [{ yi: lo }, { yi: hi }]
    : [{ yi: hi }, { yi: lo }];
}

function vertexKey(v: GridVertex): string {
  return hasXi(v) ? `x:${v.xi}` : `y:${v.yi}`;
}

/**
 * Collapse consecutive duplicate single-axis vertices; drop intermediate
 * same-axis steps that continue in one direction.
 */
export function simplifyVertices(
  vertices: readonly GridVertex[],
): GridVertex[] {
  if (vertices.length <= 1) return [...vertices];
  const out: GridVertex[] = [vertices[0]!];
  for (let i = 1; i < vertices.length; i++) {
    const cur = vertices[i]!;
    const prev = out[out.length - 1]!;
    if (vertexKey(cur) === vertexKey(prev)) continue;
    // Same axis: keep only the latest (skip intermediate).
    if (hasXi(cur) && hasXi(prev) && i < vertices.length - 1) {
      const next = vertices[i + 1]!;
      if (hasXi(next)) {
        const d1 = cur.xi - prev.xi;
        const d2 = next.xi - cur.xi;
        if (Math.sign(d1) === Math.sign(d2) && d1 !== 0) continue;
      }
    }
    if (hasYi(cur) && hasYi(prev) && i < vertices.length - 1) {
      const next = vertices[i + 1]!;
      if (hasYi(next)) {
        const d1 = cur.yi - prev.yi;
        const d2 = next.yi - cur.yi;
        if (Math.sign(d1) === Math.sign(d2) && d1 !== 0) continue;
      }
    }
    out.push(cur);
  }
  return out;
}
