import { End, type TerminatorRenderLayout } from "@kite9/model";
import type { RenderDefsFn } from "@kite9/templating";

const SVG_NS = "http://www.w3.org/2000/svg";

/** Classic kite9 marker id: `{style}-start-marker` / `{style}-end-marker`. */
export function markerId(style: string, end: End): string {
  const side = end === End.FROM ? "start" : "end";
  return `${style.trim().toLowerCase() || "none"}-${side}-marker`;
}

export type TerminatorHitProps = Pick<TerminatorRenderLayout, "style" | "end" | "point">;

/** Hit-box at a link end (painted into the SVG scene by the link renderer). */
export function TerminatorHit({ style, end, point }: TerminatorHitProps) {
  return (
    <g
      data-terminator-end={end}
      data-terminator-style={style}
      transform={`translate(${point.x} ${point.y})`}
    >
      <ellipse
        class="terminator-hit"
        cx="0"
        cy="0"
        rx="8"
        ry="8"
        fill="#ffffff"
        fill-opacity="0.01"
        stroke="none"
        pointer-events="all"
      />
    </g>
  );
}

/**
 * Ensure a shared `<marker>` def on the links-layer SVG.
 * ARROW geometry matches old kite9 `arrow-*-marker`; NONE is empty.
 */
export function ensureMarkerDef(
  svg: SVGSVGElement,
  style: string,
  end: End,
): string {
  const id = markerId(style, end);
  let defs = svg.querySelector(":scope > defs");
  if (!defs) {
    defs = document.createElementNS(SVG_NS, "defs");
    svg.insertBefore(defs, svg.firstChild);
  }
  if (defs.querySelector(`#${CSS.escape(id)}`)) return id;

  const marker = document.createElementNS(SVG_NS, "marker");
  marker.id = id;
  marker.setAttribute("markerUnits", "strokeWidth");
  marker.setAttribute("orient", "auto");
  marker.setAttribute("preserveAspectRatio", "xMidYMid meet");

  const kind = style.trim().toUpperCase();
  if (kind === "ARROW") {
    marker.setAttribute("markerWidth", "7");
    marker.setAttribute("markerHeight", "7");
    marker.setAttribute("refY", "4");
    const polygon = document.createElementNS(SVG_NS, "polygon");
    polygon.setAttribute("class", "arrow-marker");
    polygon.setAttribute("fill", "#64748b");
    if (end === End.FROM) {
      marker.setAttribute("refX", "2");
      polygon.setAttribute("points", "2,4 6,2 6,6");
    } else {
      marker.setAttribute("refX", "6");
      polygon.setAttribute("points", "6,4 2,2 2,6");
    }
    marker.appendChild(polygon);
  }

  defs.appendChild(marker);
  return id;
}

/** {@link RenderDefsFn} — ensure terminator marker def on the links-layer SVG. */
export const renderDefs: RenderDefsFn = (svg, layout) => {
  ensureMarkerDef(svg, layout.style, layout.end);
};
