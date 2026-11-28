/** Apply placeholder grid fixtures (arrangeGrid-style tracks + routes) to a painted scene. */

import {
  Direction,
  End,
  type BoxInsets,
  type ConnectionRenderLayout,
  type GridLayout,
  type LabelRenderLayout,
  type LayoutData,
  type LayoutPlacement,
  type Size,
} from "@kite9/model";
import {
  AdjustableLayout,
  anchorOnBox,
  contentColSpan,
  contentRowSpan,
  edgeCoords,
} from "@kite9/ui";
import { localTag, type TemplatePack } from "@kite9/templating";
import { testTemplatePack } from "./pack.js";

export type { AdjustableLayout, LayoutData, LayoutPlacement, Size };

/** Layout state applyLayout can paint — class instance or plain fixture data. */
export type LayoutSource = AdjustableLayout | LayoutData;

function asAdjustable(layout: LayoutSource): AdjustableLayout {
  return layout instanceof AdjustableLayout
    ? layout
    : AdjustableLayout.from(layout);
}

function layoutDataSink(layout: LayoutSource): LayoutData | undefined {
  return layout instanceof AdjustableLayout ? undefined : layout;
}

function pxTracks(sizes: readonly number[]): string {
  return sizes.map((n) => `${Math.round(n * 100) / 100}px`).join(" ");
}

/** CSS 1-based line at the start of a physical 0-based track. */
function trackStartLine(physicalStart: number): number {
  return physicalStart + 1;
}

function contentGridPlacement(
  grid: GridLayout,
  p: {
    col: number;
    row: number;
    colEnd?: number;
    rowEnd?: number;
  },
): { gridColumn: string; gridRow: string } {
  const colFrom = contentColSpan(grid, p.col);
  const colTo = contentColSpan(grid, p.colEnd ?? p.col);
  const rowFrom = contentRowSpan(grid, p.row);
  const rowTo = contentRowSpan(grid, p.rowEnd ?? p.row);
  return {
    gridColumn: `${trackStartLine(colFrom.start)} / ${trackStartLine(colTo.start + colTo.count)}`,
    gridRow: `${trackStartLine(rowFrom.start)} / ${trackStartLine(rowTo.start + rowTo.count)}`,
  };
}

function hasCell(
  p: LayoutPlacement,
): p is Extract<LayoutPlacement, { col: number; row: number }> {
  return "col" in p && "row" in p;
}

function hasPortOrHub(
  p: LayoutPlacement,
): p is Extract<LayoutPlacement, { onId: string; edge: Direction }> {
  return "onId" in p && "edge" in p;
}

/** Default socket/port size when mounted on a host edge. */
const ANCHOR_SIZE = 12;

/** Pixel origin + size of a content cell span in the physical track lattice. */
function cellPixelRect(
  grid: GridLayout,
  p: { col: number; row: number; colEnd?: number; rowEnd?: number },
): { x: number; y: number; w: number; h: number } {
  const col0 = contentColSpan(grid, p.col);
  const col1 = contentColSpan(grid, p.colEnd ?? p.col);
  const row0 = contentRowSpan(grid, p.row);
  const row1 = contentRowSpan(grid, p.rowEnd ?? p.row);
  const xs = edgeCoords(grid.colSizes);
  const ys = edgeCoords(grid.rowSizes);
  const x0 = xs[col0.start] ?? 0;
  const x1 = xs[col1.start + col1.count] ?? x0;
  const y0 = ys[row0.start] ?? 0;
  const y1 = ys[row1.start + row1.count] ?? y0;
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}

/**
 * Place a nested rectangular inside its nearest placed ancestor using absolute
 * coordinates derived from the flat {@link LayoutData} cell span.
 */
