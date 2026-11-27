/** H/V routable tracks over a placed grid (RSS-inspired, no CompactionImpl). */

import {
  DiagramElementType,
  Direction,
  type Diagram,
  type DiagramElement,
  type GridLayout,
  type LayoutData,
  type LayoutPlacement,
  type Rectangular,
  type RectangularConnectedLayoutPlacement,
} from "@kite9/model";

export type TrackAxis = "h" | "v";

/** `stub` = short hub→main-track spur ("intersection track"). */
export type TrackKind = "seam" | "inner" | "stub";

/** Continuous run of a track between breaks. */
export type TrackSegment = {
  /** Inclusive start along the perpendicular content index (1-based content). */
  from: number;
  /** Inclusive end along the perpendicular content index. */
  to: number;
};

/**
 * Axis-aligned routing channel.
 * - Vertical track (`axis: "v"`): runs vertically; `after` is the content col
 *   index after which it sits (0 = before col 1, contentCols = after last).
 * - Horizontal track (`axis: "h"`): runs horizontally; `after` is content row.
 * - Stub tracks use `after: -1`; span is carried by junction/hub pixels.
 */
export type Track = {
  id: string;
  axis: TrackAxis;
  kind: TrackKind;
  /** Seam after this 0-based content index (0..contentCols/Rows); `-1` for stubs. */
  after: number;
  containerId?: string;
  segments: TrackSegment[];
  /** Connection ids that used this track. */
  usedBy: Set<string>;
};

export type Intersection = {
  id: string;
  h: Track;
  v: Track;
  /** Neighbours along the horizontal track (ordered by {@link alongKeyH}). */
  alongH: Intersection[];
  /** Neighbours along the vertical track (ordered by {@link alongKeyV}). */
  alongV: Intersection[];
  /** Sort key along a V track (normally `h.after`; fractional for stub T-junctions). */
  alongKeyV: number;
  /** Sort key along an H track (normally `v.after`; fractional for stub T-junctions). */
  alongKeyH: number;
  /** Pre-inflate pixel position. */
  x: number;
  y: number;
};

export type HubTerminal = {
  id: string;
  onId: string;
  edge: Direction;
  along: number;
  type: "percentage";
  /** T-junction where the stub meets the facing main seam. */
  intersection: Intersection;
  /** Short spur from the hub on the content edge to {@link intersection}. */
  stub: Track;
  /** Hub pixel on the content-box edge (pre-inflate). */
  x: number;
  y: number;
};

export type TrackGraph = {
  layout: LayoutData;
  tracks: Track[];
  intersections: Intersection[];
  /** All mid-edge hubs (and their stubs), whether routed or not. */
  hubs: HubTerminal[];
  /** Rectangular placements keyed by id. */
  rects: Map<string, RectangularConnectedLayoutPlacement>;
};

function isRect(
  p: LayoutPlacement,
): p is RectangularConnectedLayoutPlacement {
  return "col" in p && "row" in p;
}

