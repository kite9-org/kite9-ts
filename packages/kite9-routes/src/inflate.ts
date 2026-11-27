/** Insert used routing lanes into the grid and remap placements / routes. */

import {
  isHorizontalDirection,
  type GridLayout,
  type GridVertex,
  type LayoutData,
  type LayoutPlacement,
  type PortOrHubLayoutPlacement,
  type RectangularConnectedLayoutPlacement,
  type RouteLayout,
} from "@kite9/model";
import type { RouteStep } from "./routing/ssp.js";
import type { HubTerminal, TrackGraph } from "./track-graph.js";

/**
 * Minimum inserted routing-lane width (px). Track is drawn at the lane centre,
 * so clearance from each neighbouring content-cell edge is ~half of this.
 */
export const DEFAULT_LANE_PX = 40;

function isRect(
  p: LayoutPlacement,
): p is RectangularConnectedLayoutPlacement {
  return "col" in p && "row" in p;
}

export type RoutedConnection = {
  id: string;
  start: HubTerminal;
  end: HubTerminal;
  steps: RouteStep[];
  /** Required lane clearance in px (from connection margin / gutter). */
  lanePx: number;
};

/**
 * Maps pre-inflate seam `after` into the inflated grid.
 * - `*Edge`: grid-edge index for {@link GridVertex} (lane **centre** when used)
 * - `*Px`: pixel position for debug draw (lane **centre** when used, else edge)
 *
 * Used seams insert two half-lanes so the centre is a real grid edge.
 */
export type SeamRemap = {
  vEdge: Map<number, number>;
  hEdge: Map<number, number>;
  vPx: Map<number, number>;
  hPx: Map<number, number>;
};

/** Physical columns/rows inserted per used seam (two halves → centre edge). */
const LANE_TRACKS = 2;

function halfLaneSizes(px: number): [number, number] {
  const a = Math.floor(px / 2);
  return [a, px - a];
}

/** Bump rectangular placements after inserting `count` tracks at `after`. */
function bumpPlacementsAfterInsert(
  placements: LayoutPlacement[],
  axis: "col" | "row",
  after: number,
  count: number,
): void {
  for (const p of placements) {
    if (!isRect(p)) continue;
    if (axis === "col") {
      if (p.col > after) p.col += count;
      if (p.colEnd != null && p.colEnd > after) p.colEnd += count;
      if (p.col <= after && (p.colEnd ?? p.col) > after) {
        p.colEnd = (p.colEnd ?? p.col) + count;
      }
    } else {
      if (p.row > after) p.row += count;
      if (p.rowEnd != null && p.rowEnd > after) p.rowEnd += count;
      if (p.row <= after && (p.rowEnd ?? p.row) > after) {
        p.rowEnd = (p.rowEnd ?? p.row) + count;
      }
    }
  }
}

export type InflateResult = {
  layout: LayoutData;
  remap: SeamRemap;
};

function edgeCoords(sizes: readonly number[]): number[] {
  const out = [0];
  let sum = 0;
  for (const s of sizes) {
    sum += s;
    out.push(sum);
  }
  return out;
}

/**
 * Insert used routing lanes into the grid (≥10px or route margin), renumber
 * placements, append hubs, write GridVertex routes.
 */
export function inflateLayout(
  graph: TrackGraph,
  routed: RoutedConnection[],
): InflateResult {
  const layout: LayoutData = JSON.parse(
    JSON.stringify(graph.layout),
  ) as LayoutData;
  const grid = layout.grid;

  const usedV = new Map<number, number>(); // after → lane px
  const usedH = new Map<number, number>();

  for (const t of graph.tracks) {
    if (t.usedBy.size === 0) continue;
    let need = DEFAULT_LANE_PX;
    for (const cid of t.usedBy) {
      const r = routed.find((x) => x.id === cid);
      if (r) need = Math.max(need, r.lanePx);
    }
    // Clear adjacent placement margins so the lane centre sits outside the
    // content box, not flush with a margin-inflated cell edge.
    need = Math.max(need, clearanceForSeam(graph, t.axis, t.after));
    if (t.axis === "v") {
      usedV.set(t.after, Math.max(usedV.get(t.after) ?? 0, need));
    } else {
      usedH.set(t.after, Math.max(usedH.get(t.after) ?? 0, need));
    }
  }

  // Insert high→low so earlier indices stay stable while splicing.
  // Two half-lanes per used seam → centre is a grid edge for {xi}/{yi}.
  const vInserts = [...usedV.entries()].sort((a, b) => b[0] - a[0]);
  for (const [after, px] of vInserts) {
    const [left, right] = halfLaneSizes(px);
    grid.colSizes.splice(after, 0, left, right);
    grid.contentColSizes.splice(after, 0, left, right);
    grid.contentCols += LANE_TRACKS;
    bumpPlacementsAfterInsert(layout.placements, "col", after, LANE_TRACKS);
  }

  const hInserts = [...usedH.entries()].sort((a, b) => b[0] - a[0]);
  for (const [after, px] of hInserts) {
    const [top, bottom] = halfLaneSizes(px);
    grid.rowSizes.splice(after, 0, top, bottom);
    grid.contentRowSizes.splice(after, 0, top, bottom);
    grid.contentRows += LANE_TRACKS;
    bumpPlacementsAfterInsert(layout.placements, "row", after, LANE_TRACKS);
  }

  const remap = buildSeamRemap(
    graph.layout.grid.contentCols,
    graph.layout.grid.contentRows,
    usedV,
    usedH,
    grid,
  );

  const usedHubs = new Map<string, PortOrHubLayoutPlacement>();
  const routes: Record<string, RouteLayout> = {};

  for (const r of routed) {
    for (const hub of [r.start, r.end]) {
      if (usedHubs.has(hub.id)) continue;
      usedHubs.set(hub.id, {
        id: hub.id,
        onId: hub.onId,
        edge: hub.edge,
        along: hub.along,
        type: hub.type,
      });
    }

    // Emit single-axis track targets: push {xi} / {yi} when that axis changes.
    const vertices: GridVertex[] = [];
    let prevXi: number | undefined;
    let prevYi: number | undefined;
    for (const step of r.steps) {
      const xi =
        remap.vEdge.get(step.intersection.v.after) ??
        step.intersection.v.after;
      const yi =
        remap.hEdge.get(step.intersection.h.after) ??
        step.intersection.h.after;
      if (prevXi === undefined && prevYi === undefined) {
        // First corner: record both axes as successive single-axis hits so
        // paint can seed from the hub then reach this intersection.
        vertices.push({ xi });
        vertices.push({ yi });
      } else {
        if (xi !== prevXi) vertices.push({ xi });
        if (yi !== prevYi) vertices.push({ yi });
      }
      prevXi = xi;
      prevYi = yi;
    }
    // Side-adjacent (single intersection): keep only the shared seam when both
    // hubs face the same axis. Mixed edges (e.g. right → up) keep both tracks.
    if (r.steps.length === 1 && vertices.length >= 2) {
      const startH = isHorizontalDirection(r.start.edge);
      const endH = isHorizontalDirection(r.end.edge);
      if (startH && endH) {
        const only = vertices.find((v) => "xi" in v);
        if (only) {
          vertices.length = 0;
          vertices.push(only);
        }
      } else if (!startH && !endH) {
        const only = vertices.find((v) => "yi" in v);
        if (only) {
          vertices.length = 0;
          vertices.push(only);
        }
      }
    }
    routes[r.id] = {
      startId: r.start.id,
      endId: r.end.id,
      route: vertices,
    };
  }

  layout.placements.push(...usedHubs.values());
  layout.routes = routes;
  return { layout, remap };
}

