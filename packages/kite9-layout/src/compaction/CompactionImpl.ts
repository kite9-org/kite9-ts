import { Dimension } from "@kite9/model";
import type { Diagram } from "@kite9/model";
import { kite9Log, type Kite9Log } from "../logging/Kite9Log.js";
import type { Logable } from "../logging/Logable.js";
import { LogicException } from "../logging/LogicException.js";
import { addToSuperSet, superSetEquals, union } from "./CollectionUtils.js";
import type { Compaction } from "./Compaction.js";
import type { CompactionSlideable } from "./CompactionSlideable.js";
import { SlackOptimisation } from "./SlackOptimisation.js";

type S = CompactionSlideable;
export type NeighbourSuperSet = Set<ReadonlySet<S>>;

/**
 * Flyweight class that handles the state of the compaction as it goes along.
 * Contains lots of utility methods too.
 *
 * @author robmoffat
 */
export class CompactionImpl implements Compaction, Logable {
  private readonly horizontalSegmentSlackOptimisation: SlackOptimisation;
  private readonly verticalSegmentSlackOptimisation: SlackOptimisation;

  readonly neighbourDetails: Map<S, NeighbourSuperSet> = new Map();

  private _log: Kite9Log | null = null;

  constructor(private readonly diagram: Diagram) {
    this.horizontalSegmentSlackOptimisation = new SlackOptimisation(this, Dimension.H);
    this.verticalSegmentSlackOptimisation = new SlackOptimisation(this, Dimension.V);
  }

  get log(): Kite9Log {
    return (this._log ??= kite9Log(this));
  }

