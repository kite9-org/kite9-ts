/** Convert arranged RI positions/sizes into serializable {@link LayoutData}. */

import type {
  Connection,
  Diagram,
  DiagramElement,
  GridLayout,
  LayoutData,
  LayoutPlacement,
  Point2D,
  Rectangular,
  RouteLayout,
  Size,
} from "@kite9/model";
import { DiagramElementType, Direction } from "@kite9/model";
import {
  contentColSpan,
  contentRowSpan,
  edgeCoords,
} from "@kite9/ui";

const DEFAULT_GUTTER = 16;
const DEFAULT_MIN = 40;
const BAND_EPS = 1;

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
}

function isConnectedRectangular(de: DiagramElement): boolean {
  return de.getType() === DiagramElementType.CONNECTED_RECTANGULAR;
}

function isConnection(de: DiagramElement): de is Connection {
  return de.getType() === DiagramElementType.CONNECTION;
}

/** Direct connected-rectangular children of the diagram (grid participants). */
function topLevelConnecteds(diagram: Diagram): Rectangular[] {
  return diagram
    .getContents()
    .filter((c): c is Rectangular => isRectangular(c) && isConnectedRectangular(c));
}

function sizeOf(r: Rectangular): Size {
  const s = r.getRenderingInformation().size;
  if (!s) return { w: DEFAULT_MIN, h: DEFAULT_MIN };
  return { w: Math.max(0, s.width()), h: Math.max(0, s.height()) };
}

function positionOf(r: Rectangular): { x: number; y: number } {
  const p = r.getRenderingInformation().position;
  if (!p) return { x: 0, y: 0 };
  return { x: p.x(), y: p.y() };
}

function hostOf(r: Rectangular): HTMLElement | null {
  const e = r as { el?: unknown; host?: unknown };
  const h = e.el ?? e.host;
  return h instanceof HTMLElement ? h : null;
}

/** Parse an authored (non-`auto`) length; percentages resolve via used style. */
function authoredCssPx(
  el: HTMLElement,
  prop: "width" | "height",
): number | undefined {
  const specified = el.style.getPropertyValue(prop).trim();
  if (!specified || specified === "auto") return undefined;
  if (specified.endsWith("px")) {
    const n = parseFloat(specified);
    return Number.isFinite(n) ? n : undefined;
  }
  const used = parseFloat(getComputedStyle(el).getPropertyValue(prop));
  return Number.isFinite(used) ? used : undefined;
}

/**
 * Placement `size` only when the host authors CSS `width`/`height`.
 * Content-sized (minimize) elements omit it — track sizes carry the measure.
 */
function authoredCssSize(r: Rectangular): Size | undefined {
  const host = hostOf(r);
  if (!host) return undefined;
  const w = authoredCssPx(host, "width");
  const h = authoredCssPx(host, "height");
  if (w === undefined && h === undefined) return undefined;
  const measured = sizeOf(r);
  return { w: w ?? measured.w, h: h ?? measured.h };
}

/** Cluster sorted coordinates into bands (tolerance {@link BAND_EPS}). */
function bandValues(values: number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const bands: number[] = [];
  for (const v of sorted) {
    const last = bands[bands.length - 1];
    if (last === undefined || Math.abs(v - last) > BAND_EPS) bands.push(v);
  }
  return bands;
}

function bandIndex(bands: number[], v: number): number {
  let best = 0;
  let bestDist = Infinity;
  for (let i = 0; i < bands.length; i++) {
    const d = Math.abs(bands[i]! - v);
    if (d < bestDist) {
      bestDist = d;
      best = i;
    }
  }
  return best;
}

/** Content track size from RI — do not inflate with DEFAULT_MIN (that is for resize mins). */
function ceilPx(n: number): number {
  return Math.max(1, Math.ceil(n));
}

/**
 * Connections live on the diagram registry (`allConnections`), not under
 * rectangular `getContents()` (ADL links are siblings of glyphs/arrows).
 */
