import type { RenderChromeFn } from "@kite9/templating";
import { render } from "preact";
import { METROPOLIS_FACE } from "../../fonts/metropolis.js";
import styles from "./styles.css?inline";
import { hostTitle } from "../host.js";

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

/** {@link RenderChromeFn} for container / context chrome. */
export const renderContainerChrome: RenderChromeFn = (host, shadow) => {
  render(<ContainerChrome title={hostTitle(host)} />, shadow);
};
