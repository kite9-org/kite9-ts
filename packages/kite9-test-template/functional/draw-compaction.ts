/**
 * Compaction / track-graph debug PNG for functional artifacts.
 * Draws grid cells, H/V routing tracks, intersections, and routes.
 */

import type {
  GridLayout,
  LayoutData,
  LayoutPlacement,
  Point2D,
  RectangularConnectedLayoutPlacement,
} from "@kite9/model";
import { hubAnchorPoint, resolveRouteToPoints } from "@kite9/ui";

export type DrawTrack = {
  id: string;
  axis: "h" | "v";
  /**
   * Pixel position in inflated layout space (x for v-tracks, y for h-tracks).
   * Prefer this over {@link after} so pre-inflate seams align after lane insert.
   */
  coord: number;
  /**
   * Span along the track (y for v-tracks, x for h-tracks) so the stroke meets
   * its intersection dots instead of running the full grid length.
   */
  alongFrom?: number;
  alongTo?: number;
  /** @deprecated Prefer {@link coord}. */
  after?: number;
  used?: boolean;
  kind?: string;
};

export type DrawIntersection = {
  id: string;
  /** Pixel x/y in inflated layout space. */
  x: number;
  y: number;
  /** @deprecated Prefer {@link x}/{@link y}. */
  hAfter?: number;
  vAfter?: number;
};

export type DrawCompactionInput = {
  layout: LayoutData;
  tracks?: DrawTrack[];
  intersections?: DrawIntersection[];
};

function isRect(
  p: LayoutPlacement,
): p is RectangularConnectedLayoutPlacement {
  return "col" in p && "row" in p;
}

function edgeCoords(sizes: readonly number[]): number[] {
  const out = [0];
  let sum = 0;
  for (const s of sizes) {
    sum += s;
    out.push(sum);
  }
  return out;
}