function collectConnections(diagram: Diagram): Connection[] {
  const adapter = diagram as Diagram & { allConnections?: Connection[] };
  if (Array.isArray(adapter.allConnections)) {
    return [...adapter.allConnections];
  }
  const out: Connection[] = [];
  const walk = (r: Rectangular) => {
    for (const c of r.getContents()) {
      if (isConnection(c)) out.push(c);
      if (isRectangular(c)) walk(c);
    }
  };
  walk(diagram);
  return out;
}

function routePoints(c: Connection): Point2D[] {
  const rri = c.getRenderingInformation();
  const pts = rri.routePositions;
  if (!pts?.length) return [];
  return pts.map((p) => ({ x: p.x(), y: p.y() }));
}

type CellPlace = Extract<LayoutPlacement, { col: number; row: number }>;

function isCellPlace(p: LayoutPlacement | undefined): p is CellPlace {
  return !!p && "col" in p && "row" in p;
}

type Box = { x: number; y: number; w: number; h: number };

function gridCellBox(grid: GridLayout, p: CellPlace): Box {
  const cs = contentColSpan(grid, p.col);
  const rs = contentRowSpan(grid, p.row);
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const x0 = xs[cs.start]!;
  const y0 = ys[rs.start]!;
  return {
    x: x0,
    y: y0,
    w: xs[cs.start + cs.count]! - x0,
    h: ys[rs.start + rs.count]! - y0,
  };
}

function riBox(el: Rectangular): Box {
  const p = positionOf(el);
  const s = sizeOf(el);
  return { x: p.x, y: p.y, w: s.w, h: s.h };
}

function clamp01(t: number): number {
  if (t < 0) return 0;
  if (t > 1) return 1;
  return t;
}

/**
 * Map one axis of a compaction-space route point into grid space.
 *
 * - Inside an endpoint box → fractional position within that cell.
 * - Between non-overlapping boxes → interpolate the facing gutter.
 * - Outside both on a shared row/col (detour around siblings) → offset from
 *   the nearest cell edge into the pad/channel (do NOT collapse to mid-cell).
 */
function mapRouteAxisToGrid(
  coord: number,
  fromRi0: number,
  fromRi1: number,
  toRi0: number,
  toRi1: number,
  fromGrid0: number,
  fromGrid1: number,
  toGrid0: number,
  toGrid1: number,
): number {
  const fromMid = (fromRi0 + fromRi1) / 2;
  const toMid = (toRi0 + toRi1) / 2;
  const primaryIsFrom = Math.abs(coord - fromMid) <= Math.abs(coord - toMid);
  const p0 = primaryIsFrom ? fromRi0 : toRi0;
  const p1 = primaryIsFrom ? fromRi1 : toRi1;
  const pGrid0 = primaryIsFrom ? fromGrid0 : toGrid0;
  const pGrid1 = primaryIsFrom ? fromGrid1 : toGrid1;
  const s0 = primaryIsFrom ? toRi0 : fromRi0;
  const s1 = primaryIsFrom ? toRi1 : fromRi1;
  const sGrid0 = primaryIsFrom ? toGrid0 : fromGrid0;
  const sGrid1 = primaryIsFrom ? toGrid1 : fromGrid1;
  const pSpan = p1 - p0;
  const sSpan = s1 - s0;
  const pGridSpan = pGrid1 - pGrid0;
  const sGridSpan = sGrid1 - sGrid0;

  if (coord >= p0 && coord <= p1) {
    return pGrid0 + clamp01(pSpan > 0 ? (coord - p0) / pSpan : 0.5) * pGridSpan;
  }
  if (coord >= s0 && coord <= s1) {
    return sGrid0 + clamp01(sSpan > 0 ? (coord - s0) / sSpan : 0.5) * sGridSpan;
  }

  // Outside both — prefer inter-cell gutter when boxes are separated on this axis.
  const first1 = fromRi0 <= toRi0 ? fromRi1 : toRi1;
  const second0 = fromRi0 <= toRi0 ? toRi0 : fromRi0;
  const firstGrid1 = fromRi0 <= toRi0 ? fromGrid1 : toGrid1;
  const secondGrid0 = fromRi0 <= toRi0 ? toGrid0 : fromGrid0;
  const gap0 = first1;
  const gap1 = second0;
  if (gap1 > gap0) {
    const t = clamp01((coord - gap0) / (gap1 - gap0));
    return firstGrid1 + t * (secondGrid0 - firstGrid1);
  }

  // Same row/col detour: offset past the nearest endpoint cell edge.
  const nearestIsFrom =
    Math.abs(coord - fromMid) <= Math.abs(coord - toMid);
  const n0 = nearestIsFrom ? fromRi0 : toRi0;
  const n1 = nearestIsFrom ? fromRi1 : toRi1;
  const nGrid0 = nearestIsFrom ? fromGrid0 : toGrid0;
  const nGrid1 = nearestIsFrom ? fromGrid1 : toGrid1;
  const nSpan = n1 - n0;
  const nGridSpan = nGrid1 - nGrid0;
  const scale = nSpan > 0 ? nGridSpan / nSpan : 1;
  if (coord < n0) return nGrid0 - (n0 - coord) * scale;
  if (coord > n1) return nGrid1 + (coord - n1) * scale;
  return nGrid0 + nGridSpan / 2;
}

