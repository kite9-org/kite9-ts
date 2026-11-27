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

export type TrackKind = "seam" | "inner";

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
 */
export type Track = {
  id: string;
  axis: TrackAxis;
  kind: TrackKind;
  /** Seam after this 0-based content index (0..contentCols/Rows). */
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
  /** Neighbours along the horizontal track (ordered by v.after). */
  alongH: Intersection[];
  /** Neighbours along the vertical track (ordered by h.after). */
  alongV: Intersection[];
};

export type HubTerminal = {
  id: string;
  onId: string;
  edge: Direction;
  along: number;
  type: "percentage";
  /** Intersection used as the route terminal for this hub. */
  intersection: Intersection;
};

export type TrackGraph = {
  layout: LayoutData;
  tracks: Track[];
  intersections: Intersection[];
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
 */
function breakAgainstContainerEdges(
  axis: TrackAxis,
  after: number,
  fullFrom: number,
  fullTo: number,
  rects: Iterable<RectangularConnectedLayoutPlacement>,
  containerIds: Set<string>,
): TrackSegment[] {
  const breaks = new Set<number>();
  for (const r of rects) {
    if (!containerIds.has(r.id)) continue;
    const c0 = r.col;
    const c1 = r.colEnd ?? r.col;
    const r0 = r.row;
    const r1 = r.rowEnd ?? r.row;
    if (axis === "v") {
      // Vertical track at after=c0-1 (left edge) or after=c1 (right edge)
      if (after === c0 - 1 || after === c1) {
        // Exclude the rows this container occupies on that edge
        for (let row = r0; row <= r1; row++) breaks.add(row);
      }
    } else {
      if (after === r0 - 1 || after === r1) {
        for (let col = c0; col <= c1; col++) breaks.add(col);
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

  // Vertical seams: after 0..contentCols (between / outside content cols)
  for (let after = 0; after <= contentCols; after++) {
    const segments = breakAgainstContainerEdges(
      "v",
      after,
      1,
      contentRows,
      rects.values(),
      containerIds,
    );
    if (segments.length === 0) continue;
    tracks.push({
      id: `v-seam-${after}`,
      axis: "v",
      kind: "seam",
      after,
      segments,
      usedBy: new Set(),
    });
  }

  // Horizontal seams
  for (let after = 0; after <= contentRows; after++) {
    const segments = breakAgainstContainerEdges(
      "h",
      after,
      1,
      contentCols,
      rects.values(),
      containerIds,
    );
    if (segments.length === 0) continue;
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
      });
    }
  }

  // Wire neighbours along each track
  for (const h of hTracks) {
    const onH = intersections
      .filter((i) => i.h === h)
      .sort((a, b) => a.v.after - b.v.after);
    for (let i = 0; i < onH.length; i++) {
      const cur = onH[i]!;
      if (i > 0) cur.alongH.push(onH[i - 1]!);
      if (i < onH.length - 1) cur.alongH.push(onH[i + 1]!);
    }
  }
  for (const v of vTracks) {
    const onV = intersections
      .filter((i) => i.v === v)
      .sort((a, b) => a.h.after - b.h.after);
    for (let i = 0; i < onV.length; i++) {
      const cur = onV[i]!;
      if (i > 0) cur.alongV.push(onV[i - 1]!);
      if (i < onV.length - 1) cur.alongV.push(onV[i + 1]!);
    }
  }

  return { layout, tracks, intersections, rects };
}

/** Hub id for a mid-edge terminal on a rectangular. */
export function hubId(onId: string, edge: Direction): string {
  return `${onId}__hub__${edge}`;
}

/**
 * Intersections that sit on the given edge of a rectangular placement
 * (for hub terminals at 50%).
 */
export function hubsOnRectangular(
  graph: TrackGraph,
  rect: RectangularConnectedLayoutPlacement,
): HubTerminal[] {
  const c0 = rect.col;
  const c1 = rect.colEnd ?? rect.col;
  const r0 = rect.row;
  const r1 = rect.rowEnd ?? rect.row;
  const midCol = Math.floor((c0 + c1) / 2);
  const midRow = Math.floor((r0 + r1) / 2);

  const find = (
    edge: Direction,
    pred: (i: Intersection) => boolean,
  ): HubTerminal | null => {
    const hit = graph.intersections.find(pred);
    if (!hit) return null;
    return {
      id: hubId(rect.id, edge),
      onId: rect.id,
      edge,
      along: 50,
      type: "percentage",
      intersection: hit,
    };
  };

  const out: HubTerminal[] = [];
  const left = find(
    Direction.LEFT,
    (i) => i.v.after === c0 - 1 && i.h.after >= r0 - 1 && i.h.after <= r1,
  );
  // Prefer intersection whose h track is nearest mid-row
  const leftBest =
    graph.intersections
      .filter(
        (i) =>
          i.v.after === c0 - 1 &&
          trackCoversAlong(i.v, midRow) &&
          trackCoversAlong(i.h, c0),
      )
      .sort(
        (a, b) =>
          Math.abs(a.h.after - (midRow - 1)) -
          Math.abs(b.h.after - (midRow - 1)),
      )[0] ?? left?.intersection;
  if (leftBest) {
    out.push({
      id: hubId(rect.id, Direction.LEFT),
      onId: rect.id,
      edge: Direction.LEFT,
      along: 50,
      type: "percentage",
      intersection: leftBest,
    });
  }

  const rightBest = graph.intersections
    .filter(
      (i) =>
        i.v.after === c1 &&
        trackCoversAlong(i.v, midRow) &&
        trackCoversAlong(i.h, c1),
    )
    .sort(
      (a, b) =>
        Math.abs(a.h.after - (midRow - 1)) -
        Math.abs(b.h.after - (midRow - 1)),
    )[0];
  if (rightBest) {
    out.push({
      id: hubId(rect.id, Direction.RIGHT),
      onId: rect.id,
      edge: Direction.RIGHT,
      along: 50,
      type: "percentage",
      intersection: rightBest,
    });
  }

  const upBest = graph.intersections
    .filter(
      (i) =>
        i.h.after === r0 - 1 &&
        trackCoversAlong(i.h, midCol) &&
        trackCoversAlong(i.v, r0),
    )
    .sort(
      (a, b) =>
        Math.abs(a.v.after - (midCol - 1)) -
        Math.abs(b.v.after - (midCol - 1)),
    )[0];
  if (upBest) {
    out.push({
      id: hubId(rect.id, Direction.UP),
      onId: rect.id,
      edge: Direction.UP,
      along: 50,
      type: "percentage",
      intersection: upBest,
    });
  }

  const downBest = graph.intersections
    .filter(
      (i) =>
        i.h.after === r1 &&
        trackCoversAlong(i.h, midCol) &&
        trackCoversAlong(i.v, r1),
    )
    .sort(
      (a, b) =>
        Math.abs(a.v.after - (midCol - 1)) -
        Math.abs(b.v.after - (midCol - 1)),
    )[0];
  if (downBest) {
    out.push({
      id: hubId(rect.id, Direction.DOWN),
      onId: rect.id,
      edge: Direction.DOWN,
      along: 50,
      type: "percentage",
      intersection: downBest,
    });
  }

  return out;
}

export { covers, edgeCoords };
