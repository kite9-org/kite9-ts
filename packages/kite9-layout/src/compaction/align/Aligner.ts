import type { Dimension, Rectangular } from "@kite9/model";
import type { Compaction } from "../Compaction.js";

export interface Aligner {
  /**
   * Applies alignment to all rectangulars along a the same given axis.
   * Each AlignedRectangular may have a different alignment, but they will have all passed
   * through willAlign with true.
   */
  alignFor(co: Rectangular, de: ReadonlySet<Rectangular>, c: Compaction, d: Dimension): void;

  willAlign(de: Rectangular, d: Dimension): boolean;
}