function placeNestedInAncestor(
  el: HTMLElement,
  placement: {
    col: number;
    row: number;
    colEnd?: number;
    rowEnd?: number;
    size?: Size;
    margin?: BoxInsets;
  },
  adj: AdjustableLayout,
  diagram: Element,
): void {
  let ancestor: HTMLElement | null = el.parentElement;
  let ancestorPlacement:
    | { col: number; row: number; colEnd?: number; rowEnd?: number }
    | undefined;
  while (ancestor && ancestor !== diagram) {
    const id = ancestor.id;
    const p = id ? adj.placements[id] : undefined;
    if (p && hasCell(p)) {
      ancestorPlacement = p;
      break;
    }
    ancestor = ancestor.parentElement;
  }
  if (!ancestor || !ancestorPlacement) {
    // Fall back to diagram-grid props (may be inert if not a grid item).
    placeSized(el, contentGridPlacement(adj.grid, placement), placement.size, {
      margin: placement.margin,
      keepMargins: adj.grid.gutter === 0,
    });
    return;
  }

  if (getComputedStyle(ancestor).position === "static") {
    ancestor.style.position = "relative";
  }

  const parentRect = cellPixelRect(adj.grid, ancestorPlacement);
  const selfRect = cellPixelRect(adj.grid, placement);
  el.style.position = "absolute";
  // Absolute left/top already encode margin insets — clear CSS margin so it
  // is not applied twice (once in coordinates, once as margin).
  el.style.margin = "0";
  el.style.boxSizing = "border-box";
  el.style.zIndex = el.localName === "kite9-container" ? "0" : "1";

  const keepMargins = adj.grid.gutter === 0;
  const margin = placement.margin;
  const m =
    keepMargins && margin
      ? margin
      : { top: 0, right: 0, bottom: 0, left: 0 };
  if (el.localName === "kite9-container" && !placement.size) {
    // Structural frames fill the cell so absolute children stay in cell space.
    el.style.width = `${Math.max(0, selfRect.w - m.left - m.right)}px`;
    el.style.height = `${Math.max(0, selfRect.h - m.top - m.bottom)}px`;
    el.style.left = `${selfRect.x - parentRect.x + m.left}px`;
    el.style.top = `${selfRect.y - parentRect.y + m.top}px`;
    return;
  }

  // Glyphs (sized or content-sized): keep a fixed/intrinsic box and honor
  // justify-self / align-self within the cell — template defaults are center,
  // so a sibling widening a shared column recenters rather than stretching.
  if (placement.size) {
    el.style.width = `${placement.size.w}px`;
    el.style.height = `${placement.size.h}px`;
  } else {
    el.style.width = "";
    el.style.height = "";
  }
  const boxW = placement.size?.w ?? el.offsetWidth;
  const boxH = placement.size?.h ?? el.offsetHeight;
  const cs = getComputedStyle(el);
  const js = cs.justifySelf;
  const as = cs.alignSelf;
  const justify =
    !js || js === "auto" || js === "normal" || js === "stretch" ? "start" : js;
  const align =
    !as || as === "auto" || as === "normal" || as === "stretch" ? "start" : as;
  const innerW = selfRect.w - m.left - m.right;
  const innerH = selfRect.h - m.top - m.bottom;
  const dx =
    justify === "end" || justify === "right"
      ? innerW - boxW
      : justify === "center"
        ? (innerW - boxW) / 2
        : 0;
  const dy =
    align === "end" || align === "bottom"
      ? innerH - boxH
      : align === "center"
        ? (innerH - boxH) / 2
        : 0;
  el.style.left = `${selfRect.x - parentRect.x + m.left + dx}px`;
  el.style.top = `${selfRect.y - parentRect.y + m.top + dy}px`;
}