/**
 * Map a compaction-space route point into adjustable-grid space.
 *
 * Terminals on a connected RI edge map onto that connected's content-cell edge
 * (glyph boundary once the host fills the cell). Points outside both boxes map
 * through gutters / pads — the buffer/intersection lattice between cells
 * (Java orbit buffers between rect-edge slideables).
 */
function mapRoutePointToGrid(
  p: Point2D,
  fromRi: Box,
  toRi: Box,
  fromGrid: Box,
  toGrid: Box,
): Point2D {
  return {
    x: mapRouteAxisToGrid(
      p.x,
      fromRi.x,
      fromRi.x + fromRi.w,
      toRi.x,
      toRi.x + toRi.w,
      fromGrid.x,
      fromGrid.x + fromGrid.w,
      toGrid.x,
      toGrid.x + toGrid.w,
    ),
    y: mapRouteAxisToGrid(
      p.y,
      fromRi.y,
      fromRi.y + fromRi.h,
      toRi.y,
      toRi.y + toRi.h,
      fromGrid.y,
      fromGrid.y + fromGrid.h,
      toGrid.y,
      toGrid.y + toGrid.h,
    ),
  };
}

/**
 * Force Manhattan polylines: snap near-axis noise, insert an elbow on true
 * diagonals (remap / terminal-snap can otherwise leave a 2-point diagonal),
 * then drop collinear middles.
 */
function orthogonalizeRoutePoints(points: Point2D[], eps = 1): Point2D[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));

  const snapped: Point2D[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length; i++) {
    const prev = snapped[snapped.length - 1]!;
    const cur = { ...points[i]! };
    const dx = Math.abs(cur.x - prev.x);
    const dy = Math.abs(cur.y - prev.y);
    if (dx <= eps) {
      cur.x = prev.x;
      snapped.push(cur);
    } else if (dy <= eps) {
      cur.y = prev.y;
      snapped.push(cur);
    } else {
      // Diagonal: vertical then horizontal from `prev` (keeps departure axis
      // when leaving a top/bottom glyph edge toward a side-shifted peer).
      snapped.push({ x: prev.x, y: cur.y });
      snapped.push(cur);
    }
  }

  const out: Point2D[] = [snapped[0]!];
  for (let i = 1; i < snapped.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = snapped[i]!;
    const next = snapped[i + 1]!;
    if (cur.x === prev.x && cur.y === prev.y) continue;
    const sameVert =
      cur.x === prev.x &&
      next.x === cur.x &&
      Math.sign(cur.y - prev.y) === Math.sign(next.y - cur.y);
    const sameHoriz =
      cur.y === prev.y &&
      next.y === cur.y &&
      Math.sign(cur.x - prev.x) === Math.sign(next.x - cur.x);
    if (sameVert || sameHoriz) continue;
    out.push(cur);
  }
  const last = snapped[snapped.length - 1]!;
  const tip = out[out.length - 1]!;
  if (last.x !== tip.x || last.y !== tip.y) out.push(last);
  return out;
}

