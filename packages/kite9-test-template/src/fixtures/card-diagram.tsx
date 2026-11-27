import { render } from "preact";

export type CardDiagramOptions = {
  /** Diagram element id (default `"card"`). */
  id?: string;
  /** e.g. `"edit"` for behaviour harnesses. */
  mode?: string;
};

/** Canonical light-DOM card scene — shared by preview and behaviour Playwright. */
export function CardDiagram({ id = "card", mode }: CardDiagramOptions) {
  return (
    <kite9-diagram id={id} mode={mode}>
      <kite9-glyph id="g1" shape="CARD" label="Glyph" />

      <kite9-container id="c1" label="Context">
        <kite9-glyph id="g2" label="Nested">
          <kite9-socket id="s1" slot="port" direction="left" />
        </kite9-glyph>
      </kite9-container>

      <kite9-arrow id="a1" label="Arrow" />

      <kite9-key id="k1" label="Key" />

      <kite9-link id="l1" shape="NORMAL" drawDirection="right">
        <from reference="g1" />
        <to reference="a1" />
        <kite9-from-label id="fl1">
          <text>from</text>
        </kite9-from-label>
        <kite9-to-label id="tl1">
          <text>to</text>
        </kite9-to-label>
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>ARROW</toDecoration>
      </kite9-link>

      <kite9-link id="l2" shape="NORMAL">
        <from reference="a1" />
        <to reference="s1" />
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>ARROW</toDecoration>
      </kite9-link>
    </kite9-diagram>
  );
}

/** Return a detached `kite9-diagram` element. */
export function createCardDiagram(options: CardDiagramOptions = {}): Element {
  const wrap = document.createElement("div");
  render(<CardDiagram {...options} />, wrap);
  const el = wrap.firstElementChild;
  if (!el) {
    throw new Error("createCardDiagram: failed to render markup");
  }
  el.remove();
  return el;
}

/** Append a card diagram under `parent` and return it. */
export function mountCardDiagram(
  parent: ParentNode,
  options: CardDiagramOptions = {},
): Element {
  const el = createCardDiagram(options);
  parent.appendChild(el);
  return el;
}
