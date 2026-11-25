import type { Rectangular } from "@kite9/model";
import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RoutableSlideableSet } from "./RoutableSlideableSet.js";
import type { BaseSlideableSet } from "./SlideableSet.js";

export interface RectangularSlideableSet extends BaseSlideableSet<RectangularSlideableSet> {
  readonly kind: "rectangular";

  readonly e: Rectangular;
  readonly l: CompactionSlideable;
  readonly r: CompactionSlideable;

  getRectangularSlideables(): ReadonlySet<CompactionSlideable>;

  /**
   * Returns a RoutableSlideableSet unless the rectangular is a diagram.
   */
  wrapInRoutable(): RoutableSlideableSet | null;
}
