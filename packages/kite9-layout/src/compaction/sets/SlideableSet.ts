import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { RectangularSlideableSet } from "./RectangularSlideableSet.js";
import type { RoutableSlideableSet } from "./RoutableSlideableSet.js";

export interface BaseSlideableSet<X> {
  /** Discriminator standing in for Kotlin's sealed-interface `is` checks. */
  readonly kind: "rectangular" | "routable";

  /**
   * Returns the collection of slideables that enter one side
   * of the set and leave on the other.
   */
  getAll(): ReadonlySet<CompactionSlideable>;

  replace(s: CompactionSlideable, withS: CompactionSlideable): X;

  readonly done: boolean;

  readonly number: number;
}

/** Kotlin `sealed interface SlideableSet<X>`. */
export type SlideableSet = RectangularSlideableSet | RoutableSlideableSet;

export function isRectangularSlideableSet(
  ss: SlideableSet | null | undefined,
): ss is RectangularSlideableSet {
  return ss != null && ss.kind === "rectangular";
}

export function isRoutableSlideableSet(
  ss: SlideableSet | null | undefined,
): ss is RoutableSlideableSet {
  return ss != null && ss.kind === "routable";
}
