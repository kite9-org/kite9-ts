import type { Comparable } from "@kite9/model";

export interface PathLocation<X extends PathLocation<X>> extends Comparable<X> {
  /**
   * Key used to de-duplicate paths in the SSP state. Compared with Kotlin `equals` / `hashCode`
   * semantics (see `valueEquals` / `valueHashCode`).
   */
  getLocation(): unknown;

  isActive(): boolean;

  setActive(b: boolean): void;
}
