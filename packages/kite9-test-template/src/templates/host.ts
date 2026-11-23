/** Shared host → chrome prop helpers for {@link RenderHtmlFn} implementations. */

export function hostTitle(host: Element): string {
  return (
    host.getAttribute("label") ||
    host.getAttribute("title") ||
    host.getAttribute("id") ||
    host.localName
  );
}

export function hostText(host: Element): string {
  return (host.textContent ?? "").replace(/\s+/g, " ").trim();
}
