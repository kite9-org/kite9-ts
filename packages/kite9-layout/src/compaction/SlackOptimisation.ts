import type { Dimension, PlacementPositioned, Positioned, Rectangular } from "@kite9/model";
import type { SlackOptimisationHost } from "../common/algorithms/so/Slideable.js";
import { kite9Log, type Kite9Log } from "../logging/Kite9Log.js";
import type { Logable } from "../logging/Logable.js";
import { LogicException } from "../logging/LogicException.js";
import { addToSuperSet } from "./CollectionUtils.js";
import type { CompactionImpl } from "./CompactionImpl.js";
import type { CompactionSlideable } from "./CompactionSlideable.js";
import type { RectangularSlideableSet } from "./sets/RectangularSlideableSet.js";
import type { RoutableSlideableSet } from "./sets/RoutableSlideableSet.js";
import { RoutableSlideableSetImpl } from "./sets/RoutableSlideableSetImpl.js";
import type { SlideableSet } from "./sets/SlideableSet.js";
import { Side } from "./Side.js";

type S = CompactionSlideable;

/**
 * Used for holding transitive distances
 */
export class Constraint {
  constructor(
    readonly forward: boolean,
    readonly dist: number,
  ) {}

  max(c2: Constraint | null): Constraint {
    if (c2 == null) {
      return this;
    }
    if (this.forward !== c2.forward) {
      throw new LogicException("Constraints must be in same direction");
    }
    return new Constraint(this.forward, Math.max(c2.dist, this.dist));
  }

  plus(c2: Constraint | null): Constraint {
    if (c2 == null) {
      return this;
    }
    if (this.forward !== c2.forward) {
      throw new LogicException("Constraints must be in same direction");
    }
    return new Constraint(this.forward, c2.dist + this.dist);
  }

  equals(other: unknown): boolean {
    return other instanceof Constraint && other.forward === this.forward && other.dist === this.dist;
  }
}

/**
 * Kotlin `C2SlackOptimisation`. Augments SlackOptimisation to keep track of diagram elements
 * underlying the slideables.
 *
 * @author robmoffat
 */
export class SlackOptimisation implements SlackOptimisationHost, Logable {
  private static nn = 0;

  static nextNumber(): number {
    return SlackOptimisation.nn++;
  }

  private _log: Kite9Log | null = null;
  private readonly slideables: Set<S> = new Set();
  pushCount = 0;

  /** Track mapping of elements to sets */
  private readonly rectangularMap: Map<Rectangular, RectangularSlideableSet> = new Map();
  private readonly pointMap: Map<PlacementPositioned, RoutableSlideableSet> = new Map();

  private readonly slideableMap: Map<S, Set<SlideableSet>> = new Map();
  private readonly containment1: Map<RoutableSlideableSet, RectangularSlideableSet[]> = new Map();
  private readonly containment2: Map<RectangularSlideableSet, RoutableSlideableSet> = new Map();
  private slideableOrdering: S[] = [];
  private readonly laneGroups: Set<ReadonlySet<S>> = new Set();

  constructor(
    readonly compaction: CompactionImpl,
    readonly dimension: Dimension,
  ) {}

  get log(): Kite9Log {
    return (this._log ??= kite9Log(this));
  }

  get prefix(): string {
    return "ASO ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  getSize(): number {
    return this.slideables.size;
  }

  ensureMinimumDistance(left: S, right: S, minLength: number): void {
    if (left.so !== right.so) {
      throw new LogicException("Mixing dimensions");
    }

    if (left.isDone()) {
      throw new LogicException("Left is done");
    }

    if (right.isDone()) {
      throw new LogicException("Right is done");
    }

    try {
      this.log.send(
        this.log.go() ? null : `Updating min distance to ${minLength} for ${left} to ${right}`,
      );
      left.addMinimumForwardConstraint(right, minLength);
      right.addMaximumForwardConstraint(left, minLength);
      this.log.send(
        this.log.go() ? null : `Updated min distance to ${minLength} for ${left} to ${right}`,
      );
    } catch (e) {
      if (!(e instanceof LogicException)) throw e;
      console.error(e);
      this.debugOutput(true);
    }
  }

  private debugOutput(minimums: boolean): void {
    const alreadyDone = new Set<S>();
    for (const slideable of this.slideables) {
      if (!alreadyDone.has(slideable)) {
        this.debugOutputSlideable(minimums, slideable, alreadyDone, 0);
      }
    }
  }

