import type { RenderHtmlFn } from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";
import { hostTitle } from "../host.js";

export const GLYPH_STYLES = METROPOLIS_FACE + styles;

export type GlyphChromeProps = {
  title: string;
};

export function GlyphChrome({ title }: GlyphChromeProps) {
  return (
    <>
      <style>{GLYPH_STYLES}</style>
      <div class="card" part="card">
        <header part="title">{title}</header>
        <div class="body" part="body">
          <slot />
        </div>
      </div>
    </>
  );
}

/** {@link RenderHtmlFn} for glyph / arrow chrome. */
export const renderGlyphChrome: RenderHtmlFn = (host, shadow) => {
  render(<GlyphChrome title={hostTitle(host)} />, shadow);
};
