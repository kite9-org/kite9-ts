import { End, type ConnectionRenderLayout, type Point2D } from "@kite9/model";
import type { RenderHtmlFn, RenderSvgFn } from "@kite9/templating";
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

/** {@link RenderHtmlFn} for link host chrome (type CSS on `:host`). */
export const renderLinkChrome: RenderHtmlFn = (host, shadow) => {
  render(
    <LinkChrome id={host.getAttribute("id") || "link"} />,
    shadow,
  );
};

const SVG_NS = "http://www.w3.org/2000/svg";

function pathD(points: readonly Point2D[]): string | null {
  if (points.length < 2) return null;
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
}

export type ConnectionSvgProps = ConnectionRenderLayout;

/**
 * SVG scene for a connection: path (with marker refs) + terminator hit-boxes.
 */
export function ConnectionSvg({
  id,
  points,
  fromStyle,
  toStyle,
}: ConnectionSvgProps) {
  const d = pathD(points);
  if (!d) return null;
  const first = points[0]!;
  const last = points[points.length - 1]!;
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
      <TerminatorHit style={fromStyle} end={End.FROM} point={first} />
      <TerminatorHit style={toStyle} end={End.TO} point={last} />
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