/**
 * After per-box affine remap, restore each RI segment's axis.
 * Horizontal RI runs share one mapped y; vertical runs share one mapped x.
 * Without this, mapping endpoints through different glyph boxes shears a
 * compaction L into a painted S-bend (FourPointCross A1→C).
 */
function straightenMappedToRiTopology(
  riPoints: Point2D[],
  mapped: Point2D[],
  eps = 1.5,
): Point2D[] {
  if (mapped.length !== riPoints.length || mapped.length < 2) {
    return mapped.map((p) => ({ ...p }));
  }
  const out = mapped.map((p) => ({ ...p }));

  let i = 0;
  while (i < riPoints.length) {
    let j = i;
    while (
      j + 1 < riPoints.length &&
      Math.abs(riPoints[j + 1]!.y - riPoints[i]!.y) <= eps
    ) {
      j++;
    }
    if (j > i) {
      let sum = 0;
      for (let k = i; k <= j; k++) sum += out[k]!.y;
      const y = sum / (j - i + 1);
      for (let k = i; k <= j; k++) out[k]!.y = y;
    }
    i = Math.max(j, i + 1);
  }

  i = 0;
  while (i < riPoints.length) {
    let j = i;
    while (
      j + 1 < riPoints.length &&
      Math.abs(riPoints[j + 1]!.x - riPoints[i]!.x) <= eps
    ) {
      j++;
    }
    if (j > i) {
      let sum = 0;
      for (let k = i; k <= j; k++) sum += out[k]!.x;
      const x = sum / (j - i + 1);
      for (let k = i; k <= j; k++) out[k]!.x = x;
    }
    i = Math.max(j, i + 1);
  }

  return out;
}

/**
 * True when no other content cell intersects the open rectangle between `a` and
 * `b` along the corridor of their overlap on the perpendicular axis.
 */
function clearCorridor(
  a: Box,
  b: Box,
  axis: "h" | "v",
  placements: LayoutData["placements"],
  grid: GridLayout,
  fromId: string,
  toId: string,
): boolean {
  if (axis === "h") {
    const y0 = Math.max(a.y, b.y);
    const y1 = Math.min(a.y + a.h, b.y + b.h);
    if (y1 <= y0) return false;
    const left = a.x + a.w <= b.x ? a : b;
    const right = a.x + a.w <= b.x ? b : a;
    if (right.x < left.x + left.w - 0.5) return false;
    const x0 = left.x + left.w;
    const x1 = right.x;
    for (const [id, p] of Object.entries(placements)) {
      if (id === fromId || id === toId || !isCellPlace(p)) continue;
      const box = gridCellBox(grid, p);
      if (box.x + box.w <= x0 + 0.5 || box.x >= x1 - 0.5) continue;
      if (Math.max(y0, box.y) < Math.min(y1, box.y + box.h)) return false;
    }
    return true;
  }

  const x0 = Math.max(a.x, b.x);
  const x1 = Math.min(a.x + a.w, b.x + b.w);
  if (x1 <= x0) return false;
  const top = a.y + a.h <= b.y ? a : b;
  const bottom = a.y + a.h <= b.y ? b : a;
  if (bottom.y < top.y + top.h - 0.5) return false;
  const y0 = top.y + top.h;
  const y1 = bottom.y;
  for (const [id, p] of Object.entries(placements)) {
    if (id === fromId || id === toId || !isCellPlace(p)) continue;
    const box = gridCellBox(grid, p);
    if (box.y + box.h <= y0 + 0.5 || box.y >= y1 - 0.5) continue;
    if (Math.max(x0, box.x) < Math.min(x1, box.x + box.w)) return false;
  }
  return true;
}

