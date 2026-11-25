import { Layout } from "@kite9/model";
import type { DiagramElement, Dimension, Label, Rectangular } from "@kite9/model";
import { Slideable } from "../common/algorithms/so/Slideable.js";
import { isPort, isRectangular } from "../common/elements/TypeGuards.js";
import { LogicException } from "../logging/LogicException.js";
import type { LeafGroup } from "../planarization/rhd/grouping/basic/group/LeafGroup.js";
import type { Anchor } from "./anchors/Anchor.js";
import { ConnAnchor } from "./anchors/ConnAnchor.js";
import { IntersectAnchor, Purpose } from "./anchors/IntersectAnchor.js";
import { OrbitAnchor } from "./anchors/OrbitAnchor.js";
import { RectAnchor, type Permeability } from "./anchors/RectAnchor.js";
import type { Side } from "./Side.js";
import type { SlackOptimisation } from "./SlackOptimisation.js";

type AnyAnchor = Anchor<unknown>;

/** Kotlin `MutableSet<Anchor<*>>`: anchors are value objects, so de-duplicate on `equals`. */
function addAnchorTo(anchors: AnyAnchor[], a: AnyAnchor): void {
  if (!anchors.some((x) => x.equals(a))) {
    anchors.push(a);
  }
}

/**
 * Kotlin `C2Slideable`: a slideable in one dimension of the compaction, annotated with
 * anchors describing how it relates to the diagram elements around it.
 */
export class CompactionSlideable extends Slideable {
  declare readonly so: SlackOptimisation;

  private static n = 0;

  static nextNumber(): number {
    CompactionSlideable.n++;
    return CompactionSlideable.n;
  }

  readonly number: number = CompactionSlideable.nextNumber();
  mergedInto: CompactionSlideable | null = null;

  private readonly anchors: AnyAnchor[] = [];
  readonly intersectingGroups: ReadonlySet<LeafGroup>;

  /** For new connection slideables, orbit slideables, or empty spaces in the diagram. */
  constructor(
    so: SlackOptimisation,
    readonly dimension: Dimension,
    anchors: Iterable<AnyAnchor> = [],
    intersectingGroups: ReadonlySet<LeafGroup> = new Set(),
  ) {
    super(so);
    for (const a of anchors) addAnchorTo(this.anchors, a);
    this.intersectingGroups = intersectingGroups;
  }

  /** This is for rectangular Slideables */
  static forRectangular(
    so: SlackOptimisation,
    dimension: Dimension,
    de: Rectangular,
    side: Side,
    p: Permeability,
  ): CompactionSlideable {
    return new CompactionSlideable(so, dimension, [new RectAnchor(de, side, p)]);
  }

  /** For intersection slideables */
  static forIntersection(
    so: SlackOptimisation,
    dimension: Dimension,
    intersects: DiagramElement,
    purpose: Purpose,
  ): CompactionSlideable {
    return new CompactionSlideable(so, dimension, [new IntersectAnchor(intersects, purpose)]);
  }

  /** Used for labels */
  static forLabels(
    so: SlackOptimisation,
    dimension: Dimension,
    intersects: readonly Label[],
  ): CompactionSlideable {
    return new CompactionSlideable(
      so,
      dimension,
      intersects.map((it) => new IntersectAnchor(it, Purpose.LABEL_LAYOUT)),
    );
  }

  private optionalMin(s: CompactionSlideable): number {
    return Math.min(this.maximumPosition, s.maximumPosition);
  }

  merge(sIn: CompactionSlideable): CompactionSlideable {
    const s1 = sIn.getNotDoneVersion();
    const s2 = this.getNotDoneVersion();
    if (s1.dimension === s2.dimension) {
      const groups = new Set<LeafGroup>(s1.intersectingGroups);
      for (const g of s2.intersectingGroups) groups.add(g);
      const out = new CompactionSlideable(
        this.so,
        s1.dimension,
        [...s1.anchors, ...s2.anchors],
        groups,
      );

      s2.handleMinimumMaximumAndDone(out, s1);
      return out;
    } else {
      throw new LogicException(`Can't merge ${s1} with ${s2}`);
    }
  }

  override toString(): string {
    const ints = this.getIntersectingElements();
    const orbs = this.getOrbitingElements();
    const rects = this.getRectAnchors();

    const char =
      ints.size > 0 ? "I" : orbs.size > 0 ? "O" : rects.length > 0 ? "R" : "X";
    const detail =
      this.anchors.length > 0
        ? ` i/s=${setToString(ints)} orbits=${setToString(orbs)} anchors=[${this.anchors.join(", ")}]`
        : "";
    return `C2S${char}(${this.number}, ${this.dimension}, min=${this.minimumPosition}, max=${this.maximumPosition} done=${this.isDone()} ${detail})`;
  }

