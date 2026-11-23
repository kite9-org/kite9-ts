import { resolveDiagramElementType } from "@kite9/css";
import type { DiagramElementType } from "@kite9/model";

/**
 * Common contract for template chrome (e.g. `renderContainerChrome`).
 * Implementations live in template packs; they read props from `host` and
 * paint into `shadow`.
 */
export type RenderChromeFn = (host: Element, shadow: ShadowRoot) => void;

/** @deprecated Use {@link RenderChromeFn}. */
export type PaintFn = RenderChromeFn;

export type TemplateEntry = {
  /**
   * Pack default type when computed `--kite9-type` is unset
   * (e.g. tags with no chrome / no `:host` rule yet).
   */
  elementType: DiagramElementType;
  /** Shadow-DOM chrome renderer (`renderContainerChrome`, etc.). */
  render?: RenderChromeFn;
};

/** Maps light-DOM tag names (lowercase local names) to template chrome. */
export type TemplatePack = {
  readonly name: string;
  resolve(tagName: string): TemplateEntry | null;
};

export function createTemplatePack(
  name: string,
  entries: Record<string, TemplateEntry>,
): TemplatePack {
  const map = new Map<string, TemplateEntry>();
  for (const [tag, entry] of Object.entries(entries)) {
    map.set(tag.toLowerCase(), entry);
  }
  return {
    name,
    resolve(tagName: string): TemplateEntry | null {
      return map.get(tagName.toLowerCase()) ?? null;
    },
  };
}

export function localTag(el: Element): string {
  const raw = el.localName || el.tagName || "";
  return raw.includes(":") ? raw.slice(raw.indexOf(":") + 1) : raw;
}

/**
 * Paint template chrome into the host’s open shadow root.
 * No-op (returns null) when the pack entry has no `render`.
 */
export function paintHost(
  host: Element,
  pack: TemplatePack,
): ShadowRoot | null {
  const entry = pack.resolve(localTag(host));
  if (!entry?.render) return null;

  const existing = (host as Element & { shadowRoot?: ShadowRoot | null })
    .shadowRoot;
  const shadow =
    existing ??
    (host as HTMLElement).attachShadow({ mode: "open" });

  entry.render(host, shadow);
  return shadow;
}

/**
 * Resolve the model type for a host: paint template chrome (so `:host`
 * `--kite9-type` applies), then read computed style. Falls back to the pack
 * default when CSS has no value yet.
 */
export function resolveHostElementType(
  host: Element,
  pack: TemplatePack,
): DiagramElementType | null {
  const entry = pack.resolve(localTag(host));
  paintHost(host, pack);
  return resolveDiagramElementType(host) ?? entry?.elementType ?? null;
}