/** Min lane width from facing margins of rects on either side of a seam. */
function clearanceForSeam(
  graph: TrackGraph,
  axis: "h" | "v",
  after: number,
): number {
  let facing = 0;
  for (const r of graph.rects.values()) {
    const c0 = r.col;
    const c1 = r.colEnd ?? r.col;
    const r0 = r.row;
    const r1 = r.rowEnd ?? r.row;
    const m = r.margin;
    if (axis === "v") {
      if (c1 === after) facing = Math.max(facing, m?.right ?? 0);
      if (c0 - 1 === after) facing = Math.max(facing, m?.left ?? 0);
    } else {
      if (r1 === after) facing = Math.max(facing, m?.bottom ?? 0);
      if (r0 - 1 === after) facing = Math.max(facing, m?.top ?? 0);
    }
  }
  // Both sides contribute: track centre needs facing clearance each way.
  return Math.max(DEFAULT_LANE_PX, facing * 2);
}

/**
 * Pre-inflate seam `after` → inflated edge index + draw pixel.
 * Used seams: two half-lanes; edge + pixel = lane **centre**.
 * Unused seams: edge = content boundary; pixel nudged **outward** by
 * half {@link DEFAULT_LANE_PX} so unused debug tracks stay off glyph borders.
 */
function buildSeamRemap(
  originalCols: number,
  originalRows: number,
  usedV: Map<number, number>,
  usedH: Map<number, number>,
  inflated: GridLayout,
): SeamRemap {
  const vSorted = [...usedV.keys()].sort((a, b) => a - b);
  const hSorted = [...usedH.keys()].sort((a, b) => a - b);
  const xs = edgeCoords(inflated.colSizes);
  const ys = edgeCoords(inflated.rowSizes);
  const clear = DEFAULT_LANE_PX / 2;

  const vEdge = new Map<number, number>();
  const vPx = new Map<number, number>();
  for (let after = 0; after <= originalCols; after++) {
    const before = vSorted.filter((a) => a < after).length;
    // Left edge of this seam's slot (or content boundary if unused).
    const leftEdge = after + before * LANE_TRACKS;
    if (usedV.has(after)) {
      const centre = leftEdge + 1;
      vEdge.set(after, centre);
      vPx.set(after, xs[centre] ?? 0);
    } else {
      vEdge.set(after, leftEdge);
      const edgePx =
        xs[Math.max(0, Math.min(leftEdge, xs.length - 1))] ?? 0;
      const outward =
        after === 0 ? -clear : after === originalCols ? clear : -clear;
      vPx.set(after, edgePx + outward);
    }
  }

  const hEdge = new Map<number, number>();
  const hPx = new Map<number, number>();
  for (let after = 0; after <= originalRows; after++) {
    const before = hSorted.filter((a) => a < after).length;
    const topEdge = after + before * LANE_TRACKS;
    if (usedH.has(after)) {
      const centre = topEdge + 1;
      hEdge.set(after, centre);
      hPx.set(after, ys[centre] ?? 0);
    } else {
      hEdge.set(after, topEdge);
      const edgePx =
        ys[Math.max(0, Math.min(topEdge, ys.length - 1))] ?? 0;
      const outward =
        after === 0 ? -clear : after === originalRows ? clear : -clear;
      hPx.set(after, edgePx + outward);
    }
  }

  return { vEdge, hEdge, vPx, hPx };
}

export type { GridLayout };