  getIntersectingElements(): Set<DiagramElement> {
    return new Set(this.getIntersectAnchors().map((it) => it.e));
  }

  getOrbitingElements(): Set<DiagramElement> {
    return new Set(this.getOrbitAnchors().map((it) => it.e));
  }

  getRectElements(): Set<DiagramElement> {
    return new Set(this.getRectAnchors().map((it) => it.e));
  }

  getOrbitAnchors(): OrbitAnchor[] {
    return this.anchors.filter((a): a is OrbitAnchor => a instanceof OrbitAnchor);
  }

  getConnAnchors(): ConnAnchor[] {
    return this.anchors.filter((a): a is ConnAnchor => a instanceof ConnAnchor);
  }

  getIntersectAnchors(): IntersectAnchor[] {
    return this.anchors.filter((a): a is IntersectAnchor => a instanceof IntersectAnchor);
  }

  getRectAnchors(): RectAnchor[] {
    return this.anchors.filter((a): a is RectAnchor => a instanceof RectAnchor);
  }

  /**
   * For the current slideable (this), works out which anchor represents the intersection
   * with along.
   */
  getRelevantRectAnchor(c: DiagramElement): RectAnchor | null {
    const isGridCell = (e: DiagramElement): boolean => {
      const parent = e.getParent();
      return isRectangular(parent) && parent.getLayout() === Layout.GRID;
    };

    const relevant = this.getRectAnchors()
      .filter((it) => it.e === c || (isRectangular(c) && c.getContents().includes(it.e)))
      .filter((it) => !isGridCell(it.e))
      .filter((it) => !isPort(it.e));

    if (relevant.length > 1) {
      throw new LogicException("Not sure how this can be a permeable anchor for multiple things");
    }

    return relevant[0] ?? null;
  }

  /**
   * You can't move along an intersection element if you're inside the element itself.
   * Only the visible part of the kebab stick.
   */
  canMoveAlongInside(container: DiagramElement): boolean {
    for (const it of this.getIntersectingElements()) {
      if (isRectangular(it) && (it === container || it.deepContains(container))) {
        return false;
      }
    }
    return true;
  }

  replaceConnAnchors(ca: Iterable<ConnAnchor>): void {
    const toKeep = this.anchors.filter((it) => !(it instanceof ConnAnchor));
    this.anchors.length = 0;
    for (const a of toKeep) addAnchorTo(this.anchors, a);
    for (const a of ca) addAnchorTo(this.anchors, a);
  }

  isDone(): boolean {
    return this.mergedInto != null;
  }

  private handleMinimumMaximumAndDone(out: CompactionSlideable, s: CompactionSlideable): void {
    const size = this.so.getSize();
    out.minimum.merge(this.minimum, new Set([s.minimum, this.minimum]), size);
    out.minimum.merge(s.minimum, new Set([s.minimum, this.minimum]), size);
    out.maximum.merge(this.maximum, new Set([s.maximum, this.maximum]), size);
    out.maximum.merge(s.maximum, new Set([s.maximum, this.maximum]), size);
    out.minimumPosition = Math.max(this.minimumPosition, s.minimumPosition);
    out.maximumPosition = this.optionalMin(s);
    this.mergedInto = out;
    s.mergedInto = out;
  }

  addConnAnchor(a: ConnAnchor): void {
    addAnchorTo(this.anchors, a);
  }

  addRectAnchor(a: RectAnchor): void {
    if (this.getOrbitAnchors().length > 0) {
      throw new LogicException("You shouldn't have orbits and rects on the same slideable");
    }
    addAnchorTo(this.anchors, a);
  }

  addIntersectAnchor(a: IntersectAnchor): void {
    addAnchorTo(this.anchors, a);
  }

  addOrbitAnchor(o: OrbitAnchor): void {
    addAnchorTo(this.anchors, o);
  }

  equals(other: unknown): boolean {
    if (this === other) return true;
    return other instanceof CompactionSlideable && other.number === this.number;
  }

  hashCode(): number {
    return this.number;
  }

  getNotDoneVersion(): CompactionSlideable {
    return CompactionSlideable.getNonDoneVersion(this)!;
  }

  override addMinimumForwardConstraint(to: Slideable, dist: number): void {
    if (this.number !== (to as CompactionSlideable).number) {
      super.addMinimumForwardConstraint(to, dist);
    }
  }

  override getForwardSlideables<T extends Slideable = CompactionSlideable>(
    increasing: boolean,
  ): Set<T> {
    return super.getForwardSlideables<T>(increasing);
  }

  static getNonDoneVersion(s: CompactionSlideable | null | undefined): CompactionSlideable | null {
    let c = s ?? null;
    while (c != null && c.isDone()) {
      c = c.mergedInto;
    }
    return c;
  }
}

function setToString(s: ReadonlySet<unknown>): string {
  return `[${[...s].map(String).join(", ")}]`;
}
