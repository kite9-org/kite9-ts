import type { LabelRenderLayout } from "@kite9/model";
import type { RenderHtmlFn, RenderSvgLabelFn } from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";
import { hostText } from "../host.js";

export const LABEL_STYLES = METROPOLIS_FACE + styles;

export type LabelChromeProps = {
  text: string;
};

export function LabelChrome({ text }: LabelChromeProps) {
  return (
    <>
      <style>{LABEL_STYLES}</style>
      <span class="label" part="label">
        {text}
      </span>
    </>
  );
}

/** {@link RenderHtmlFn} for fromLabel / toLabel host chrome. */
export const renderLabelChrome: RenderHtmlFn = (host, shadow) => {
  render(<LabelChrome text={hostText(host)} />, shadow);
};

const SVG_NS = "http://www.w3.org/2000/svg";
const XHTML_NS = "http://www.w3.org/1999/xhtml";

function labelTextFromHost(host: Element): string {
  const textChild = host.querySelector("text");
  const raw = textChild?.textContent ?? host.textContent ?? host.id;
  return raw.replace(/\s+/g, " ").trim() || host.id;
}

export type LabelSvgProps = LabelRenderLayout & {
  text: string;
};

/** Connection label as SVG `foreignObject` (HTML chrome inside). */
export function LabelSvg({ id, end, point, size, text }: LabelSvgProps) {
  return (
    <foreignObject
      data-label-id={id}
      data-label-end={end}
      x={point.x}
      y={point.y}
      width={size.w}
      height={size.h}
      overflow="visible"
    >
      <div {...{ xmlns: XHTML_NS }}>
        <style>{LABEL_STYLES}</style>
        <span class="label">{text}</span>
      </div>
    </foreignObject>
  );
}

/**
 * Paint a connection label into the SVG scene (link `<g>`).
 * Mounts per end so from/to Preact trees do not replace each other.
 */
export const renderLabel: RenderSvgLabelFn = (parent, layout, host) => {
  const sel = `:scope > [data-label-mount="${layout.end}"]`;
  let mount = parent.querySelector(sel) as SVGGElement | null;
  if (!mount) {
    mount = document.createElementNS(SVG_NS, "g");
    mount.setAttribute("data-label-mount", layout.end);
    parent.appendChild(mount);
  }

  render(
    <LabelSvg {...layout} text={labelTextFromHost(host)} />,
    mount,
  );
};
