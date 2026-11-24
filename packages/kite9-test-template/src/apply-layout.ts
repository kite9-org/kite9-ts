/** Apply placeholder grid fixtures (arrangeGrid-style tracks + routes) to a painted scene. */

import {
  Direction,
  End,
  type ConnectionRenderLayout,
  type LabelRenderLayout,
  type LayoutData,
  type LayoutPlacement,
  type Size,
  type TerminatorRenderLayout,
} from "@kite9/model";
import type { AdjustableLayout } from "@kite9/ui";
import { localTag, type TemplatePack } from "@kite9/templating";
import { testTemplatePack } from "./pack.js";

export type { AdjustableLayout, LayoutData, LayoutPlacement, Size };

/** Layout state applyLayout can paint — class instance or plain fixture data. */
export type LayoutSource = AdjustableLayout | LayoutData;

function pxTracks(sizes: readonly number[]): string {
  return sizes.map((n) => `${Math.round(n * 100) / 100}px`).join(" ");
}

/** Logical 1-based content col → physical 1-based track index (with gutters). */
function contentColTrack(col: number): number {
  return 2 * col + 1;
}

function contentRowTrack(row: number): number {
  return 2 * row + 1;
}

function contentGridPlacement(p: {
  col: number;
  row: number;
  colEnd?: number;
  rowEnd?: number;
}): { gridColumn: string; gridRow: string } {
  const colStart = contentColTrack(p.col);
  const colEnd = contentColTrack(p.colEnd ?? p.col) + 1;
  const rowStart = contentRowTrack(p.row);
  const rowEnd = contentRowTrack(p.rowEnd ?? p.row) + 1;
  return {
    gridColumn: `${colStart} / ${colEnd}`,
    gridRow: `${rowStart} / ${rowEnd}`,
  };
}

function hasCell(
  p: LayoutPlacement,
): p is { col: number; row: number; colEnd?: number; rowEnd?: number; size: Size } {
  return "col" in p && "row" in p && "size" in p;
}

function hasEdge(
  p: LayoutPlacement,
): p is { edge: Direction; along: number; size: Size } {
  return "edge" in p && "along" in p && "size" in p;
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
  p: { edge: Direction; along: number },
  trackCounts: { cols: number; rows: number },
): { gridColumn: string; gridRow: string } {
  switch (p.edge) {
    case Direction.LEFT:
      return {
        gridColumn: "1 / 2",
        gridRow: `${contentRowTrack(p.along)} / ${contentRowTrack(p.along) + 1}`,
      };
    case Direction.RIGHT:
      return {
        gridColumn: `${trackCounts.cols} / ${trackCounts.cols + 1}`,
        gridRow: `${contentRowTrack(p.along)} / ${contentRowTrack(p.along) + 1}`,
      };
    case Direction.UP:
      return {
        gridColumn: `${contentColTrack(p.along)} / ${contentColTrack(p.along) + 1}`,
        gridRow: "1 / 2",
      };
    case Direction.DOWN:
      return {
        gridColumn: `${contentColTrack(p.along)} / ${contentColTrack(p.along) + 1}`,
        gridRow: `${trackCounts.rows} / ${trackCounts.rows + 1}`,
      };
  }
}

type StageBox = {
  left: number;
  top: number;
  right: number;
  bottom: number;
  cx: number;
  cy: number;
  w: number;
  h: number;
};

function stageBox(el: Element, stage: Element): StageBox {
  const er = el.getBoundingClientRect();
  const sr = stage.getBoundingClientRect();
  const left = er.left - sr.left;
  const top = er.top - sr.top;
  return {
    left,
    top,
    right: left + er.width,
    bottom: top + er.height,
    cx: left + er.width / 2,
    cy: top + er.height / 2,
    w: er.width,
    h: er.height,
  };
}

/** Mid-point of the side of `box` that faces `other` (orthogonal preference). */
function facingEdgeMid(
  box: StageBox,
  other: StageBox,
): { x: number; y: number } {
  const dx = other.cx - box.cx;
  const dy = other.cy - box.cy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    return dx >= 0
      ? { x: Math.round(box.right), y: Math.round(box.cy) }
      : { x: Math.round(box.left), y: Math.round(box.cy) };
  }
  return dy >= 0
    ? { x: Math.round(box.cx), y: Math.round(box.bottom) }
    : { x: Math.round(box.cx), y: Math.round(box.top) };
}

/**
 * Attachment point on `el` toward `other`. Small port/socket hosts use centre
 * (already on an edge); rectangulars use the facing edge midpoint.
 */
