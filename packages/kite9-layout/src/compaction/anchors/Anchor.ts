import type { DiagramElement } from "@kite9/model";

/**
 * Maps how a slideable works in relation to the
 * diagram elements around it.
 *
 * Implementations are value objects (Kotlin data classes): compare with `equals`.
 */
export interface Anchor<X> {
  readonly e: DiagramElement;
  readonly s: X;
  equals(other: unknown): boolean;
}
