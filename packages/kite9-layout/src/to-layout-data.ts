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
import { DiagramElementType } from "@kite9/model";
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

function ceilPx(n: number): number {
  return Math.max(DEFAULT_MIN, Math.ceil(n));
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
 * Map a compaction-space route point into adjustable-grid space using the
 * from/to element boxes (RI → content cell). Mid-glyph slideables land at
 * mid-cell edges instead of the remapped pad/top.
 */
function mapRoutePointToGrid(
  p: Point2D,
  fromRi: Box,
  toRi: Box,
  fromGrid: Box,
  toGrid: Box,
): Point2D {
  const midFrom = {
    x: fromRi.x + fromRi.w / 2,
    y: fromRi.y + fromRi.h / 2,
  };
  const midTo = {
    x: toRi.x + toRi.w / 2,
    y: toRi.y + toRi.h / 2,
  };
  const distFrom =
    (p.x - midFrom.x) ** 2 + (p.y - midFrom.y) ** 2;
  const distTo = (p.x - midTo.x) ** 2 + (p.y - midTo.y) ** 2;
  const primary = distFrom <= distTo ? fromRi : toRi;
  const primaryGrid = distFrom <= distTo ? fromGrid : toGrid;
  const secondary = distFrom <= distTo ? toRi : fromRi;
  const secondaryGrid = distFrom <= distTo ? toGrid : fromGrid;

  const inPrimaryX = p.x >= primary.x && p.x <= primary.x + primary.w;
  const inPrimaryY = p.y >= primary.y && p.y <= primary.y + primary.h;

  let x: number;
  let y: number;
  if (inPrimaryX) {
    x =
      primaryGrid.x +
      clamp01(primary.w > 0 ? (p.x - primary.x) / primary.w : 0.5) *
        primaryGrid.w;
  } else if (p.x >= secondary.x && p.x <= secondary.x + secondary.w) {
    x =
      secondaryGrid.x +
      clamp01(secondary.w > 0 ? (p.x - secondary.x) / secondary.w : 0.5) *
        secondaryGrid.w;
  } else {
    // Gutter / channel between the two cells — interpolate facing edges.
    const leftRi = fromRi.x <= toRi.x ? fromRi : toRi;
    const rightRi = fromRi.x <= toRi.x ? toRi : fromRi;
    const leftGrid = fromRi.x <= toRi.x ? fromGrid : toGrid;
    const rightGrid = fromRi.x <= toRi.x ? toGrid : fromGrid;
    const x0 = leftRi.x + leftRi.w;
    const x1 = rightRi.x;
    const t =
      x1 > x0 ? clamp01((p.x - x0) / (x1 - x0)) : 0.5;
    x = leftGrid.x + leftGrid.w + t * (rightGrid.x - (leftGrid.x + leftGrid.w));
  }

  if (inPrimaryY) {
    y =
      primaryGrid.y +
      clamp01(primary.h > 0 ? (p.y - primary.y) / primary.h : 0.5) *
        primaryGrid.h;
  } else if (p.y >= secondary.y && p.y <= secondary.y + secondary.h) {
    y =
      secondaryGrid.y +
      clamp01(secondary.h > 0 ? (p.y - secondary.y) / secondary.h : 0.5) *
        secondaryGrid.h;
  } else {
    const topRi = fromRi.y <= toRi.y ? fromRi : toRi;
    const bottomRi = fromRi.y <= toRi.y ? toRi : fromRi;
    const topGrid = fromRi.y <= toRi.y ? fromGrid : toGrid;
    const bottomGrid = fromRi.y <= toRi.y ? toGrid : fromGrid;
    const y0 = topRi.y + topRi.h;
    const y1 = bottomRi.y;
    const t =
      y1 > y0 ? clamp01((p.y - y0) / (y1 - y0)) : 0.5;
    y =
      topGrid.y +
      topGrid.h +
      t * (bottomGrid.y - (topGrid.y + topGrid.h));
  }

  return { x, y };
}

/**
 * Snap near-equal coords and drop collinear middles so RI→grid remap noise
 * does not create micro-jogs (which paint as Z-bends under corner radius).
 */
function orthogonalizeRoutePoints(points: Point2D[], eps = 1): Point2D[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const snapped: Point2D[] = [{ ...points[0]! }];
  for (let i = 1; i < points.length; i++) {
    const prev = snapped[snapped.length - 1]!;
    const cur = { ...points[i]! };
    if (Math.abs(cur.x - prev.x) <= eps) cur.x = prev.x;
    else if (Math.abs(cur.y - prev.y) <= eps) cur.y = prev.y;
    snapped.push(cur);
  }

  const out: Point2D[] = [snapped[0]!];
  for (let i = 1; i < snapped.length - 1; i++) {
    const prev = out[out.length - 1]!;
    const cur = snapped[i]!;
    const next = snapped[i + 1]!;
    if (cur.x === prev.x && cur.y === prev.y) continue;
    const sameVert =
      cur.x === prev.x && next.x === cur.x && Math.sign(cur.y - prev.y) === Math.sign(next.y - cur.y);
    const sameHoriz =
      cur.y === prev.y && next.y === cur.y && Math.sign(cur.x - prev.x) === Math.sign(next.x - cur.x);
    if (sameVert || sameHoriz) continue;
    out.push(cur);
  }
  const last = snapped[snapped.length - 1]!;
  const tip = out[out.length - 1]!;
  if (last.x !== tip.x || last.y !== tip.y) out.push(last);
  return out;
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
    const mapped = points.map((p) =>
      mapRoutePointToGrid(p, fromRi, toRi, fromGrid, toGrid),
    );
    routes[c.getID()] = { points: orthogonalizeRoutePoints(mapped), labels: {} };
  }
  return routes;
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

  // Outer pads from diagram bounds vs content bbox
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

  const outerL = Math.max(DEFAULT_GUTTER, padLeft || DEFAULT_GUTTER);
  const outerR = Math.max(DEFAULT_GUTTER, padRight || DEFAULT_GUTTER);
  const outerT = Math.max(DEFAULT_GUTTER, padTop || DEFAULT_GUTTER);
  const outerB = Math.max(DEFAULT_GUTTER, padBottom || DEFAULT_GUTTER);

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
