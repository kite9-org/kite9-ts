import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostText,
  type RenderHtmlFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

export const TEXT_LINE_STYLES = METROPOLIS_FACE + styles;

/** {@link RenderHtmlFn} for connection-participating text lines inside glyphs. */
export const renderTextLineChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTED_RECTANGULAR,
    ui: "selectable",
  });
  const text = host.getAttribute("label") || hostText(host);
  render(
    <>
      <style>{TEXT_LINE_STYLES}</style>
      <div class="line" part="line">
        {text}
      </div>
    </>,
    shadow,
  );
};