function applyMargins(el: HTMLElement, margin: BoxInsets | undefined, keepMargins: boolean): void {
  if (keepMargins && margin) {
    el.style.marginTop = `${margin.top}px`;
    el.style.marginRight = `${margin.right}px`;
    el.style.marginBottom = `${margin.bottom}px`;
    el.style.marginLeft = `${margin.left}px`;
    return;
  }
  if (keepMargins) {
    // Leave authored CSS margins (grid placer: spacing is margins, not gutters).
    return;
  }
  // Layout-engine gutters already encode spacing — clear host margin for paint.
  el.style.margin = "0";
}

function placeSized(
  el: HTMLElement,
  place: { gridColumn: string; gridRow: string },
  size?: Size,
  opts?: { margin?: BoxInsets; keepMargins?: boolean },
): void {
  el.style.gridColumn = place.gridColumn;
  el.style.gridRow = place.gridRow;
  applyMargins(el, opts?.margin, opts?.keepMargins === true);
  el.style.boxSizing = "border-box";
  if (size) {
    // Fixed size within a larger cell — honor CSS Grid self-alignment.
    const cs = getComputedStyle(el);
    const js = cs.justifySelf;
    const as = cs.alignSelf;
    el.style.justifySelf =
      !js || js === "auto" || js === "normal" || js === "stretch" ? "start" : js;
    el.style.alignSelf =
      !as || as === "auto" || as === "normal" || as === "stretch" ? "start" : as;
    el.style.width = `${size.w}px`;
    el.style.height = `${size.h}px`;
  } else if (opts?.keepMargins) {
    // Tracks already include margins. Do not set width/height: 100% — that is
    // relative to the full grid area and overflows once margins are applied.
    // Leave size/alignment to CSS (e.g. stretch via justify/align-self).
    el.style.width = "";
    el.style.height = "";
  } else {
    // Fill the content cell (margins cleared, or structural container frame).
    el.style.justifySelf = "stretch";
    el.style.alignSelf = "stretch";
    el.style.width = "100%";
    el.style.height = "100%";
  }
  // Do not clamp with maxWidth/maxHeight — nested hosts must be able to grow
  // past a parent cell; tracks / ancestor placements absorb the overflow.
  el.style.maxWidth = "";
  el.style.maxHeight = "";
  el.style.zIndex = el.localName === "kite9-container" ? "0" : "1";
}

/**
 * Mount a port/socket on its host edge. Uses placement `along` so the anchor
 * tracks the painted host as it resizes (host may be intrinsically sized).
 */
function placeOnHostEdge(
  el: HTMLElement,
  placement: {
    onId: string;
    edge: Direction;
    along?: number;
    type?: "pixels" | "percentage";
  },
  diagram: Element,
): void {
  const host = diagram.querySelector(
    `#${CSS.escape(placement.onId)}`,
  ) as HTMLElement | null;
  if (!host) return;

  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }

  const along =
    placement.along != null
      ? placement.type === "pixels"
        ? `${placement.along}px`
        : `${placement.along}%`
      : "50%";

  el.style.position = "absolute";
  el.style.width = `${ANCHOR_SIZE}px`;
  el.style.height = `${ANCHOR_SIZE}px`;
  el.style.boxSizing = "border-box";
  el.style.zIndex = "2";
  el.style.margin = "0";
  el.style.left = "";
  el.style.right = "";
  el.style.top = "";
  el.style.bottom = "";
  el.style.transform = "";

  switch (placement.edge) {
    case Direction.LEFT:
      el.style.left = "0";
      el.style.top = along;
      el.style.transform = "translate(-50%, -50%)";
      break;
    case Direction.RIGHT:
      el.style.right = "0";
      el.style.top = along;
      el.style.transform = "translate(50%, -50%)";
      break;
    case Direction.UP:
      el.style.top = "0";
      el.style.left = along;
      el.style.transform = "translate(-50%, -50%)";
      break;
    case Direction.DOWN:
      el.style.bottom = "0";
      el.style.left = along;
      el.style.transform = "translate(-50%, 50%)";
      break;
  }
}

type StageBox = { x: number; y: number; w: number; h: number };

