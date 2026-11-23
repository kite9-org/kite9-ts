import type { RenderChromeFn } from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

/** Links paint into an SVG layer; chrome is a minimal group marker. */
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

/** {@link RenderChromeFn} for link chrome. */
export const renderLinkChrome: RenderChromeFn = (host, shadow) => {
  render(
    <LinkChrome id={host.getAttribute("id") || "link"} />,
    shadow,
  );
};
