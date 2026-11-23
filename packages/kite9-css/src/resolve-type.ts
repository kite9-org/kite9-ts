import { ELEMENT_TYPE_PROPERTY } from "./constants.js";
import { DiagramElementType } from "./enums.js";
import { fromCssValue } from "./values.js";

/**
 * Resolve `--kite9-type` from the host’s computed style (cascade includes
 * template `:host` defaults and author/light styles on the same element).
 *
 * Returns `null` for `none`, missing, or unknown values.
 */
export function resolveDiagramElementType(
  el: Element,
): DiagramElementType | null {
  const raw = getComputedStyle(el).getPropertyValue(ELEMENT_TYPE_PROPERTY).trim();
  return fromCssValue(raw.length > 0 ? raw : null, DiagramElementType);
}
