import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostTitle,
  type RenderHtmlFn,
} from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";

export const CONTAINER_STYLES = METROPOLIS_FACE + styles;

export type ContainerChromeProps = {
  title: string;
};

export function ContainerChrome({ title }: ContainerChromeProps) {
  return (
    <>
      <style>{CONTAINER_STYLES}</style>
      <div class="container-card" part="card">
        <header part="title">{title}</header>
        <slot />
      </div>
    </>
  );
}

/** {@link RenderHtmlFn} for container chrome (view only). */
export const renderContainerChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTED_RECTANGULAR,
    ui: "selectable size",
  });
  render(<ContainerChrome title={hostTitle(host)} />, shadow);
};
