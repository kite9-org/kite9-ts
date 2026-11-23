/** Apply placeholder grid fixtures (arrangeGrid-style tracks + routes) to a painted scene. */

import type {
  CompletedLayout,
  LayoutPlacement,
  Size,
} from "@kite9/model";

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

/**
 * Lay out painted `kite9-diagram` children using a completed layout:
 * CSS grid on the shadow objects-layer, SVG routes on the links-layer.
 */
export function applyLayout(diagram: Element, layout: CompletedLayout): void {
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
    const g = document.createElementNS(NS, "g");
    g.setAttribute("data-link-id", id);
    g.setAttribute("fill", "none");
    g.setAttribute("stroke", "#64748b");
    g.setAttribute("stroke-width", "2");

    if (route.points.length >= 2) {
      const d = route.points
        .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
        .join(" ");
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      g.appendChild(path);
    }

    for (const [labelId, pos] of Object.entries(route.labels)) {
      const labelEl = diagram.querySelector(
        `#${CSS.escape(labelId)}`,
      ) as HTMLElement | null;
      if (labelEl) {
        labelEl.style.position = "absolute";
        labelEl.style.left = `${pos.x}px`;
        labelEl.style.top = `${pos.y}px`;
        labelEl.style.display = "block";
        labelEl.style.zIndex = "2";
        if (labelEl.parentElement !== diagram) {
          diagram.appendChild(labelEl);
        }
      } else {
        const text = document.createElementNS(NS, "text");
        text.setAttribute("x", String(pos.x));
        text.setAttribute("y", String(pos.y));
        text.setAttribute("fill", "#334155");
        text.setAttribute("font-size", "11");
        text.textContent = labelId;
        g.appendChild(text);
      }
    }

    linksSvg.appendChild(g);
  }
}
