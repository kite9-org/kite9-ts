import { DiagramElementType } from "@kite9/css";
import { End } from "@kite9/model";
import type { ConnectionRenderLayout } from "@kite9/model";
import {
  applyHostCapabilities,
  type RenderHtmlFn,
  type RenderSvgFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";
import {
  ensureMarkerDef,
  markerId,
  TerminatorHit,
} from "../terminator/index.js";

/** Links paint into an SVG layer; HTML host chrome is a minimal marker. */
export const LINK_STYLES = METROPOLIS_FACE + styles;

export type LinkChromeProps = {
  id: string;
};

export function LinkChrome({ id }: LinkChromeProps) {
  return (
    <>
      <style>{LINK_STYLES}</style>
      <g part="link" data-link-id={id}>
        <title>{id}</title>
      </g>
    </>
  );
}

/** {@link RenderHtmlFn} for link host chrome (view only). */
export const renderLinkChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTION,
    ui: "selectable",
  });
  render(
    <LinkChrome id={host.getAttribute("id") || "link"} />,
    shadow,
  );
};

const SVG_NS = "http://www.w3.org/2000/svg";

function childByLocalName(host: Element, name: string): Element | undefined {
  const want = name.toLowerCase();
  return Array.from(host.children).find(
    (c) => c.localName.toLowerCase() === want,
  );
}

/** Decoration style from `<fromDecoration>` / `<toDecoration>` text (default NONE). */
export function decorationStyleFromHost(
  host: Element,
  end: End,
): string {
  const tag = end === End.FROM ? "fromDecoration" : "toDecoration";
  const el = childByLocalName(host, tag);
  return (el?.textContent ?? "").replace(/\s+/g, " ").trim() || "NONE";
}

export type ConnectionSvgProps = Omit<
  ConnectionRenderLayout,
  "fromStyle" | "toStyle"
> & {
  fromStyle: string;
  toStyle: string;
};

/**
 * SVG scene for a connection: path (with marker refs) + terminator hit-boxes.
 */
export function ConnectionSvg({
  id,
  d,
  fromPoint,
  toPoint,
  fromStyle,
  toStyle,
}: ConnectionSvgProps) {
  if (!d) return null;
  return (
    <>
      <path
        d={d}
        data-connection-path={id}
        fill="none"
        stroke="#64748b"
        stroke-width="2"
        marker-start={`url(#${markerId(fromStyle, End.FROM)})`}
        marker-end={`url(#${markerId(toStyle, End.TO)})`}
      />
      <TerminatorHit style={fromStyle} end={End.FROM} point={fromPoint} />
      <TerminatorHit style={toStyle} end={End.TO} point={toPoint} />
    </>
  );
}

/**
 * Paint the connection into the links-layer link `<g>` (SVG scene).
 * Reads decoration styles from the light-DOM link host and ensures marker defs
 * on the owning SVG. Uses a dedicated mount child so Preact does not replace
 * label siblings.
 */
export const renderSvg: RenderSvgFn = (parent, layout, host) => {
  const fromStyle =
    decorationStyleFromHost(host, End.FROM) || layout.fromStyle || "NONE";
  const toStyle =
    decorationStyleFromHost(host, End.TO) || layout.toStyle || "NONE";

  const svg = parent.ownerSVGElement;
  if (svg) {
    ensureMarkerDef(svg, fromStyle, End.FROM);
    ensureMarkerDef(svg, toStyle, End.TO);
  }

  let mount = parent.querySelector(
    ":scope > [data-connection-mount]",
  ) as SVGGElement | null;
  if (!mount) {
    mount = document.createElementNS(SVG_NS, "g");
    mount.setAttribute("data-connection-mount", "");
    parent.appendChild(mount);
  }

  render(
    <ConnectionSvg
      id={layout.id}
      d={layout.d}
      fromPoint={layout.fromPoint}
      toPoint={layout.toPoint}
      fromStyle={fromStyle}
      toStyle={toStyle}
    />,
    mount,
  );
};