/** Full content-cell span (includes margin occupancy). */
function cellRect(
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
 * Content box inside the cell — inset by placement margin so routing tracks
 * in neighbouring lanes are not drawn flush against the glyph fill.
 */
function contentRect(
  grid: GridLayout,
  p: RectangularConnectedLayoutPlacement,
): { x: number; y: number; w: number; h: number } {
  const r = cellRect(grid, p);
  const m = p.margin;
  if (!m) return r;
  const left = Math.max(0, m.left);
  const right = Math.max(0, m.right);
  const top = Math.max(0, m.top);
  const bottom = Math.max(0, m.bottom);
  return {
    x: r.x + left,
    y: r.y + top,
    w: Math.max(0, r.w - left - right),
    h: Math.max(0, r.h - top - bottom),
  };
}

/** Seam `after` → pixel coordinate along that axis (edge of content track). */
function seamCoord(sizes: readonly number[], after: number): number {
  const edges = edgeCoords(sizes);
  const i = Math.max(0, Math.min(after, edges.length - 1));
  return edges[i]!;
}

function canvasToPngBase64(canvas: HTMLCanvasElement): string {
  const dataUrl = canvas.toDataURL("image/png");
  return dataUrl.slice(dataUrl.indexOf(",") + 1);
}

/** Six pastel route colours at 30% opacity — cycle by route order. */
export const ROUTE_PASTELS = [
  "rgba(255, 153, 153, 0.3)", // rose
  "rgba(153, 204, 255, 0.3)", // sky
  "rgba(153, 230, 153, 0.3)", // mint
  "rgba(255, 214, 153, 0.3)", // peach
  "rgba(204, 153, 255, 0.3)", // lilac
  "rgba(153, 230, 230, 0.3)", // aqua
] as const;

/** Dotted stroke for all tracks (used and unused). */
const TRACK_DASH = [2, 4] as const;

/**
 * Draw layout cells + optional track graph / routes to a PNG (base64, no data-URL prefix).
 *
 * Terms:
 * - **Track** — dotted H/V channel through the grid
 * - **Route** — 30% opaque pastel polyline (cycles {@link ROUTE_PASTELS})
 */
export function drawTrackGraphPng(input: DrawCompactionInput): string {
  const { layout, tracks = [], intersections = [] } = input;
  const { grid } = layout;
  const scale = 1;
  // Extra pad so outward-nudged outer tracks stay on-canvas.
  const pad = 56;
  const width = grid.colSizes.reduce((a, b) => a + b, 0) * scale;
  const height = grid.rowSizes.reduce((a, b) => a + b, 0) * scale;

  const canvas = document.createElement("canvas");
  canvas.width = Math.max(120, width + pad * 2);
  canvas.height = Math.max(120, height + pad * 2);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("drawTrackGraphPng: no 2d context");

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ox = pad;
  const oy = pad;

  // Content cells only (solid). Dotted strokes are reserved for tracks.
  for (const p of layout.placements) {
    if (!isRect(p)) continue;
    const r = contentRect(grid, p);
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(119,119,119,0.18)";
    ctx.fillRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale);
    ctx.strokeStyle = "rgba(80,80,80,0.55)";
    ctx.lineWidth = 1;
    ctx.strokeRect(ox + r.x * scale, oy + r.y * scale, r.w * scale, r.h * scale);
    ctx.fillStyle = "#333";
    ctx.font = "11px sans-serif";
    ctx.fillText(p.id, ox + r.x * scale + 4, oy + r.y * scale + 14);
  }

  // Tracks — always dotted; clip to alongFrom/alongTo when provided so strokes
  // meet intersection dots (full grid span otherwise).
  for (const t of tracks) {
    const used = t.used === true;
    ctx.strokeStyle = used
      ? t.kind === "stub"
        ? "rgba(40,40,40,0.75)"
        : "rgba(60,60,60,0.65)"
      : t.kind === "stub"
        ? "rgba(90,90,90,0.5)"
        : t.kind === "inner"
          ? "rgba(120,120,120,0.35)"
          : "rgba(120,120,120,0.45)";
    // Stubs drawn slightly heavier so hub→seam spurs read under route pastels.
    ctx.lineWidth = used ? (t.kind === "stub" ? 2.25 : 2) : t.kind === "stub" ? 1.35 : 1.25;
    ctx.setLineDash([...TRACK_DASH]);
    ctx.beginPath();
    if (t.axis === "v") {
      const x =
        ox +
        (t.coord ?? seamCoord(grid.colSizes, t.after ?? 0)) * scale;
      const y0 =
        t.alongFrom != null ? oy + t.alongFrom * scale : oy;
      const y1 =
        t.alongTo != null ? oy + t.alongTo * scale : oy + height;
      ctx.moveTo(x, y0);
      ctx.lineTo(x, y1);
    } else {
      const y =
        oy +
        (t.coord ?? seamCoord(grid.rowSizes, t.after ?? 0)) * scale;
      const x0 =
        t.alongFrom != null ? ox + t.alongFrom * scale : ox;
      const x1 =
        t.alongTo != null ? ox + t.alongTo * scale : ox + width;
      ctx.moveTo(x0, y);
      ctx.lineTo(x1, y);
    }
    ctx.stroke();
  }
  ctx.setLineDash([]);

  // Intersections + hubs (hubs are passed in the same list, same glyph).
  for (const ix of intersections) {
    const x =
      ox +
      (ix.x ?? seamCoord(grid.colSizes, ix.vAfter ?? 0)) * scale;
    const y =
      oy +
      (ix.y ?? seamCoord(grid.rowSizes, ix.hAfter ?? 0)) * scale;
    ctx.fillStyle = "rgba(0,0,0,0.45)";
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  const placementMap: Record<string, LayoutPlacement> = {};
  for (const p of layout.placements) placementMap[p.id] = p;

  // Routes — pastel cycle at 30% opacity
  let routeIndex = 0;
  for (const route of Object.values(layout.routes ?? {})) {
    if (!route.route || route.route.length < 1) continue;
    const start =
      hubAnchorPoint(grid, placementMap, route.startId) ?? { x: 0, y: 0 };
    const end =
      hubAnchorPoint(grid, placementMap, route.endId) ?? { ...start };
    const startPl = placementMap[route.startId];
    const endPl = placementMap[route.endId];
    const pts: Point2D[] = resolveRouteToPoints(
      grid,
      route.route,
      start,
      end,
      {
        startEdge:
          startPl && "edge" in startPl ? startPl.edge : undefined,
        endEdge: endPl && "edge" in endPl ? endPl.edge : undefined,
      },
    );
    if (pts.length < 2) continue;
    ctx.strokeStyle = ROUTE_PASTELS[routeIndex % ROUTE_PASTELS.length]!;
    routeIndex += 1;
    ctx.lineWidth = 6;
    ctx.lineCap = "butt";
    ctx.lineJoin = "miter";
    ctx.miterLimit = 2;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(ox + pts[0]!.x * scale, oy + pts[0]!.y * scale);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(ox + pts[i]!.x * scale, oy + pts[i]!.y * scale);
    }
    ctx.stroke();
  }

  return canvasToPngBase64(canvas);
}