  private debugOutputSlideable(
    minimums: boolean,
    slideable: S,
    alreadyDone: Set<S>,
    indent: number,
  ): void {
    this.log.send(indent, slideable.toString());
    if (!alreadyDone.has(slideable)) {
      alreadyDone.add(slideable);
      for (const s2 of slideable.getForwardSlideables<S>(minimums)) {
        this.debugOutputSlideable(minimums, s2, alreadyDone, indent + 2);
      }
    }
  }

  ensureMaximumDistance(left: S, right: S, maxLength: number): void {
    if (left.so !== right.so) {
      throw new LogicException("Mixing dimensions");
    }

    if (left.isDone()) {
      throw new LogicException("Left is done");
    }

    if (right.isDone()) {
      throw new LogicException("Right is done");
    }
    try {
      this.log.send(
        this.log.go() ? null : `Updating max distance to ${maxLength} for ${left} to ${right}`,
      );
      right.addMinimumBackwardConstraint(left, maxLength);
      left.addMaximumBackwardConstraint(right, maxLength);
    } catch (e) {
      if (!(e instanceof LogicException)) throw e;
      this.debugOutput(false);
    }
  }

  getRectangularsOnSide(s: Side, ss: SlideableSet): Set<S> {
    if (ss.kind === "rectangular") {
      return new Set([s === Side.START ? ss.l : ss.r]);
    } else {
      const out = new Set<S>();
      for (const it of this.getContents(ss)) {
        for (const x of this.getRectangularsOnSide(s, it)) out.add(x);
      }
      return out;
    }
  }

  getAllPositionedRectangulars(): Set<Positioned> {
    return new Set(this.rectangularMap.keys());
  }

  getSlideablesFor(de: Positioned): RectangularSlideableSet | null {
    return this.rectangularMap.get(de as Rectangular) ?? null;
  }

  getPPSlideablesFor(de: PlacementPositioned): RoutableSlideableSet | null {
    return this.pointMap.get(de) ?? null;
  }

  addLaneGroup(lg: ReadonlySet<S>): void {
    addToSuperSet(this.laneGroups, lg);
  }

  getLaneGroups(): ReadonlySet<ReadonlySet<S>> {
    return this.laneGroups;
  }

  mergeSlideables(s1: S | null | undefined, s2: S | null | undefined): S | null {
    return this.mergeSlideablesInner(s1 ?? null, s2 ?? null);
  }

  private mergeSlideablesInner(s1: S | null, s2: S | null): S | null {
    if (s1 == null) {
      return s2;
    } else if (s2 == null) {
      return s1;
    } else if (s1 === s2) {
      return s1;
    } else {
      const s1o = s1.getOrbitAnchors().length > 0;
      const s1r = s1.getRectAnchors().length > 0;
      const s2o = s2.getOrbitAnchors().length > 0;
      const s2r = s2.getRectAnchors().length > 0;
      if (s1o !== s2o && s1r !== s2r) {
        throw new LogicException("Should only merge rects or orbits, not a combination");
      }

      const sNew = s1.merge(s2);
      // now we need to replace s1 and s2 in their containers
      const containsS1 = this.slideableMap.get(s1) ?? new Set<SlideableSet>();
      this.slideableMap.delete(s1);
      const containsS2 = this.slideableMap.get(s2) ?? new Set<SlideableSet>();
      this.slideableMap.delete(s2);
      for (const x of containsS2) containsS1.add(x);
      this.updateSlideableSets(containsS1, s1, s2, sNew);
      this.updatePortMap(s1, s2, sNew);

      this.slideables.add(sNew);
      this.slideables.delete(s1);
      this.slideables.delete(s2);

      for (const it of this.slideables) {
        it.replaceConstraint(s1, sNew);
        it.replaceConstraint(s2, sNew);
      }

      this.compaction.replaceIntersections(s1, s2, sNew);

      this.log.send(`Merging: \n\t${s1}\n\t${s2}\nAdded: ${sNew}`);

      return sNew;
    }
  }

