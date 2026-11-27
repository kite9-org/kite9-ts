import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostTitle,
  type RenderHtmlFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

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
          {/* Content children only — sockets use slot="port". */}
          <slot />
        </div>
      </div>
      {/* Always visible: absolute ports must not sit under display:none .body. */}
      <slot name="port" part="ports" />
    </>
  );
}

/** Non-port light-DOM children → open body chrome (`data-has-body`). */
function syncHasBody(host: Element): void {
  const hasBody = Array.from(host.children).some((c) => c.slot !== "port");
  host.toggleAttribute("data-has-body", hasBody);
}

/** {@link RenderHtmlFn} for glyph / arrow chrome (view only). */
export const renderGlyphChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTED_RECTANGULAR,
    ui: "selectable size",
  });
  syncHasBody(host);
  render(<GlyphChrome title={hostTitle(host)} />, shadow);
};
