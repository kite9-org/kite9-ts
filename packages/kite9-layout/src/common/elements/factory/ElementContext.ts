import type { DiagramElement } from "@kite9/model";

/**
 * Minimal DOM-bridge context handed to a {@link DiagramElementFactory}.
 *
 * The Kotlin `ElementContext` is a large CSS/XPath bridge; here only the pieces the layout
 * stage needs are declared. Implementations (templating/browser) may provide more.
 */
export interface ElementContext {
  /** Pixel value of a CSS property on `e`. */
  getCssStyleDoubleProperty?(prop: string, e: Element): number;
  getCssStyleStringProperty?(prop: string, e: Element): string | null;

  /** Registers the diagram element created for a DOM element. */
  register?(x: Element, out: DiagramElement): void;
  getRegisteredDiagramElement?(x: Element): DiagramElement | null;
  getChildDiagramElements?(parent: DiagramElement): DiagramElement[];

  /** Bounding box of `x` in pixels, if it has been laid out by the host. */
  bounds?(x: Element): { x: number; y: number; width: number; height: number } | null;
  textWidth?(s: string, inside: Element): number;
}