function stageBox(el: Element, stage: Element): StageBox {
  const a = el.getBoundingClientRect();
  const o = stage.getBoundingClientRect();
  return {
    x: a.left - o.left,
    y: a.top - o.top,
    w: a.width,
    h: a.height,
  };
}

/** Keep painted routes Manhattan after border snap (insert elbows on diagonals). */
function orthogonalizePaintedRoute(
  points: { x: number; y: number }[],
  eps = 1,
): { x: number; y: number }[] {
  if (points.length < 2) return points.map((p) => ({ ...p }));
  const snapped: { x: number; y: number }[] = [{ ...points[0]! }];
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
      snapped.push({ x: prev.x, y: cur.y });
      snapped.push(cur);
    }
  }
  const out: { x: number; y: number }[] = [snapped[0]!];
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
 * Port/hub terminal in stage space from the **painted** host (or socket).
 * Synthetic hubs use `onId` host box + edge/along; DOM sockets use their centre.
 */
function paintedAnchor(
  diagram: Element,
  stage: Element,
  adj: AdjustableLayout,
  id: string,
): { x: number; y: number } | null {
  const placement = adj.placements[id];
  if (!placement || !hasPortOrHub(placement)) return null;

  const selfEl = diagram.querySelector(
    `#${CSS.escape(id)}`,
  ) as HTMLElement | null;
  if (selfEl && selfEl.getBoundingClientRect().width > 0) {
    const box = stageBox(selfEl, stage);
    return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
  }

  const host = diagram.querySelector(
    `#${CSS.escape(placement.onId)}`,
  ) as HTMLElement | null;
  if (!host || host.getBoundingClientRect().width <= 0) return null;
  return anchorOnBox(
    stageBox(host, stage),
    placement.edge,
    placement.along,
    placement.type,
  );
}

/**
 * Rematerialize routes from painted hosts/sockets, then orthogonalize.
 * Glyphs without fixed layout `size` are measured after CSS layout so
 * terminals stay on the real border as the element resizes.
 */
function attachRoutesToConnectedBorders(
  diagram: Element,
  stage: Element,
  adj: AdjustableLayout,
  _sink?: LayoutData,
): void {
  adj.rematerializeRoutes((id) => paintedAnchor(diagram, stage, adj, id));

  for (const [id, route] of Object.entries(adj.routes)) {
    let pts = route.points;
    if (!pts || pts.length === 0) continue;
    if (pts.length === 1) {
      pts = [pts[0]!, { ...pts[0]! }];
    }
    adj.routes[id] = {
      ...route,
      points: orthogonalizePaintedRoute(pts.map((p) => ({ ...p }))),
    };
    void id;
  }
}

function labelEndForId(linkEl: Element, labelId: string): End {
  const el = linkEl.querySelector(`#${CSS.escape(labelId)}`);
  if (!el) return End.FROM;
  const tag = el.localName.toLowerCase();
  if (tag === "kite9-to-label" || tag === "tolabel") return End.TO;
  return End.FROM;
}

/**
 * Lay out painted `kite9-diagram` children using a completed layout:
 * CSS grid on the shadow objects-layer; SVG connection/terminator/label
 * templates on the links-layer.
 */