function attachmentPoint(
  el: Element,
  other: Element,
  stage: Element,
): { x: number; y: number } {
  const box = stageBox(el, stage);
  const otherBox = stageBox(other, stage);
  if (box.w <= ANCHOR_SIZE * 2 && box.h <= ANCHOR_SIZE * 2) {
    return { x: Math.round(box.cx), y: Math.round(box.cy) };
  }
  return facingEdgeMid(box, otherBox);
}

/**
 * Rewrite route endpoints (and label anchors) from current host boxes so SVG
 * links follow rectangulars when content tracks change. Endpoints sit on
 * facing edges (not centres); intermediate waypoints are preserved.
 */
export function syncLinkRoutesFromDom(
  diagram: Element,
  layout: LayoutSource,
  stage: Element = diagram.shadowRoot?.querySelector(".stage") as Element,
): void {
  if (!stage) return;
  // happy-dom / unmounted tests often report 0×0 — keep authored fixture routes.
  const measured = stage.getBoundingClientRect();
  if (measured.width < 1 || measured.height < 1) return;

  for (const [linkId, route] of Object.entries(layout.routes)) {
    const link = diagram.querySelector(`#${CSS.escape(linkId)}`);
    if (!link || route.points.length < 2) continue;

    const fromId = link.querySelector("from")?.getAttribute("reference");
    const toId = link.querySelector("to")?.getAttribute("reference");
    const fromEl = fromId
      ? diagram.querySelector(`#${CSS.escape(fromId)}`)
      : null;
    const toEl = toId ? diagram.querySelector(`#${CSS.escape(toId)}`) : null;
    if (!fromEl || !toEl) continue;

    const from = attachmentPoint(fromEl, toEl, stage);
    const to = attachmentPoint(toEl, fromEl, stage);
    route.points[0] = from;
    route.points[route.points.length - 1] = to;

    for (const labelId of Object.keys(route.labels)) {
      const end = labelEndForId(link, labelId);
      route.labels[labelId] =
        end === End.TO
          ? { x: to.x - 20, y: to.y - 20 }
          : { x: from.x + 6, y: from.y - 20 };
    }
  }
}

function placeSized(
  el: HTMLElement,
  place: { gridColumn: string; gridRow: string },
  size: Size,
): void {
  el.style.gridColumn = place.gridColumn;
  el.style.gridRow = place.gridRow;
  el.style.width = `${size.w}px`;
  el.style.height = `${size.h}px`;
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

  const { colSizes, rowSizes } = layout.grid;
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

  for (const [id, placement] of Object.entries(layout.placements)) {
    const el = diagram.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el) continue;

    if (hasCell(placement)) {
      placeSized(el, contentGridPlacement(placement), placement.size);
    } else if (hasEdge(placement)) {
      placeSized(el, edgeGridPlacement(placement, trackCounts), placement.size);
    } else if (hasAnchor(placement)) {
      placeOnAnchor(el, placement, diagram);
    }
  }

  // Keep link geometry attached to hosts after grid track changes (e.g. resize).
  syncLinkRoutesFromDom(diagram, layout, stage);

  linksSvg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  linksSvg.style.width = "100%";
  linksSvg.style.height = "100%";
  linksSvg.replaceChildren();

  const NS = "http://www.w3.org/2000/svg";
  for (const [id, route] of Object.entries(layout.routes)) {
    const g = document.createElementNS(NS, "g") as SVGGElement;
    g.setAttribute("data-link-id", id);
    linksSvg.appendChild(g);

    const linkEl = diagram.querySelector(`#${CSS.escape(id)}`);
    const linkEntry = linkEl ? pack.resolve(localTag(linkEl)) : null;

    const fromStyle = linkEl ? decorationStyle(linkEl, "fromDecoration") : "NONE";
    const toStyle = linkEl ? decorationStyle(linkEl, "toDecoration") : "NONE";

    const connection: ConnectionRenderLayout = {
      id,
      points: route.points,
      fromStyle,
      toStyle,
    };
    linkEntry?.renderSvg?.(g, connection);

    const points = route.points;
    if (points.length >= 2) {
      const first = points[0]!;
      const last = points[points.length - 1]!;

      const fromLayout: TerminatorRenderLayout = {
        style: fromStyle,
        end: End.FROM,
        point: first,
      };
      const toLayout: TerminatorRenderLayout = {
        style: toStyle,
        end: End.TO,
        point: last,
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
