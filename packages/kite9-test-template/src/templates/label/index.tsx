import type { RenderChromeFn } from "@kite9/templating";
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

/** {@link RenderChromeFn} for fromLabel / toLabel chrome. */
export const renderLabelChrome: RenderChromeFn = (host, shadow) => {
  render(<LabelChrome text={hostText(host)} />, shadow);
};
