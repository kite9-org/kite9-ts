import { resolveDiagramElementType } from "@kite9/css";
import type { DiagramElementType } from "@kite9/model";
import type {
  ConnectionRenderLayout,
  LabelRenderLayout,
  TerminatorRenderLayout,
} from "@kite9/model";

/**
 * Paint into the HTML scene: host open shadow root
 * (e.g. `renderContainerChrome`).
 */
export type RenderHtmlFn = (host: Element, shadow: ShadowRoot) => void;

/**
 * Paint into the SVG scene under a link `<g>`
 * (connection path, hit-boxes, etc.).
 * `host` is the light-DOM link — source of end/decoration markup.
 */
export type RenderSvgFn = (
  parent: SVGGElement,
  layout: ConnectionRenderLayout,
  host: Element,
) => void;

/**
 * Paint into SVG `<defs>` on the links-layer
 * (terminator markers, filters, etc.).
 */
export type RenderDefsFn = (
  svg: SVGSVGElement,
  layout: TerminatorRenderLayout,
) => void;

/**
 * Paint a connection label into the SVG scene
 * (`foreignObject` under the link `<g>`).
 * `host` is the light-DOM label — source of text / chrome content.
 */
export type RenderSvgLabelFn = (
  parent: SVGGElement,
  layout: LabelRenderLayout,
  host: Element,
) => void;

/**
 * Per-tag template: model type + optional painters for the HTML scene,
 * SVG scene, and/or SVG defs. Different tags can supply different templates.
 */
export type TemplateEntry = {
  /**
   * Pack default type when computed `--kite9-type` is unset
   * (e.g. tags with no chrome / no `:host` rule yet).
   */
  elementType: DiagramElementType;
  /** HTML scene — shadow-DOM host chrome. */
  renderHtml?: RenderHtmlFn;
  /** SVG scene — connection path / hit-boxes into the link `<g>`. */
  renderSvg?: RenderSvgFn;
  /** SVG defs — terminator markers (and similar shared defs). */
  renderDefs?: RenderDefsFn;
  /** SVG scene — label `foreignObject` into the link `<g>`. */
  renderLabel?: RenderSvgLabelFn;
};

/** Maps light-DOM tag names (lowercase local names) to templates. */
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
 * No-op (returns null) when the pack entry has no `renderHtml`.
 */
export function paintHost(
  host: Element,
  pack: TemplatePack,
): ShadowRoot | null {
  const entry = pack.resolve(localTag(host));
  if (!entry?.renderHtml) return null;

  const existing = (host as Element & { shadowRoot?: ShadowRoot | null })
    .shadowRoot;
  const shadow =
    existing ??
    (host as HTMLElement).attachShadow({ mode: "open" });

  entry.renderHtml(host, shadow);
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
