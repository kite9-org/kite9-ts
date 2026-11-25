import type { DiagramElement } from "@kite9/model";

/** Represent all or part of one or more underlying (real) diagram elements. */
export interface ConstructionElement {
  isPartOf(de: DiagramElement | null): boolean;
}
