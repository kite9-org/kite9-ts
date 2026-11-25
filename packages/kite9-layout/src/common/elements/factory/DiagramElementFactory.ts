import type { ConnectedRectangular, DiagramElement } from "@kite9/model";
import type { ElementContext } from "./ElementContext.js";
import type { TemporaryConnectedRectangular } from "./TemporaryConnectedRectangular.js";

/**
 * Allows for the conversion from an `X` (usually a DOM element) to a Kite9 `DiagramElement`
 * (used in layout).
 */
export interface DiagramElementFactory<X> {
  setElementContext(ec: ElementContext): void;

  createDiagramElement(x: X, parent: DiagramElement | null): DiagramElement | null;

  createTemporaryConnected(
    parent: ConnectedRectangular,
    idSuffix: string,
  ): TemporaryConnectedRectangular;
}
