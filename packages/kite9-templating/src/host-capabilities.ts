import { DiagramElementType } from "@kite9/css";

/** Read a display title from common host attributes. */
export function hostTitle(host: Element): string {
  // Explicit `label=""` (or `title=""`) wins — do not fall back to id.
  if (host.hasAttribute("label")) return host.getAttribute("label") ?? "";
  if (host.hasAttribute("title")) return host.getAttribute("title") ?? "";
  return host.getAttribute("id") || host.localName;
}

/** Collapsed text content of a host (e.g. label chrome). */
export function hostText(host: Element): string {
  return (host.textContent ?? "").replace(/\s+/g, " ").trim();
}

export type HostCapabilities = {
  /** `k9-type` — diagram element kind. Do not use `k9-contains`. */
  type: DiagramElementType;
  /**
   * Space-separated `k9-ui` affordances (e.g. `selectable size`).
   * Omit or empty when the element has no edit affordances.
   */
  ui?: string;
};

/**
 * Declare what a light-DOM host *is* and which behaviours may act on it.
 *
 * Call from {@link RenderHtmlFn} implementations. Templates stay view-only:
 * edit gadgets (resize handles, overlays, etc.) belong in behaviours that
 * read `k9-type` / `k9-ui`, not in the template chrome.
 */
export function applyHostCapabilities(
  host: Element,
  { type, ui }: HostCapabilities,
): void {
  host.setAttribute("k9-type", type);
  if (ui && ui.trim().length > 0) {
    host.setAttribute("k9-ui", ui.trim());
  } else {
    host.removeAttribute("k9-ui");
  }
}