  get prefix(): string {
    return "C2CI";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  getSlackOptimisation(d: Dimension): SlackOptimisation {
    return d === Dimension.H
      ? this.horizontalSegmentSlackOptimisation
      : this.verticalSegmentSlackOptimisation;
  }

  getDiagram(): Diagram {
    return this.diagram;
  }

  private getOrCreateSuperSet(s: S): NeighbourSuperSet {
    let ss = this.neighbourDetails.get(s);
    if (ss == null) {
      ss = new Set();
      this.neighbourDetails.set(s, ss);
    }
    return ss;
  }

  addNeighbour(along: S | null | undefined, n1: S | null | undefined, n2: S | null | undefined): void {
    if (n1 == null || n2 == null || along == null) {
      // first guard - along, n1 and n2 must be non-null
      return;
    }

    if (along.dimension === n2.dimension || along.dimension === n1.dimension) {
      throw new LogicException("Dimensions are wrong");
    }

    if (along.getRectAnchors().length > 0) {
      // second guard - you can't route along rectangular edges
      return;
    }

    const superSet = this.getOrCreateSuperSet(along);

    const ns1 = find(superSet, (it) => it.has(n1));
    const ns2 = find(superSet, (it) => it.has(n2));

    if (ns1 == null && ns2 == null) {
      addToSuperSet(superSet, new Set([n1, n2]));
    } else if (ns1 == null && ns2 != null) {
      superSet.delete(ns2);
      addToSuperSet(superSet, union(ns2, [n1]));
    } else if (ns2 == null && ns1 != null) {
      superSet.delete(ns1);
      addToSuperSet(superSet, union(ns1, [n2]));
    } else if (ns2 !== ns1 && ns2 != null && ns1 != null) {
      const ns3 = union(ns2, ns1);
      superSet.delete(ns2);
      superSet.delete(ns1);
      addToSuperSet(superSet, ns3);
    } else {
      // already in the same set.
    }
  }

  /**
   * If any sets within the superset share members, join those sets.
   */
  private simplifySuperSet(s: Iterable<ReadonlySet<S>>): NeighbourSuperSet {
    const out: NeighbourSuperSet = new Set();

    for (const s1 of s) {
      const hitSets = [...out].filter((s2) => [...s2].some((e) => s1.has(e)));
      const newSet = union(...hitSets, s1);
      for (const h of hitSets) out.delete(h);
      addToSuperSet(out, newSet);
    }

    return out;
  }

  getNeighbours(along: S, perp: S): ReadonlySet<S> {
    const superSet = this.getOrCreateSuperSet(along);
    return find(superSet, (it) => it.has(perp)) ?? new Set();
  }

  private getSlideablesIncidentWith(s: S): Set<S> {
    const out = new Set<S>();
    for (const [k, v] of this.neighbourDetails) {
      if (find(v, (it) => it.has(s)) != null) {
        out.add(k);
      }
    }
    return out;
  }

  replaceIntersections(s1: S, s2: S, sNew: S): void {
    // merge alongs
    const s1ss = this.neighbourDetails.get(s1) ?? new Set();
    this.neighbourDetails.delete(s1);
    const s2ss = this.neighbourDetails.get(s2) ?? new Set();
    this.neighbourDetails.delete(s2);
    const combinedSs = this.simplifySuperSet(union(s1ss, s2ss));
    this.neighbourDetails.set(sNew, combinedSs);

    const replaceInSuperSet = (ss: NeighbourSuperSet): NeighbourSuperSet => {
      const out: NeighbourSuperSet = new Set();

      for (const it of ss) {
        if (it.has(s1) || it.has(s2)) {
          const newIt = new Set(it);
          newIt.delete(s1);
          newIt.delete(s2);
          newIt.add(sNew);
          addToSuperSet(out, newIt);
        } else {
          addToSuperSet(out, it);
        }
      }

      return this.simplifySuperSet(out);
    };

    // go through contents and replace
    for (const ss of this.neighbourDetails.values()) {
      const replaced = replaceInSuperSet(ss);
      ss.clear();
      for (const x of replaced) addToSuperSet(ss, x);
    }
  }

  checkConsistency(): void {
    this.verticalSegmentSlackOptimisation.checkConsistency();
    this.horizontalSegmentSlackOptimisation.checkConsistency();

    for (const [s, ss] of this.neighbourDetails) {
      if (s.isDone()) {
        throw new LogicException("Done slideable");
      }

      for (const m of ss) {
        for (const it of m) {
          if (it.isDone()) {
            throw new LogicException("Done slideable");
          }
        }
      }

      const ss2 = this.simplifySuperSet(ss);
      if (!superSetEquals(ss2, ss)) {
        throw new LogicException("Simplified!");
      }
    }

    this.log.send(`Consistency ${this.neighbourDetails.size} ${this.neighbourDetails.size}`);
    let total = 0;
    for (const v of this.neighbourDetails.values()) total += v.size;
    this.log.send(`Consistency ${total}`);
  }

  getNeighbourSetsOn(s: S): ReadonlySet<ReadonlySet<S>> {
    return this.getOrCreateSuperSet(s);
  }

  getLocationsOn(s: S): ReadonlySet<S> {
    return this.getSlideablesIncidentWith(s);
  }

  copyNeighbourMap(from: S | null | undefined, to: S | null | undefined): void {
    if (from != null && to != null) {
      const toIsOrbit = to.getOrbitAnchors().length > 0;

      const toGroup = new Set<S>();

      // add "to" to any neighbour set containing from
      for (const [k, ss] of this.neighbourDetails) {
        const addTo = [...ss].filter((it) => it.has(from));
        for (const a of addTo) ss.delete(a);
        for (const a of addTo) addToSuperSet(ss, union(a, [to]));
        if (addTo.length > 0) {
          toGroup.add(k);
        }
      }

      if (toIsOrbit && toGroup.size > 0) {
        const [first, ...rest] = toGroup;
        for (const r of rest) {
          this.addNeighbour(to, first, r);
        }
      }
    }
  }
}

function find<T>(s: Iterable<T>, p: (t: T) => boolean): T | null {
  for (const x of s) {
    if (p(x)) return x;
  }
  return null;
}