/**
 * When two cells face each other across a clear gutter corridor, paint a single
 * straight stub on the overlap mid — glyphs fill the cell, so unequal RI mids
 * (A1 41px vs C 91px) must not become an S-bend. Detours around a sibling keep
 * RI topology because the corridor is blocked.
 */
function adjacentBandStraight(
  fromId: string,
  toId: string,
  fromGrid: Box,
  toGrid: Box,
  drawDir: Direction | null | undefined,
  placements: LayoutData["placements"],
  grid: GridLayout,
): Point2D[] | null {
  const horizDir =
    drawDir === Direction.LEFT ||
    drawDir === Direction.RIGHT ||
    drawDir == null;
  const vertDir =
    drawDir === Direction.UP || drawDir === Direction.DOWN || drawDir == null;

  if (
    horizDir &&
    clearCorridor(fromGrid, toGrid, "h", placements, grid, fromId, toId)
  ) {
    const y0 = Math.max(fromGrid.y, toGrid.y);
    const y1 = Math.min(fromGrid.y + fromGrid.h, toGrid.y + toGrid.h);
    const y = (y0 + y1) / 2;
    const fromRight = fromGrid.x + fromGrid.w <= toGrid.x + 0.5;
    return [
      { x: fromRight ? fromGrid.x + fromGrid.w : fromGrid.x, y },
      { x: fromRight ? toGrid.x : toGrid.x + toGrid.w, y },
    ];
  }

  if (
    vertDir &&
    clearCorridor(fromGrid, toGrid, "v", placements, grid, fromId, toId)
  ) {
    const x0 = Math.max(fromGrid.x, toGrid.x);
    const x1 = Math.min(fromGrid.x + fromGrid.w, toGrid.x + toGrid.w);
    const x = (x0 + x1) / 2;
    const fromAbove = fromGrid.y + fromGrid.h <= toGrid.y + 0.5;
    return [
      { x, y: fromAbove ? fromGrid.y + fromGrid.h : fromGrid.y },
      { x, y: fromAbove ? toGrid.y : toGrid.y + toGrid.h },
    ];
  }

  return null;
}

/**
 * Remap compaction RI polylines into adjustable-grid pixel space.
 */
function routesOnGrid(
  diagram: Diagram,
  grid: GridLayout,
  placements: LayoutData["placements"],
): Record<string, RouteLayout> {
  const routes: Record<string, RouteLayout> = {};

  for (const c of collectConnections(diagram)) {
    const fromEl = c.getFrom();
    const toEl = c.getTo();
    const fromP = placements[fromEl.getID()];
    const toP = placements[toEl.getID()];
    if (
      !isRectangular(fromEl) ||
      !isRectangular(toEl) ||
      !isCellPlace(fromP) ||
      !isCellPlace(toP)
    ) {
      continue;
    }

    const points = routePoints(c);
    if (points.length < 2) continue;

    const fromRi = riBox(fromEl);
    const toRi = riBox(toEl);
    const fromGrid = gridCellBox(grid, fromP);
    const toGrid = gridCellBox(grid, toP);

    const bandStraight = adjacentBandStraight(
      fromEl.getID(),
      toEl.getID(),
      fromGrid,
      toGrid,
      c.getDrawDirection?.() ?? null,
      placements,
      grid,
    );
    if (bandStraight) {
      routes[c.getID()] = { points: bandStraight, labels: {} };
      continue;
    }

    const mapped = straightenMappedToRiTopology(
      points,
      points.map((p) =>
        mapRoutePointToGrid(p, fromRi, toRi, fromGrid, toGrid),
      ),
    );
    const attached = attachTerminalsToCellEdges(mapped, fromGrid, toGrid);
    routes[c.getID()] = {
      points: orthogonalizeRoutePoints(
        straightenMappedToRiTopology(
          attached.length === points.length ? points : attached,
          attached,
        ),
      ),
      labels: {},
    };
  }
  return routes;
}

