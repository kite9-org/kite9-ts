import type { Diagram, Dimension } from "@kite9/model";
import type { CompactionSlideable } from "./CompactionSlideable.js";
import type { SlackOptimisation } from "./SlackOptimisation.js";

export interface Compaction {
  getSlackOptimisation(d: Dimension): SlackOptimisation;

  getDiagram(): Diagram;

  /**
   * Sets up allowed intersections
   */
  addNeighbour(
    along: CompactionSlideable | null | undefined,
    n1: CompactionSlideable | null | undefined,
    n2: CompactionSlideable | null | undefined,
  ): void;

  /**
   * Used to retrieve intersections when we're doing routing.
   */
  getNeighbours(along: CompactionSlideable, perp: CompactionSlideable): ReadonlySet<CompactionSlideable>;

  getNeighbourSetsOn(s: CompactionSlideable): ReadonlySet<ReadonlySet<CompactionSlideable>>;

  /**
   * Like the above but with less neighbour information.
   */
  getLocationsOn(s: CompactionSlideable): ReadonlySet<CompactionSlideable>;

  checkConsistency(): void;

  /**
   * Duplicates neighbours arriving on one slideable to the other
   */
  copyNeighbourMap(
    from: CompactionSlideable | null | undefined,
    to: CompactionSlideable | null | undefined,
  ): void;
}