  addSide(
    container: RectangularSlideableSet,
    inner: RoutableSlideableSet,
    side: Side,
    useOrbit: boolean,
    separation: number,
  ): RoutableSlideableSet {
    const containerRoutable = useOrbit ? container.wrapInRoutable() : null;
    if (containerRoutable != null) {
      this.contains(containerRoutable, container);
      this.updateSlideableMap(containerRoutable);
    }

    const latestLeft = inner.bl?.getNotDoneVersion() ?? null;
    const latestRight = inner.br?.getNotDoneVersion() ?? null;

    const latestInner = inner.replaceSide(latestLeft, Side.START).replaceSide(latestRight, Side.END);

    let result: RoutableSlideableSet;
    switch (side) {
      case Side.START: {
        let newLeft: S;
        if (containerRoutable != null) {
          this.compaction.copyNeighbourMap(latestLeft, container.l);
          this.compaction.copyNeighbourMap(latestLeft, containerRoutable.bl);
          newLeft = containerRoutable.bl!;
        } else {
          this.compaction.copyNeighbourMap(latestLeft, container.l);
          newLeft = container.l;
        }
        if (latestRight != null) {
          this.ensureMinimumDistance(newLeft, latestRight, separation);
        }
        result = latestInner.replaceSide(newLeft, Side.START);
        break;
      }
      case Side.END: {
        let newRight: S;
        if (containerRoutable != null) {
          this.compaction.copyNeighbourMap(latestRight, container.r);
          this.compaction.copyNeighbourMap(latestRight, containerRoutable.br);
          newRight = containerRoutable.br!;
        } else {
          this.compaction.copyNeighbourMap(latestRight, container.r);
          newRight = container.r;
        }
        if (latestRight != null) {
          this.ensureMinimumDistance(latestRight, newRight, separation);
        }
        result = latestInner.replaceSide(newRight, side);
        break;
      }
      default:
        throw new LogicException("Illegal Side");
    }

    this.updateContainment1(inner, result);
    this.updateSlideableMap(result);
    this.checkConsistency();
    return result;
  }

  private updateSlideableSets(
    contains: Set<SlideableSet> | null,
    sOld1: S,
    sOld2: S,
    sNew: S,
  ): void {
    if (contains == null) return;
    for (const it of contains) {
      const ssNew = replaceIn(replaceIn(it, sOld1, sNew), sOld2, sNew);
      this.removeFromSlideableMap(it);
      this.updateSlideableMap(ssNew);
      this.updateContainment1(it, ssNew);
      this.updateContainment2(it, ssNew);

      if (ssNew.kind === "rectangular") {
        const toReplace: Rectangular[] = [];
        for (const [d, v] of this.rectangularMap) {
          if (v === it) toReplace.push(d);
        }
        for (const d of toReplace) this.rectangularMap.set(d, ssNew);
      }
    }
  }

  private updatePortMap(sOld1: S, sOld2: S, newS: S): void {
    const toReplacePorts: PlacementPositioned[] = [];
    for (const [p, v] of this.pointMap) {
      if (v.c === sOld1 || v.c === sOld2) toReplacePorts.push(p);
    }
    for (const p of toReplacePorts) {
      this.pointMap.set(p, new RoutableSlideableSetImpl(newS, null, null));
    }
  }

  private updateContainment1(old: SlideableSet, newSet: SlideableSet): void {
    if (old.kind === "routable" && newSet.kind === "routable") {
      // replace key
      const contains = this.containment1.get(old);
      if (contains != null) {
        this.containment1.set(newSet, contains);
        this.containment1.delete(old);
      }
    }

    if (newSet.kind === "rectangular") {
      for (const it of this.containment1.values()) {
        const i = it.indexOf(old as RectangularSlideableSet);
        if (i > -1) {
          it[i] = newSet;
        }
      }
    }
  }

  private updateContainment2(old: SlideableSet, newSet: SlideableSet): void {
    if (old.kind === "rectangular" && newSet.kind === "rectangular") {
      // Kotlin compares (`==`) rather than assigns here, so the entry is simply dropped.
      this.containment2.delete(old);
    } else if (old.kind === "routable" && newSet.kind === "routable") {
      for (const [key, value] of this.containment2) {
        if (value === old) {
          this.containment2.set(key, newSet);
        }
      }
    } else {
      throw new LogicException("Type mismatch");
    }
  }

  add(ss: RoutableSlideableSet | null): void;
  add(de: Rectangular, ss: RectangularSlideableSet): void;
  add(p: PlacementPositioned, ss: RoutableSlideableSet): void;
  add(
    a: RoutableSlideableSet | Rectangular | PlacementPositioned | null,
    ss?: RectangularSlideableSet | RoutableSlideableSet,
  ): void {
    if (ss === undefined) {
      if (a != null) {
        this.updateSlideableMap(a as RoutableSlideableSet);
      }
    } else if (ss.kind === "rectangular") {
      this.rectangularMap.set(a as Rectangular, ss);
      this.updateSlideableMap(ss);
    } else {
      this.pointMap.set(a as PlacementPositioned, ss);
      this.updateSlideableMap(ss);
    }
  }

