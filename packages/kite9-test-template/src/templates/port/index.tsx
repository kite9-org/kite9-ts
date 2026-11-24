import type { RenderHtmlFn } from "@kite9/templating";
import { render } from "preact";
import styles from "./styles.css?inline";

export const PORT_STYLES = styles;

export function PortChrome() {
  return (
    <>
      <style>{PORT_STYLES}</style>
      <div class="port" part="port" />
    </>
  );
}

/** {@link RenderHtmlFn} for port / socket chrome. */
export const renderPortChrome: RenderHtmlFn = (_host, shadow) => {
  render(<PortChrome />, shadow);
};
