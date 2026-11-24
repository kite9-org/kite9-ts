import {
  DiagramElementType,
  fromCssValue,
  resolveDiagramElementType,
} from "@kite9/css";

const SELECTABLE_TYPES = new Set<DiagramElementType>([
  DiagramElementType.CONNECTED_RECTANGULAR,
  DiagramElementType.PORT,
  DiagramElementType.CONNECTION,
  DiagramElementType.LABEL,
]);

/** Prefer `k9-type` attribute (template contract), then computed `--kite9-type`. */
export function resolveElementType(el: Element): DiagramElementType | null {
  const attr = el.getAttribute("k9-type");
  if (attr) {
    const fromAttr = fromCssValue(attr, DiagramElementType);
    if (fromAttr != null) return fromAttr;
  }
  return resolveDiagramElementType(el);
}

export function isRectangular(v?: Element | null): boolean {
  return (
    v != null &&
    resolveElementType(v) === DiagramElementType.CONNECTED_RECTANGULAR
  );
}

/** Space-separated tokens from `k9-ui`. */
export function getAffordances(element: Element): string[] {
  const raw = element.getAttribute("k9-ui") ?? "";
  return raw.split(/\s+/).filter(Boolean);
}

export function hasAffordance(element: Element, name: string): boolean {
  return getAffordances(element).includes(name);
}

function isSelectableHost(v: Element): boolean {
  const type = resolveElementType(v);
  return (
    type != null &&
    SELECTABLE_TYPES.has(type) &&
    hasAffordance(v, "selectable")
  );
}

/**
 * Resolve a pointer hit to a light-DOM selectable host.
 * Requires `k9-ui` including `selectable`. Dual-path: light-DOM walk, or
 * SVG `data-link-id` / `data-label-id` → host.
 */
export function getKite9Target(
  v: Node | null,
  root: Element,
): Element | null {
  if (v == null || !(v instanceof Element)) {
    return null;
  }

  const linkId =
    v.getAttribute("data-link-id") ??
    v.closest("[data-link-id]")?.getAttribute("data-link-id");
  if (linkId) {
    const host = root.querySelector(`#${CSS.escape(linkId)}`);
    if (
      host &&
      resolveElementType(host) === DiagramElementType.CONNECTION &&
      hasAffordance(host, "selectable")
    ) {
      return host;
    }
  }

  const labelId =
    v.getAttribute("data-label-id") ??
    v.closest("[data-label-id]")?.getAttribute("data-label-id");
  if (labelId) {
    const host = root.querySelector(`#${CSS.escape(labelId)}`);
    if (
      host &&
      resolveElementType(host) === DiagramElementType.LABEL &&
      hasAffordance(host, "selectable")
    ) {
      return host;
    }
  }

  let cur: Element | null = v;
  while (cur) {
    if (cur === root) return null;
    if (isSelectableHost(cur)) {
      return cur;
    }
    const rootNode = cur.getRootNode();
    if (rootNode instanceof ShadowRoot) {
      cur = rootNode.host;
      continue;
    }
    cur = cur.parentElement;
  }

  return null;
}