export function applyLayout(
  diagram: Element,
  layout: LayoutSource,
  pack: TemplatePack = testTemplatePack,
): void {
  const shadow = diagram.shadowRoot;
  if (!shadow) throw new Error("diagram has no shadow root — run createDiagram first");

  const objects = shadow.querySelector(".objects-layer") as HTMLElement | null;
  const linksSvg = shadow.querySelector(".links-layer") as SVGSVGElement | null;
  const stage = shadow.querySelector(".stage") as HTMLElement | null;
  if (!objects || !linksSvg || !stage) {
    throw new Error("diagram chrome missing .stage / .objects-layer / .links-layer");
  }

  const adj = asAdjustable(layout);
  const { colSizes, rowSizes } = adj.grid;
  const width = colSizes.reduce((a, b) => a + b, 0);
  const height = rowSizes.reduce((a, b) => a + b, 0);

  stage.style.width = `${width}px`;
  stage.style.height = `${height}px`;
  stage.style.minHeight = "0";

  objects.style.display = "grid";
  objects.style.gridTemplateColumns = pxTracks(colSizes);
  objects.style.gridTemplateRows = pxTracks(rowSizes);
  objects.style.gap = "0";
  objects.style.width = "100%";
  objects.style.height = "100%";
  objects.style.boxSizing = "border-box";
  objects.style.position = "relative";

  // Hide connection hosts from the grid; routes are drawn on the SVG overlay.
  for (const link of Array.from(diagram.querySelectorAll("kite9-link"))) {
    (link as HTMLElement).style.display = "none";
  }

  const keepMargins = adj.grid.gutter === 0;

  for (const [id, placement] of Object.entries(adj.placements)) {
    const el = diagram.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) continue;

    if (hasCell(placement)) {
      const gridPlace = contentGridPlacement(adj.grid, placement);
      // Direct diagram children participate in the objects-layer CSS grid.
      // Nested hosts (inside a container) need absolute coords within the
      // nearest placed ancestor so a flattened LayoutData still paints.
      //
      // Structural containers share flattened cells with their children —
      // clear their host margin and stretch to the cell so absolute kids
      // (positioned in cell space) stay inside the frame.
      const isContainer = el.localName === "kite9-container";
      if (el.parentElement === diagram) {
        placeSized(el, gridPlace, placement.size, {
          margin: placement.margin,
          keepMargins: keepMargins && !isContainer,
        });
        // Pad tracks already encode container padding — clear host padding so
        // the card fills the cell and absolute kids share cell coordinates.
        if (isContainer) el.style.padding = "0";
      } else {
        placeNestedInAncestor(el, placement, adj, diagram);
      }
    } else if (hasPortOrHub(placement)) {
      placeOnHostEdge(el, placement, diagram);
    }
  }

  // Attach terminals to painted glyph borders (cell may differ by subpixels;
  // Java keeps terminals on rect-edge slideables / RI box edges).
  attachRoutesToConnectedBorders(
    diagram,
    stage,
    adj,
    layoutDataSink(layout),
  );

  linksSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  linksSvg.style.width = "100%";
  linksSvg.style.height = "100%";
  linksSvg.replaceChildren();

  const NS = "http://www.w3.org/2000/svg";
  for (const [id, route] of Object.entries(adj.routes)) {
    const g = document.createElementNS(NS, "g") as SVGGElement;
    g.setAttribute("data-link-id", id);
    linksSvg.appendChild(g);

    const linkEl = diagram.querySelector(`#${CSS.escape(id)}`);
    const linkEntry = linkEl ? pack.resolve(localTag(linkEl)) : null;

    const d = adj.routePathD(id);
    const poly = adj.routePolyline(id);
    if (d && poly.length >= 2 && linkEl) {
      const fromPoint = poly[0]!;
      const toPoint = poly[poly.length - 1]!;
      const connection: ConnectionRenderLayout = {
        id,
        d,
        fromPoint,
        toPoint,
      };
      // Link template parses fromDecoration / toDecoration from the host.
      linkEntry?.renderSvg?.(g, connection, linkEl);
    }

    for (const [labelId, pos] of Object.entries(route.labels)) {
      const host = diagram.querySelector(`#${CSS.escape(labelId)}`);
      if (!host) continue;
      const end = linkEl ? labelEndForId(linkEl, labelId) : End.FROM;
      const labelLayout: LabelRenderLayout = {
        id: labelId,
        end,
        point: pos,
        size: { w: 72, h: 20 },
      };
      pack.resolve(localTag(host))?.renderLabel?.(g, labelLayout, host);
    }
  }
}
