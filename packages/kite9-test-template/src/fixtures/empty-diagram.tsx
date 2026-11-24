import { render } from "preact";

export type EmptyDiagramOptions = {
  /** Diagram element id (default `"empty"`). */
  id?: string;
  /** e.g. `"edit"` for behaviour harnesses. */
  mode?: string;
};

/** Canonical empty light-DOM diagram — shared by preview and unit tests. */
export function EmptyDiagram({ id = "empty", mode }: EmptyDiagramOptions) {
  return <kite9-diagram id={id} mode={mode} />;
}

/** Return a detached empty `kite9-diagram` element. */
export function createEmptyDiagram(
  options: EmptyDiagramOptions = {},
): Element {
  const wrap = document.createElement("div");
  render(<EmptyDiagram {...options} />, wrap);
  const el = wrap.firstElementChild;
  if (!el) {
    throw new Error("createEmptyDiagram: failed to render markup");
  }
  el.remove();
  return el;
}

/** Append an empty diagram under `parent` and return it. */
export function mountEmptyDiagram(
  parent: ParentNode,
  options: EmptyDiagramOptions = {},
): Element {
  const el = createEmptyDiagram(options);
  parent.appendChild(el);
  return el;
}
