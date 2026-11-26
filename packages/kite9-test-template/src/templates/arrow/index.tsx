import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostTitle,
  type RenderHtmlFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

export const ARROW_STYLES = METROPOLIS_FACE + styles;

export type ArrowChromeProps = {
  title: string;
};

export function ArrowChrome({ title }: ArrowChromeProps) {
  return (
    <>
      <style>{ARROW_STYLES}</style>
      <div class="card" part="card">
        <header part="title">{title}</header>
      </div>
    </>
  );
}

/** {@link RenderHtmlFn} for arrow chrome (view only). */
export const renderArrowChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTED_RECTANGULAR,
    ui: "selectable size",
  });
  render(<ArrowChrome title={hostTitle(host)} />, shadow);
};