  private updateSlideableMap(ss: SlideableSet): void {
    for (const it of ss.getAll()) {
      let set = this.slideableMap.get(it);
      if (set == null) {
        set = new Set();
        this.slideableMap.set(it, set);
      }
      set.add(ss);
      this.slideables.add(it);
    }

    for (const ll of this.slideableMap.values()) {
      for (const it of [...ll]) {
        if (it.done) ll.delete(it);
      }
    }
  }

  private removeFromSlideableMap(ss: SlideableSet): void {
    for (const it of ss.getAll()) {
      this.slideableMap.get(it)?.delete(ss);
    }
  }

  private checkValid(s: S, k: unknown): void {
    if (!this.slideables.has(s)) {
      throw new LogicException(`Wasn't expecting reference to ${s} for key ${String(k)}`);
    }
  }

  contains(outer: RectangularSlideableSet, inner: RoutableSlideableSet): void;
  contains(outer: RoutableSlideableSet, inner: RectangularSlideableSet): void;
  contains(outer: RoutableSlideableSet, all: readonly RectangularSlideableSet[]): void;
  contains(
    outer: RectangularSlideableSet | RoutableSlideableSet,
    inner: RectangularSlideableSet | RoutableSlideableSet | readonly RectangularSlideableSet[],
  ): void {
    if (outer.kind === "rectangular") {
      if (this.containment2.has(outer)) {
        throw new LogicException("Already set containment");
      }
      this.containment2.set(outer, inner as RoutableSlideableSet);
    } else {
      let contents = this.containment1.get(outer);
      if (contents == null) {
        contents = [];
        this.containment1.set(outer, contents);
      }
      if (Array.isArray(inner)) {
        contents.length = 0;
        contents.push(...(inner as readonly RectangularSlideableSet[]));
      } else {
        contents.push(inner as RectangularSlideableSet);
      }
      this.log.send(`Containment: ${outer} has contents`, contents);
    }
  }

  getContents(outer: RoutableSlideableSet): RectangularSlideableSet[];
  getContents(outer: RectangularSlideableSet): RoutableSlideableSet | null;
  getContents(
    outer: RoutableSlideableSet | RectangularSlideableSet,
  ): RectangularSlideableSet[] | RoutableSlideableSet | null {
    if (outer.kind === "routable") {
      return [...(this.containment1.get(outer) ?? [])];
    } else {
      return this.containment2.get(outer) ?? null;
    }
  }

  getContainers(inner: RectangularSlideableSet): Set<RoutableSlideableSet> {
    const out = new Set<RoutableSlideableSet>();
    for (const [k, v] of this.containment1) {
      if (v.includes(inner)) out.add(k);
    }
    return out;
  }

  checkConsistency(): void {
    for (const it of [...this.slideables]) {
      if (it.isDone()) this.slideables.delete(it);
    }

    for (const [k, v] of this.rectangularMap) {
      for (const it of v.getAll()) this.checkValid(it, k);
    }

    for (const k of this.slideables) {
      for (const it of k.getForwardSlideables<S>(true)) {
        this.checkValid(it, `referenced by ${k}`);
      }
    }

    for (const k of this.slideables) {
      for (const it of k.getForwardSlideables<S>(false)) {
        this.checkValid(it, `referenced by ${k}`);
      }
    }

    for (const it of [...this.slideableMap.keys()]) {
      if (it.isDone()) {
        this.slideableMap.delete(it);
      }
    }

    this.log.send("Consistent");
  }

  addSlideable(c: S): void {
    this.slideables.add(c);
  }

  getAllSlideables(): Set<S> {
    return new Set(this.slideables);
  }

  updateSlideableOrdering(): void {
    this.slideableOrdering = [...this.getAllSlideables()].sort((a, b) => {
      if (a.minimumPosition !== b.minimumPosition) {
        return b.minimumPosition - a.minimumPosition;
      } else {
        return a.getMinimumForwardConstraintTo(b) ?? 0;
      }
    });
  }

  getSlideableOrdering(): readonly S[] {
    return this.slideableOrdering;
  }
}

function replaceIn(ss: SlideableSet, s: S, withS: S): SlideableSet {
  return ss.kind === "rectangular" ? ss.replace(s, withS) : ss.replace(s, withS);
}
