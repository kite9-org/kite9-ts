/** Apply placeholder grid fixtures (arrangeGrid-style tracks + routes) to a painted scene. */

import {
  Direction,
  End,
  type ConnectionRenderLayout,
  type GridLayout,
  type LabelRenderLayout,
  type LayoutData,
  type LayoutPlacement,
  type Size,
  type TerminatorRenderLayout,
} from "@kite9/model";
import {
  AdjustableLayout,
  contentColSpan,
  contentRowSpan,
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
): p is {
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
  size?: Size;
} {
  return "col" in p && "row" in p;
}

function hasEdge(
  p: LayoutPlacement,
): p is { edge: Direction; along: number; size?: Size } {
  return "edge" in p && "along" in p;
}

function hasAnchor(
  p: LayoutPlacement,
): p is { anchor: string; side: Direction } {
  return "anchor" in p && "side" in p;
}

/** Default socket/port size when mounted on a host edge. */
const ANCHOR_SIZE = 12;

/** Place a port/socket on the start/end track of a content row or column. */
function edgeGridPlacement(
  grid: GridLayout,
  p: { edge: Direction; along: number },
  trackCounts: { cols: number; rows: number },
): { gridColumn: string; gridRow: string } {
  const row = contentRowSpan(grid, p.along);
  const col = contentColSpan(grid, p.along);
  switch (p.edge) {
    case Direction.LEFT:
      return {
        gridColumn: "1 / 2",
        gridRow: `${trackStartLine(row.start)} / ${trackStartLine(row.start + row.count)}`,
      };
    case Direction.RIGHT:
      return {
        gridColumn: `${trackCounts.cols} / ${trackCounts.cols + 1}`,
        gridRow: `${trackStartLine(row.start)} / ${trackStartLine(row.start + row.count)}`,
      };
    case Direction.UP:
      return {
        gridColumn: `${trackStartLine(col.start)} / ${trackStartLine(col.start + col.count)}`,
        gridRow: "1 / 2",
      };
    case Direction.DOWN:
      return {
        gridColumn: `${trackStartLine(col.start)} / ${trackStartLine(col.start + col.count)}`,
        gridRow: `${trackCounts.rows} / ${trackCounts.rows + 1}`,
      };
  }
}

function placeSized(
  el: HTMLElement,
  place: { gridColumn: string; gridRow: string },
  size?: Size,
): void {
  el.style.gridColumn = place.gridColumn;
  el.style.gridRow = place.gridRow;
  // Only force box size when LayoutData carries authored CSS size.
  if (size) {
    el.style.width = `${size.w}px`;
    el.style.height = `${size.h}px`;
  } else {
    el.style.width = "";
    el.style.height = "";
  }
  // Alignment / margins are owned by style commands (e.g. Margins OK), not here.
  el.style.boxSizing = "border-box";
  // Do not clamp with maxWidth/maxHeight — nested hosts must be able to grow
  // past a parent cell; tracks / ancestor placements absorb the overflow.
  el.style.maxWidth = "";
  el.style.maxHeight = "";
  el.style.zIndex = el.localName === "kite9-container" ? "0" : "1";
}

/** Mount a port/socket on the mid-edge of its anchor host. */
function placeOnAnchor(
  el: HTMLElement,
  placement: { anchor: string; side: Direction },
  diagram: Element,
): void {
  const host = diagram.querySelector(
    `#${CSS.escape(placement.anchor)}`,
  ) as HTMLElement | null;
  if (!host) return;

  if (getComputedStyle(host).position === "static") {
    host.style.position = "relative";
  }

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

  switch (placement.side) {
    case Direction.LEFT:
      el.style.left = "0";
      el.style.top = "50%";
      el.style.transform = "translate(-50%, -50%)";
      break;
    case Direction.RIGHT:
      el.style.right = "0";
      el.style.top = "50%";
      el.style.transform = "translate(50%, -50%)";
      break;
    case Direction.UP:
      el.style.top = "0";
      el.style.left = "50%";
      el.style.transform = "translate(-50%, -50%)";
      break;
    case Direction.DOWN:
      el.style.bottom = "0";
      el.style.left = "50%";
      el.style.transform = "translate(-50%, 50%)";
      break;
  }
}

function decorationStyle(linkEl: Element, tag: string): string {
  const el = Array.from(linkEl.children).find(
    (c) => c.localName.toLowerCase() === tag.toLowerCase(),
  );
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim() || "NONE";
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

  const trackCounts = {
    cols: colSizes.length,
    rows: rowSizes.length,
  };

  for (const [id, placement] of Object.entries(adj.placements)) {
    const el = diagram.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) continue;

    if (hasCell(placement)) {
      placeSized(el, contentGridPlacement(adj.grid, placement), placement.size);
    } else if (hasEdge(placement)) {
      placeSized(
        el,
        edgeGridPlacement(adj.grid, placement, trackCounts),
        placement.size,
      );
    } else if (hasAnchor(placement)) {
      placeOnAnchor(el, placement, diagram);
    }
  }

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

    const fromStyle = linkEl ? decorationStyle(linkEl, "fromDecoration") : "NONE";
    const toStyle = linkEl ? decorationStyle(linkEl, "toDecoration") : "NONE";

    const d = adj.routePathD(id);
    const poly = adj.routePolyline(id);
    if (d && poly.length >= 2) {
      const fromPoint = poly[0]!;
      const toPoint = poly[poly.length - 1]!;
      const connection: ConnectionRenderLayout = {
        id,
        d,
        fromPoint,
        toPoint,
        fromStyle,
        toStyle,
      };
      linkEntry?.renderSvg?.(g, connection);

      const fromLayout: TerminatorRenderLayout = {
        style: fromStyle,
        end: End.FROM,
        point: fromPoint,
      };
      const toLayout: TerminatorRenderLayout = {
        style: toStyle,
        end: End.TO,
        point: toPoint,
      };
      linkEntry?.renderDefs?.(linksSvg, fromLayout);
      linkEntry?.renderDefs?.(linksSvg, toLayout);
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