/**
 * Snap route terminals onto the from/to content-cell border (glyph boundary
 * once the host fills the cell). Side follows the first/last segment so the
 * stub leaves via the intersection toward the buffer gutter — Java rect-edge
 * → orbit slideable. May leave a diagonal until {@link orthogonalizeRoutePoints}.
 */
function attachTerminalsToCellEdges(
  points: Point2D[],
  fromGrid: Box,
  toGrid: Box,
): Point2D[] {
  if (points.length < 2) return points;
  const next = points.map((p) => ({ ...p }));
  next[0] = projectOntoBoxEdge(next[0]!, next[1]!, fromGrid);
  const last = next.length - 1;
  next[last] = projectOntoBoxEdge(next[last]!, next[last - 1]!, toGrid);
  return next;
}

function projectOntoBoxEdge(
  p: Point2D,
  toward: Point2D,
  box: Box,
): Point2D {
  const dx = toward.x - p.x;
  const dy = toward.y - p.y;
  const clamp = (n: number, lo: number, hi: number) =>
    Math.min(hi, Math.max(lo, n));
  if (Math.abs(dy) >= Math.abs(dx)) {
    const y = dy < 0 ? box.y : box.y + box.h;
    return { x: clamp(p.x, box.x, box.x + box.w), y };
  }
  const x = dx < 0 ? box.x : box.x + box.w;
  return { x, y: clamp(p.y, box.y, box.y + box.h) };
}

/**
 * Build {@link LayoutData} from post-compaction rendering information.
 * Top-level connected rectangulars become grid placements (nested kids stay
 * in light-DOM under their container). Routes are RI polylines remapped to grid pixels.
 */
