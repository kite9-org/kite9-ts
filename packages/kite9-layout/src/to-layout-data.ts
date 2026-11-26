/** Convert arranged RI positions/sizes into serializable {@link LayoutData}. */

import type {
  Connection,
  Diagram,
  DiagramElement,
  LayoutData,
  Point2D,
  Rectangular,
  Size,
} from "@kite9/model";
import { DiagramElementType } from "@kite9/model";

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
  const rri = c.getRenderingInformation() as {
    routePositions?: { x(): number; y(): number }[];
  };
  const pts = rri.routePositions;
  if (!pts?.length) return [];
  return pts.map((p) => ({ x: p.x(), y: p.y() }));
}

/**
 * Build {@link LayoutData} from post-compaction rendering information.
 * Top-level connected rectangulars become grid placements (nested kids stay
 * in light-DOM under their container). Routes come from connection RI.
 */
export function toLayoutData(diagram: Diagram): LayoutData {
  const tops = topLevelConnecteds(diagram);
  const diagSize = sizeOf(diagram);
  const diagPos = positionOf(diagram);

  const routes: LayoutData["routes"] = {};
  for (const c of collectConnections(diagram)) {
    const points = routePoints(c);
    if (points.length) {
      routes[c.getID()] = { points, labels: {} };
    }
  }

  if (tops.length === 0) {
    const w = Math.max(DEFAULT_MIN, diagSize.w);
    const h = Math.max(DEFAULT_MIN, diagSize.h);
    return {
      grid: {
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
      },
      placements: {},
      routes,
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

  return {
    grid: {
      contentCols,
      contentRows,
      gutter: DEFAULT_GUTTER,
      minCol: DEFAULT_MIN,
      minRow: DEFAULT_MIN,
      contentColSizes,
      contentRowSizes,
      colSizes,
      rowSizes,
    },
    placements,
    routes,
  };
}
