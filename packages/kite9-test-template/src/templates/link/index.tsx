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
import { markerId, TerminatorHit } from "../terminator/index.js";

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

export type ConnectionSvgProps = ConnectionRenderLayout;

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
 * Uses a dedicated mount child so Preact does not replace label siblings.
 */
export const renderSvg: RenderSvgFn = (parent, layout) => {
  let mount = parent.querySelector(
    ":scope > [data-connection-mount]",
  ) as SVGGElement | null;
  if (!mount) {
    mount = document.createElementNS(SVG_NS, "g");
    mount.setAttribute("data-connection-mount", "");
    parent.appendChild(mount);
  }

  render(<ConnectionSvg {...layout} />, mount);
};
