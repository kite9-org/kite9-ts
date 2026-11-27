import {
  type DiagramElement,
  type SizedRectangular,
} from "@kite9/model";

export type MeasuredSize = { w: number; h: number };

export interface ElementSizer {
  /** Measured content size of a rectangular (DOM rect or minimum size). */
  measure(de: DiagramElement): MeasuredSize;
}

export interface DomElementSizerOptions {
  getHost?: (de: DiagramElement) => Element | null;
}

/**
 * Measures elements through their DOM hosts (`getBoundingClientRect`).
 */
export class DomElementSizer implements ElementSizer {
  private readonly getHost: (de: DiagramElement) => Element | null;

  constructor(options: DomElementSizerOptions = {}) {
    this.getHost =
      options.getHost ??
      ((de) => {
        const e = de as { el?: unknown; host?: unknown };
        const h = e.el ?? e.host;
        return typeof (h as Element | undefined)?.getBoundingClientRect ===
          "function"
          ? (h as Element)
          : null;
      });
  }

  measure(de: DiagramElement): MeasuredSize {
    const host = this.getHost(de);
    if (host instanceof HTMLElement) {
      // Stretch fills the grid area after tracks exist. Before arrange, it
      // inflates getBoundingClientRect to the parent size — measure intrinsic.
      const prevJS = host.style.justifySelf;
      const prevAS = host.style.alignSelf;
      const cs = getComputedStyle(host);
      const stretched =
        cs.justifySelf === "stretch" || cs.alignSelf === "stretch";
      if (stretched) {
        host.style.justifySelf = "start";
        host.style.alignSelf = "start";
      }
      try {
        const r = host.getBoundingClientRect();
        if (r.width > 0 || r.height > 0) {
          return { w: r.width, h: r.height };
        }
      } finally {
        if (stretched) {
          host.style.justifySelf = prevJS;
          host.style.alignSelf = prevAS;
        }
      }
    } else if (host) {
      const r = host.getBoundingClientRect();
      if (r.width > 0 || r.height > 0) {
        return { w: r.width, h: r.height };
      }
    }
    const ms = (de as Partial<SizedRectangular>).getMinimumSize?.();
    return { w: ms?.w ?? 0, h: ms?.h ?? 0 };
  }
}

function parseCssPx(raw: string): number | undefined {
  if (!raw || raw === "auto" || raw === "none") return undefined;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

/** Authored CSS `width` / `height` when both are set as definite lengths on the style attribute. */
export function authoredCssSize(de: DiagramElement): MeasuredSize | undefined {
  const host = (de as { el?: HTMLElement }).el;
  if (!host) return undefined;
  const w = parseCssPx(host.style.width);
  const h = parseCssPx(host.style.height);
  if (w != null && h != null) return { w, h };
  return undefined;
}

/**
 * Authored CSS `min-width` / `min-height` on the style attribute (or computed
 * when the style attr sets them). Either axis may be omitted.
 */
export function authoredCssMins(
  de: DiagramElement,
): { w?: number; h?: number } | undefined {
  const host = (de as { el?: HTMLElement }).el;
  if (!host) return undefined;
  const w =
    parseCssPx(host.style.minWidth) ??
    parseCssPx(getComputedStyle(host).minWidth);
  const h =
    parseCssPx(host.style.minHeight) ??
    parseCssPx(getComputedStyle(host).minHeight);
  if (w == null && h == null) return undefined;
  return { ...(w != null ? { w } : {}), ...(h != null ? { h } : {}) };
}
