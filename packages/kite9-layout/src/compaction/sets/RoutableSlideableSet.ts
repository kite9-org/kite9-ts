import type { CompactionSlideable } from "../CompactionSlideable.js";
import type { Side } from "../Side.js";
import type { BaseSlideableSet } from "./SlideableSet.js";

/**
 * A routable slideable set maps to a group, allowing you to move above, below or through the group.
 */
export interface RoutableSlideableSet extends BaseSlideableSet<RoutableSlideableSet> {
  readonly kind: "routable";

  readonly c: CompactionSlideable | null;
  readonly bl: CompactionSlideable | null;
  readonly br: CompactionSlideable | null;

  /** the RSS before we replaced the side */
  readonly previous: RoutableSlideableSet | null;

  replaceSide(s: CompactionSlideable | null, side: Side): RoutableSlideableSet;
}
