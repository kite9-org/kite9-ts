import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostTitle,
  type RenderHtmlFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

export const DIAGRAM_STYLES = METROPOLIS_FACE + styles;

export type DiagramChromeProps = {
  label?: string;
};

export function DiagramChrome({ label = "Kite9 diagram" }: DiagramChromeProps) {
  return (
    <>
      <style>{DIAGRAM_STYLES}</style>
      <div class="stage" part="stage" role="img" aria-label={label}>
        <div class="objects-layer" part="objects">
          <slot />
        </div>
        <svg class="links-layer" part="links" />
        <div class="edit-overlay" part="edit-overlay" />
      </div>
    </>
  );
}

/** {@link RenderHtmlFn} for diagram chrome (view only). */
export const renderDiagramChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, { type: DiagramElementType.DIAGRAM });
  render(<DiagramChrome label={hostTitle(host)} />, shadow);
};