function isRectangular(de: DiagramElement): de is Rectangular {
  return typeof (de as Partial<Rectangular>).getContents === "function";
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

/** Pixel rect of a content cell span (1-based). */
export function cellPixelRect(
  grid: GridLayout,
  p: { col: number; row: number; colEnd?: number; rowEnd?: number },
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

function covers(
  p: RectangularConnectedLayoutPlacement,
  col: number,
  row: number,
): boolean {
  const c0 = p.col;
  const c1 = p.colEnd ?? p.col;
  const r0 = p.row;
  const r1 = p.rowEnd ?? p.row;
  return col >= c0 && col <= c1 && row >= r0 && row <= r1;
}

/**
 * Break a full-span segment wherever it coincides with a container edge
 * (route would run on top of the container border).
 *
 * Perimeter seams (`after` 0 / `afterMax`) stay continuous — hubs and
 * around-the-outside routes need them. Along a non-perimeter container edge,
 * keep indices where a non-container rect abuts the seam (shared glyph/
 * container boundary) so mid-edge hubs still get intersections.
 */
function breakAgainstContainerEdges(
  axis: TrackAxis,
  after: number,
  fullFrom: number,
  fullTo: number,
  rects: Iterable<RectangularConnectedLayoutPlacement>,
  containerIds: Set<string>,
  /** Max seam `after` on this axis (`contentCols` for v, `contentRows` for h). */
  afterMax: number,
): TrackSegment[] {
  if (after === 0 || after === afterMax) {
    return [{ from: fullFrom, to: fullTo }];
  }

  const rectList = [...rects];
  const abuttedByNonContainer = (along: number): boolean => {
    for (const p of rectList) {
      if (containerIds.has(p.id)) continue;
      const c0 = p.col;
      const c1 = p.colEnd ?? p.col;
      const r0 = p.row;
      const r1 = p.rowEnd ?? p.row;
      if (axis === "v") {
        if (along < r0 || along > r1) continue;
        // Glyph right edge or left edge sits on this vertical seam.
        if (after === c1 || after === c0 - 1) return true;
      } else {
        if (along < c0 || along > c1) continue;
        if (after === r1 || after === r0 - 1) return true;
      }
    }
    return false;
  };

  const breaks = new Set<number>();
  for (const r of rectList) {
    if (!containerIds.has(r.id)) continue;
    const c0 = r.col;
    const c1 = r.colEnd ?? r.col;
    const r0 = r.row;
    const r1 = r.rowEnd ?? r.row;
    if (axis === "v") {
      // Vertical track at after=c0-1 (left edge) or after=c1 (right edge)
      if (after === c0 - 1 || after === c1) {
        for (let row = r0; row <= r1; row++) {
          if (!abuttedByNonContainer(row)) breaks.add(row);
        }
      }
    } else if (after === r0 - 1 || after === r1) {
      for (let col = c0; col <= c1; col++) {
        if (!abuttedByNonContainer(col)) breaks.add(col);
      }
    }
  }

  const segments: TrackSegment[] = [];
  let start: number | null = null;
  for (let i = fullFrom; i <= fullTo; i++) {
    if (breaks.has(i)) {
      if (start != null && start <= i - 1) {
        segments.push({ from: start, to: i - 1 });
      }
      start = null;
    } else if (start == null) {
      start = i;
    }
  }
  if (start != null) segments.push({ from: start, to: fullTo });
  return segments;
}

function segmentCovers(seg: TrackSegment, index: number): boolean {
  return index >= seg.from && index <= seg.to;
}

function trackCoversAlong(t: Track, index: number): boolean {
  return t.segments.some((s) => segmentCovers(s, index));
}

function collectContainerIds(diagram: Diagram): Set<string> {
  const out = new Set<string>();
  const walk = (r: Rectangular) => {
    for (const c of r.getContents()) {
      if (!isRectangular(c)) continue;
      if (c.getType() === DiagramElementType.CONNECTED_RECTANGULAR) {
        // Containers typically have a layout and children
        const kids = c.getContents().filter(isRectangular);
        if (kids.length > 0 && c.getLayout() != null) {
          out.add(c.getID());
        }
      }
      walk(c);
    }
  };
  walk(diagram);
  return out;
}

/** Build seam + inner-circuit tracks and their intersections. */
export function buildTrackGraph(
  diagram: Diagram,
  layout: LayoutData,
): TrackGraph {
  const rects = new Map<string, RectangularConnectedLayoutPlacement>();
  for (const p of layout.placements) {
    if (isRect(p)) rects.set(p.id, p);
  }

  const { contentCols, contentRows } = layout.grid;
  const containerIds = collectContainerIds(diagram);
  const tracks: Track[] = [];

  // Vertical seams: after 0..contentCols (between / outside content cols).
  // Keep tracks even when segments are empty (fully broken on container
  // borders) so compaction can still draw every row/column seam.
  for (let after = 0; after <= contentCols; after++) {
    const segments = breakAgainstContainerEdges(
      "v",
      after,
      1,
      contentRows,
      rects.values(),
      containerIds,
      contentCols,
    );
    tracks.push({
      id: `v-seam-${after}`,
      axis: "v",
      kind: "seam",
      after,
      segments,
      usedBy: new Set(),
    });
  }

  // Horizontal seams: after 0..contentRows → contentRows+1 tracks
  for (let after = 0; after <= contentRows; after++) {
    const segments = breakAgainstContainerEdges(
      "h",
      after,
      1,
      contentCols,
      rects.values(),
      containerIds,
      contentRows,
    );
    tracks.push({
      id: `h-seam-${after}`,
      axis: "h",
      kind: "seam",
      after,
      segments,
      usedBy: new Set(),
    });
  }

  // Inner circuits for containers: tracks halfway through padding chrome.
  // Represented as seams just inside the container's content span.
  for (const id of containerIds) {
    const r = rects.get(id);
    if (!r) continue;
    const c0 = r.col;
    const c1 = r.colEnd ?? r.col;
    const r0 = r.row;
    const r1 = r.rowEnd ?? r.row;
    // Inner vertical: after left content pad column and before right
    if (c1 > c0) {
      const leftInner = c0; // after first content col of container (= inside left)
      const rightInner = c1 - 1;
      for (const after of new Set([leftInner, rightInner])) {
        tracks.push({
          id: `v-inner-${id}-${after}`,
          axis: "v",
          kind: "inner",
          after,
          containerId: id,
          segments: [{ from: r0, to: r1 }],
          usedBy: new Set(),
        });
      }
    }
    if (r1 > r0) {
      const topInner = r0;
      const bottomInner = r1 - 1;
      for (const after of new Set([topInner, bottomInner])) {
        tracks.push({
          id: `h-inner-${id}-${after}`,
          axis: "h",
          kind: "inner",
          after,
          containerId: id,
          segments: [{ from: c0, to: c1 }],
          usedBy: new Set(),
        });
      }
    }
  }

  const xs = edgeCoords(layout.grid.colSizes);
  const ys = edgeCoords(layout.grid.rowSizes);

  const hTracks = tracks.filter((t) => t.axis === "h");
  const vTracks = tracks.filter((t) => t.axis === "v");
  const intersections: Intersection[] = [];

  for (const h of hTracks) {
    for (const v of vTracks) {
      // Intersection exists if h covers v.after (as a content-col index) and
      // v covers h.after (as a content-row index). Seam `after` maps to the
      // content index on the "along" side as after (for after>=1) or 1 (after=0).
      const alongHIndex = v.after === 0 ? 1 : Math.min(v.after, contentCols);
      const alongVIndex = h.after === 0 ? 1 : Math.min(h.after, contentRows);
      if (!trackCoversAlong(h, alongHIndex)) continue;
      if (!trackCoversAlong(v, alongVIndex)) continue;
      intersections.push({
        id: `${h.id}|${v.id}`,
        h,
        v,
        alongH: [],
        alongV: [],
        alongKeyV: h.after,
        alongKeyH: v.after,
        x: xs[v.after] ?? 0,
        y: ys[h.after] ?? 0,
      });
    }
  }

  wireIntersectionNeighbours(intersections);

  const graph: TrackGraph = {
    layout,
    tracks,
    intersections,
    hubs: [],
    rects,
  };
  attachAllHubs(graph);
  return graph;
}

/** Clear and rewire alongH / alongV neighbour lists from sort keys. */
export function wireIntersectionNeighbours(
  intersections: Intersection[],
): void {
  for (const i of intersections) {
    i.alongH.length = 0;
    i.alongV.length = 0;
  }
  const byH = new Map<Track, Intersection[]>();
  const byV = new Map<Track, Intersection[]>();
  for (const i of intersections) {
    let hh = byH.get(i.h);
    if (!hh) {
      hh = [];
      byH.set(i.h, hh);
    }
    hh.push(i);
    let vv = byV.get(i.v);
    if (!vv) {
      vv = [];
      byV.set(i.v, vv);
    }
    vv.push(i);
  }
  for (const onH of byH.values()) {
    onH.sort((a, b) => a.alongKeyH - b.alongKeyH);
    for (let i = 0; i < onH.length; i++) {
      const cur = onH[i]!;
      if (i > 0) cur.alongH.push(onH[i - 1]!);
      if (i < onH.length - 1) cur.alongH.push(onH[i + 1]!);
    }
  }
  for (const onV of byV.values()) {
    onV.sort((a, b) => a.alongKeyV - b.alongKeyV);
    for (let i = 0; i < onV.length; i++) {
      const cur = onV[i]!;
      if (i > 0) cur.alongV.push(onV[i - 1]!);
      if (i < onV.length - 1) cur.alongV.push(onV[i + 1]!);
    }
  }
}

/** Hub id for a mid-edge terminal on a rectangular. */
export function hubId(onId: string, edge: Direction): string {
  return `${onId}__hub__${edge}`;
}

/** Content box (cell inset by margin) in pre-inflate pixels. */
function contentBoxPx(
  grid: GridLayout,
  rect: RectangularConnectedLayoutPlacement,
): { x: number; y: number; w: number; h: number } {
  const full = cellPixelRect(grid, rect);
  const m = rect.margin;
  const left = Math.max(0, m?.left ?? 0);
  const right = Math.max(0, m?.right ?? 0);
  const top = Math.max(0, m?.top ?? 0);
  const bottom = Math.max(0, m?.bottom ?? 0);
  return {
    x: full.x + left,
    y: full.y + top,
    w: Math.max(0, full.w - left - right),
    h: Math.max(0, full.h - top - bottom),
  };
}

function hubPointOnBox(
  box: { x: number; y: number; w: number; h: number },
  edge: Direction,
  along: number,
): { x: number; y: number } {
  const t = Math.min(1, Math.max(0, along / 100));
  switch (edge) {
    case Direction.LEFT:
      return { x: box.x, y: box.y + box.h * t };
    case Direction.RIGHT:
      return { x: box.x + box.w, y: box.y + box.h * t };
    case Direction.UP:
      return { x: box.x + box.w * t, y: box.y };
    case Direction.DOWN:
      return { x: box.x + box.w * t, y: box.y + box.h };
    default:
      return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }
}

/**
 * Build a hub with a stub spur to the facing main seam (T-junction).
 * Returns null when the facing seam track is missing.
 */
export function createHub(
  graph: TrackGraph,
  rect: RectangularConnectedLayoutPlacement,
  edge: Direction,
  along: number = 50,
  id?: string,
): HubTerminal | null {
  const c0 = rect.col;
  const c1 = rect.colEnd ?? rect.col;
  const r0 = rect.row;
  const r1 = rect.rowEnd ?? rect.row;
  const grid = graph.layout.grid;
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const box = contentBoxPx(grid, rect);
  const hubPt = hubPointOnBox(box, edge, along);
  const hubIdent = id ?? hubId(rect.id, edge);

  let facing: Track | undefined;
  let jx: number;
  let jy: number;
  let stubAxis: TrackAxis;
  let alongKeyV: number;
  let alongKeyH: number;

  const fracAlong =
    edge === Direction.LEFT || edge === Direction.RIGHT
      ? r0 - 1 + (along / 100) * (r1 - r0 + 1)
      : c0 - 1 + (along / 100) * (c1 - c0 + 1);

  switch (edge) {
    case Direction.LEFT: {
      facing = graph.tracks.find(
        (t) => t.kind === "seam" && t.axis === "v" && t.after === c0 - 1,
      );
      jx = xs[c0 - 1] ?? 0;
      jy = hubPt.y;
      stubAxis = "h";
      alongKeyV = fracAlong;
      alongKeyH = c0 - 1;
      break;
    }
    case Direction.RIGHT: {
      facing = graph.tracks.find(
        (t) => t.kind === "seam" && t.axis === "v" && t.after === c1,
      );
      jx = xs[c1] ?? 0;
      jy = hubPt.y;
      stubAxis = "h";
      alongKeyV = fracAlong;
      alongKeyH = c1;
      break;
    }
    case Direction.UP: {
      facing = graph.tracks.find(
        (t) => t.kind === "seam" && t.axis === "h" && t.after === r0 - 1,
      );
      jx = hubPt.x;
      jy = ys[r0 - 1] ?? 0;
      stubAxis = "v";
      alongKeyH = fracAlong;
      alongKeyV = r0 - 1;
      break;
    }
    case Direction.DOWN: {
      facing = graph.tracks.find(
        (t) => t.kind === "seam" && t.axis === "h" && t.after === r1,
      );
      jx = hubPt.x;
      jy = ys[r1] ?? 0;
      stubAxis = "v";
      alongKeyH = fracAlong;
      alongKeyV = r1;
      break;
    }
    default:
      return null;
  }
  if (!facing) return null;

  // Always T-junction at the hub's along position on the facing seam — never
  // snap to a neighbouring H∩V (that makes paint approach along the glyph edge).
  const stub: Track = {
    id: `${hubIdent}__stub`,
    axis: stubAxis,
    kind: "stub",
    after: -1,
    segments: [],
    usedBy: new Set(),
  };

  const hTrack = stubAxis === "h" ? stub : facing;
  const vTrack = stubAxis === "v" ? stub : facing;
  const junction: Intersection = {
    id: `${hubIdent}|junction`,
    h: hTrack,
    v: vTrack,
    alongH: [],
    alongV: [],
    alongKeyV,
    alongKeyH,
    x: jx,
    y: jy,
  };
  graph.tracks.push(stub);
  graph.intersections.push(junction);

  return {
    id: hubIdent,
    onId: rect.id,
    edge,
    along,
    type: "percentage",
    intersection: junction,
    stub,
    x: hubPt.x,
    y: hubPt.y,
  };
}

/** Mid-edge hubs for a rectangular (looks up {@link TrackGraph.hubs}). */
export function hubsOnRectangular(
  graph: TrackGraph,
  rect: RectangularConnectedLayoutPlacement,
): HubTerminal[] {
  return graph.hubs.filter((h) => h.onId === rect.id);
}

/**
 * Create left/right/up/down hubs for every rectangular, with stub spurs to the
 * facing main seams. Rewires neighbour lists so T-junctions sit on the graph.
 */
function attachAllHubs(graph: TrackGraph): void {
  const hubs: HubTerminal[] = [];
  for (const rect of graph.rects.values()) {
    for (const edge of [
      Direction.LEFT,
      Direction.RIGHT,
      Direction.UP,
      Direction.DOWN,
    ] as const) {
      const hub = createHub(graph, rect, edge, 50);
      if (hub) hubs.push(hub);
    }
  }
  graph.hubs = hubs;
  wireIntersectionNeighbours(graph.intersections);
}

export { covers, edgeCoords };
