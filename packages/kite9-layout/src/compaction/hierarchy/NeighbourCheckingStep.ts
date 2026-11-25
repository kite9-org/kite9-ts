import { Dimension } from "@kite9/model";
import type { Group } from "../../planarization/rhd/grouping/basic/group/Group.js";
import { AbstractCompactionStep } from "../AbstractCompactionStep.js";
import { KeyedMap, union } from "../CollectionUtils.js";
import type { Compaction } from "../Compaction.js";
import type { CompactionImpl } from "../CompactionImpl.js";
import type { CompactionSlideable } from "../CompactionSlideable.js";

type S = CompactionSlideable;
type Extent = readonly [number, number];

const extentKey = (e: Extent): string => `${e[0]},${e[1]}`;

export class NeighbourCheckingStep extends AbstractCompactionStep {
  compact(c: Compaction, _g: Group): void {
    this.invertNeighbours(c as CompactionImpl);
    NeighbourCheckingStep.joinOverlappingNeighbourGroups(c as CompactionImpl);
  }

  /**
   * This runs a check to make sure that if you can move onto a slideable in
   * one direction, you can also move onto it in the other direction.
   */
  invertNeighbours(c: CompactionImpl): void {
    const invert = (perp: S): void => {
      const all = new Set<S>();
      for (const [k, v] of c.neighbourDetails) {
        if ([...v].some((it) => it.has(perp))) all.add(k);
      }

      let superSet = c.neighbourDetails.get(perp);
      if (superSet == null) {
        superSet = new Set();
        c.neighbourDetails.set(perp, superSet);
      }
      if (superSet.size === 1) {
        const newContents = union(all, superSet.values().next().value!);
        superSet.clear();
        superSet.add(newContents);
      }
    };

    c.getSlackOptimisation(Dimension.V).getAllSlideables().forEach(invert);
    c.getSlackOptimisation(Dimension.H).getAllSlideables().forEach(invert);
  }

  get prefix(): string {
    return "NBCS";
  }

  static joinOverlappingNeighbourGroups(c: CompactionImpl): void {
    const calculateExtent = (ss: ReadonlySet<S>): Extent => {
      const positions = [...ss].map((it) => it.minimumPosition);
      return [Math.min(...positions), Math.max(...positions)];
    };

    const inside = (x: number, a: Extent): boolean => x >= a[0] && x <= a[1];

    const overlaps = (a: Extent, b: Extent): boolean =>
      inside(a[0], b) || inside(a[1], b) || inside(b[0], a) || inside(b[1], a);

    const mergeExtents = (a: Extent, b: Extent): Extent => [
      Math.min(a[0], b[0]),
      Math.max(a[1], b[1]),
    ];

    for (const k of [...c.neighbourDetails.keys()]) {
      const oldGroups = c.neighbourDetails.get(k)!;
      // Kotlin `associateBy`: later groups with an equal extent replace earlier ones
      const extents = new KeyedMap<Extent, ReadonlySet<S>>(extentKey);
      for (const g of oldGroups) extents.set(calculateExtent(g), g);
      const newGroups = new KeyedMap<Extent, ReadonlySet<S>>(extentKey);
      for (const [e, ss] of extents) {
        const overlapGroups = [...newGroups].filter(([k2]) => overlaps(e, k2));
        if (overlapGroups.length === 0) {
          newGroups.set(e, ss);
        } else {
          const combinedExtent = overlapGroups
            .map(([k2]) => k2)
            .reduce((a, b) => mergeExtents(a, b));
          const combinedSet = union(...overlapGroups.map(([, v]) => v));
          for (const [k2] of overlapGroups) newGroups.delete(k2);
          newGroups.set(mergeExtents(combinedExtent, e), union(combinedSet, ss));
        }
      }
      c.neighbourDetails.set(k, new Set(newGroups.values()));
    }
  }
}