export function toLayoutData(diagram: Diagram): LayoutData {
  const tops = topLevelConnecteds(diagram);
  const diagSize = sizeOf(diagram);
  const diagPos = positionOf(diagram);

  if (tops.length === 0) {
    const w = Math.max(DEFAULT_MIN, diagSize.w);
    const h = Math.max(DEFAULT_MIN, diagSize.h);
    const grid: GridLayout = {
      contentCols: 1,
      contentRows: 1,
      gutter: DEFAULT_GUTTER,
      minCol: DEFAULT_MIN,
      minRow: DEFAULT_MIN,
      contentColSizes: [w],
      contentRowSizes: [h],
      colSizes: [
        DEFAULT_GUTTER,
        DEFAULT_GUTTER,
        w,
        DEFAULT_GUTTER,
        DEFAULT_GUTTER,
      ],
      rowSizes: [
        DEFAULT_GUTTER,
        DEFAULT_GUTTER,
        h,
        DEFAULT_GUTTER,
        DEFAULT_GUTTER,
      ],
    };
    return {
      grid,
      placements: {},
      routes: routesOnGrid(diagram, grid, {}),
    };
  }

  const positions = tops.map((t) => ({
    el: t,
    pos: positionOf(t),
    sz: sizeOf(t),
  }));

  const xBands = bandValues(positions.map((p) => p.pos.x));
  const yBands = bandValues(positions.map((p) => p.pos.y));
  let contentCols = xBands.length;
  const contentRows = yBands.length;

  const contentColSizes = Array.from({ length: contentCols }, () => DEFAULT_MIN);
  const contentRowSizes = Array.from({ length: contentRows }, () => DEFAULT_MIN);
  const placements: LayoutData["placements"] = {};

  // Assign cells from position bands; resolve collisions so each id is unique.
  type Cell = { el: Rectangular; sz: Size; col: number; row: number };
  const cells: Cell[] = positions.map(({ el, pos, sz }) => ({
    el,
    sz,
    col: bandIndex(xBands, pos.x) + 1,
    row: bandIndex(yBands, pos.y) + 1,
  }));
  const occupied = new Set<string>();
  for (const cell of cells) {
    let { col, row } = cell;
    let key = `${col},${row}`;
    while (occupied.has(key)) {
      col += 1;
      if (col > contentCols) {
        contentCols = col;
        contentColSizes.push(DEFAULT_MIN);
      }
      key = `${col},${row}`;
    }
    occupied.add(key);
    cell.col = col;
    cell.row = row;
    contentColSizes[col - 1] = Math.max(
      contentColSizes[col - 1] ?? DEFAULT_MIN,
      ceilPx(cell.sz.w),
    );
    contentRowSizes[row - 1] = Math.max(
      contentRowSizes[row - 1]!,
      ceilPx(cell.sz.h),
    );
    const cssSize = authoredCssSize(cell.el);
    placements[cell.el.getID()] = {
      col,
      row,
      ...(cssSize ? { size: cssSize } : {}),
    };
  }

  // Outer pads from diagram bounds vs content bbox (glyphs + route detours).
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const { pos, sz } of positions) {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
    maxX = Math.max(maxX, pos.x + sz.w);
    maxY = Math.max(maxY, pos.y + sz.h);
  }
  const glyphMinX = minX;
  const glyphMinY = minY;
  const glyphMaxX = maxX;
  const glyphMaxY = maxY;
  for (const c of collectConnections(diagram)) {
    for (const p of routePoints(c)) {
      minX = Math.min(minX, p.x);
      minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x);
      maxY = Math.max(maxY, p.y);
    }
  }

  const padLeft = Math.max(0, Math.round(minX - diagPos.x));
  const padTop = Math.max(0, Math.round(minY - diagPos.y));
  const padRight = Math.max(
    0,
    Math.round(diagPos.x + diagSize.w - maxX),
  );
  const padBottom = Math.max(
    0,
    Math.round(diagPos.y + diagSize.h - maxY),
  );
  // Routes may extend past the diagram RI bbox — still reserve pad for detours.
  const detourL = Math.max(0, Math.round(glyphMinX - minX));
  const detourT = Math.max(0, Math.round(glyphMinY - minY));
  const detourR = Math.max(0, Math.round(maxX - glyphMaxX));
  const detourB = Math.max(0, Math.round(maxY - glyphMaxY));

  const outerL = Math.max(DEFAULT_GUTTER, padLeft || DEFAULT_GUTTER, detourL);
  const outerR = Math.max(DEFAULT_GUTTER, padRight || DEFAULT_GUTTER, detourR);
  const outerT = Math.max(DEFAULT_GUTTER, padTop || DEFAULT_GUTTER, detourT);
  const outerB = Math.max(DEFAULT_GUTTER, padBottom || DEFAULT_GUTTER, detourB);

  const colSizes: number[] = [outerL, outerL];
  for (let c = 0; c < contentCols; c++) {
    if (c > 0) colSizes.push(DEFAULT_GUTTER);
    colSizes.push(contentColSizes[c]!);
  }
  colSizes.push(outerR, outerR);

  const rowSizes: number[] = [outerT, outerT];
  for (let r = 0; r < contentRows; r++) {
    if (r > 0) rowSizes.push(DEFAULT_GUTTER);
    rowSizes.push(contentRowSizes[r]!);
  }
  rowSizes.push(outerB, outerB);

  const grid: GridLayout = {
    contentCols,
    contentRows,
    gutter: DEFAULT_GUTTER,
    minCol: DEFAULT_MIN,
    minRow: DEFAULT_MIN,
    contentColSizes,
    contentRowSizes,
    colSizes,
    rowSizes,
  };

  return {
    grid,
    placements,
    routes: routesOnGrid(diagram, grid, placements),
  };
}
