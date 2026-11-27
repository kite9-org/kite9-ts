import { render } from "preact";

export type SimpleDiagramOptions = {
  /** Diagram element id (default `"simple"`). */
  id?: string;
  /** e.g. `"edit"` for behaviour harnesses. */
  mode?: string;
};

/**
 * Two glyphs + arrow with side links — same markup as routes/layout
 * `test_02_01_TwoGlyphsArrow`.
 */
export function SimpleDiagram({ id = "simple", mode }: SimpleDiagramOptions) {
  return (
    <kite9-diagram id={id} mode={mode}>
      <kite9-glyph id="one" label="One" />
      <kite9-arrow id="meets" label="meets" />
      <kite9-glyph id="two" label="Two" />
      <kite9-link id="l1">
        <from reference="meets" />
        <to reference="one" />
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>NONE</toDecoration>
      </kite9-link>
      <kite9-link id="l2">
        <from reference="meets" />
        <to reference="two" />
        <fromDecoration>NONE</fromDecoration>
        <toDecoration>NONE</toDecoration>
      </kite9-link>
    </kite9-diagram>
  );
}

/** Return a detached `kite9-diagram` element. */
export function createSimpleDiagram(
  options: SimpleDiagramOptions = {},
): Element {
  const wrap = document.createElement("div");
  render(<SimpleDiagram {...options} />, wrap);
  const el = wrap.firstElementChild;
  if (!el) {
    throw new Error("createSimpleDiagram: failed to render markup");
  }
  el.remove();
  return el;
}

/** Append a simple diagram under `parent` and return it. */
export function mountSimpleDiagram(
  parent: ParentNode,
  options: SimpleDiagramOptions = {},
): Element {
  const el = createSimpleDiagram(options);
  parent.appendChild(el);
  return el;
}
