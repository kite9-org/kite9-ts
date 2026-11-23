/** Apply placeholder grid fixtures (arrangeGrid-style tracks + routes) to a painted scene. */

import {
  End,
  type CompletedLayout,
  type ConnectionRenderLayout,
  type LabelRenderLayout,
  type LayoutPlacement,
  type Size,
  type TerminatorRenderLayout,
} from "@kite9/model";
import { localTag, type TemplatePack } from "@kite9/templating";
import { testTemplatePack } from "./pack.js";

export type { CompletedLayout, LayoutPlacement, Size };

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
  layout: CompletedLayout,
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

  for (const [id, placement] of Object.entries(layout.placements)) {
    const el = diagram.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    if (!el || !hasCell(placement)) continue;

    const place = contentGridPlacement(placement);
    el.style.gridColumn = place.gridColumn;
    el.style.gridRow = place.gridRow;
    el.style.width = `${placement.size.w}px`;
    el.style.height = `${placement.size.h}px`;
    el.style.justifySelf = "center";
    el.style.alignSelf = "center";
    el.style.boxSizing = "border-box";
    el.style.maxWidth = "100%";
    el.style.maxHeight = "100%";
    el.style.zIndex = el.localName === "kite9-container" ? "0" : "1";
  }

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
