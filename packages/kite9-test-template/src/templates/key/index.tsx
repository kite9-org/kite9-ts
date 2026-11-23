import type { RenderHtmlFn } from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";
import { hostTitle } from "../host.js";

export const KEY_STYLES = METROPOLIS_FACE + styles;

export type KeyChromeProps = {
  title: string;
};

export function KeyChrome({ title }: KeyChromeProps) {
  return (
    <>
      <style>{KEY_STYLES}</style>
      <div class="key-card" part="card">
        <header part="title">{title}</header>
        <div class="body" part="body">
          <slot />
        </div>
      </div>
    </>
  );
}

/** {@link RenderHtmlFn} for diagram key / legend chrome. */
export const renderKeyChrome: RenderHtmlFn = (host, shadow) => {
  render(<KeyChrome title={hostTitle(host)} />, shadow);
};
