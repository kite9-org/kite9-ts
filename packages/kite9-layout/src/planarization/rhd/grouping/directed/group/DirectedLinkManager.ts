import { Direction, reverseDirection, type BiDirectional, type Connected, type Rectangular } from "@kite9/model";
import { LogicException } from "../../../../../logging/LogicException.js";
import type { LinkDetail, LinkManager, LinkProcessor } from "../../../links/LinkManager.js";
import type { CompoundGroup } from "../../basic/group/CompoundGroup.js";
import type { Group } from "../../basic/group/Group.js";
import type { BasicMergeState } from "../../basic/merge/BasicMergeState.js";
import { MergePlane, mergePlaneMatches } from "../MergePlane.js";
import { DirectedGroupAxis } from "./DirectedGroupAxis.js";

const INT_MAX = 2147483647;
const FLOAT_MAX = 3.4028234663852886e38;

abstract class AbstractLinkDetail implements LinkDetail {
  inContainer = false;
  nearestNeighbour = false;

  abstract readonly isOrderingLink: boolean;
  abstract readonly numberOfLinks: number;
  abstract readonly connections: Iterable<BiDirectional<Connected>>;
  abstract readonly linkRank: number;

  constructor(
    readonly direction: Direction | null,
    readonly group: Group | null,
    readonly originatingGroup: Group | null,
  ) {}

  from(b: Group): boolean {
    return this.originatingGroup === b;
  }

  processToLevel(lp: LinkProcessor, _l: number): void {
    lp.process(this.originatingGroup!, this.group!, this);
  }

  processLowestLevel(lp: LinkProcessor): void {
    this.processToLevel(lp, INT_MAX);
  }

  toString(): string {
    return (
      this.numberOfLinks +
      "/d=" +
      this.direction +
      "/" +
      (this.isOrderingLink ? "O" : "~O") +
      "/" +
      (this.inContainer ? "C" : "~C") +
      "/" +
      (this.nearestNeighbour ? "N" : "~N") +
      "/" +
      this.group!.groupNumber
    );
  }
}

class ActualLinkDetail extends AbstractLinkDetail {
  readonly connections: BiDirectional<Connected>[] = [];
  readonly numberOfLinks: number;
  isOrderingLink: boolean;
  readonly linkRank: number;

  constructor(
    g: Group | null,
    o: Group | null,
    numberOfLinks: number,
    d: Direction | null,
    isOrderingLink: boolean,
    linkRank: number,
    c: Iterable<BiDirectional<Connected>>,
  ) {
    super(d, g, o);
    this.numberOfLinks = numberOfLinks;
    this.isOrderingLink = isOrderingLink;
    this.linkRank = linkRank;
    this.addConnections(c);
  }

  private addConnections(c: Iterable<BiDirectional<Connected>>): void {
    for (const item of c) {
      if (!this.connections.includes(item)) {
        this.connections.push(item);
      }
    }
  }
}

/**
 * This is used where we want to inherit a link detail in a compound group from one of the
 * contained groups.
 */
class WrapLinkDetail extends AbstractLinkDetail {
  constructor(
    public inside: LinkDetail,
    lmsGroup: Group | null,
  ) {
    super(inside.direction, inside.group, lmsGroup);
  }

  override from(b: Group): boolean {
    return super.from(b) || this.inside.from(b);
  }

  get isOrderingLink(): boolean {
    return this.inside.isOrderingLink;
  }

  get numberOfLinks(): number {
    return this.inside.numberOfLinks;
  }

  get connections(): Iterable<BiDirectional<Connected>> {
    return this.inside.connections;
  }

  override processToLevel(lp: LinkProcessor, i: number): void {
    this.inside.processToLevel(lp, i);
  }

  get linkRank(): number {
    return this.inside.linkRank;
  }
}

class NullLinkDetail extends AbstractLinkDetail {
  get isOrderingLink(): boolean {
    return false;
  }

  get numberOfLinks(): number {
    return 0;
  }

  get connections(): Iterable<BiDirectional<Connected>> {
    return [];
  }

  override processToLevel(_lp: LinkProcessor, _i: number): void {}

  override from(_b: Group): boolean {
    return false;
  }

  get linkRank(): number {
    return 0;
  }
}

const NULL_LINK_DETAIL: LinkDetail = new NullLinkDetail(null, null, null);

/** Kotlin inner class `CompoundLinkDetail`; the merge state is passed explicitly. */
class CompoundLinkDetail extends AbstractLinkDetail {
  a: LinkDetail | null;
  b: LinkDetail | null;

  constructor(
    ms: BasicMergeState,
    cg: Group | null,
    lmsGroup: Group | null,
    a: LinkDetail | null,
    b: LinkDetail | null,
  ) {
    super(ms.contradictionHandler.checkContradiction(a, b, null), cg, lmsGroup);
    const a2 = a ?? NULL_LINK_DETAIL;
    const b2 = b ?? NULL_LINK_DETAIL;
    this.a = a2;
    this.b = b2;
    this.inContainer =
      (a2 as AbstractLinkDetail).inContainer || (b2 as AbstractLinkDetail).inContainer;
    this.nearestNeighbour =
      (a2 as AbstractLinkDetail).nearestNeighbour || (b2 as AbstractLinkDetail).nearestNeighbour;
  }

  get isOrderingLink(): boolean {
    return this.a!.isOrderingLink || this.b!.isOrderingLink;
  }

  get numberOfLinks(): number {
    return Math.fround(this.a!.numberOfLinks + this.b!.numberOfLinks);
  }

  get connections(): Iterable<BiDirectional<Connected>> {
    const a = this.a!;
    const b = this.b!;
    return {
      *[Symbol.iterator]() {
        yield* a.connections;
        yield* b.connections;
      },
    };
  }

  override processToLevel(lp: LinkProcessor, i: number): void {
    if (i > 0) {
      (this.a as AbstractLinkDetail).processToLevel(lp, i - 1);
      (this.b as AbstractLinkDetail).processToLevel(lp, i - 1);
    } else {
      super.processToLevel(lp, i - 1);
    }
  }

  override from(g: Group): boolean {
    if (super.from(g)) {
      return true;
    } else {
      return (this.a as AbstractLinkDetail).from(g) || (this.b as AbstractLinkDetail).from(g);
    }
  }

  get linkRank(): number {
    return Math.max(this.a!.linkRank, this.b!.linkRank);
  }
}

class GroupChain {
  prev: GroupChain | null;

  constructor(
    public g: Group,
    prev: GroupChain | null = null,
  ) {
    this.prev = prev;
  }

  stop(g: Group): boolean {
    return this.g === g || (this.prev != null ? this.prev.stop(g) : false);
  }
}

const NONE: unique symbol = Symbol("NONE");

function masked(mask: number, m: number): boolean {
  return mask === -1 ? false : (mask & m) > 0;
}

function containersFor(a: Group | null, ms: BasicMergeState): Set<Rectangular> | null {
  const cf = ms.getContainersFor(a);
  return cf != null ? new Set(cf.keys()) : null;
}

export class DirectedLinkManager implements LinkManager {
  static readonly MASK_X_FIRST = 1;
  static readonly MASK_Y_FIRST = 2;
  static readonly MASK_NEAREST_NEIGHBOUR = 4;
  static readonly MASK_IN_CONTAINER = 8;
  static readonly MASK_UP = 16;
  static readonly MASK_DOWN = 32;
  static readonly MASK_LEFT = 64;
  static readonly MASK_RIGHT = 128;
  static readonly MASK_NO_DIRECTION = 256;

  static readonly NULL: LinkDetail = NULL_LINK_DETAIL;

  static createMask(
    mp: MergePlane | null,
    nearestNeighbour: boolean,
    inContainer: boolean,
    ...d: (Direction | null)[]
  ): number {
    let outMask = 0;
    if (mp === MergePlane.X_FIRST_MERGE || mp === MergePlane.UNKNOWN || mp == null) {
      outMask += DirectedLinkManager.MASK_X_FIRST;
    }
    if (mp === MergePlane.Y_FIRST_MERGE || mp === MergePlane.UNKNOWN || mp == null) {
      outMask += DirectedLinkManager.MASK_Y_FIRST;
    }
    if (nearestNeighbour) {
      outMask += DirectedLinkManager.MASK_NEAREST_NEIGHBOUR;
    }
    if (inContainer) {
      outMask += DirectedLinkManager.MASK_IN_CONTAINER;
    }
    for (const direction of d) {
      switch (direction) {
        case null:
          outMask += DirectedLinkManager.MASK_NO_DIRECTION;
          break;
        case Direction.UP:
          outMask += DirectedLinkManager.MASK_UP;
          break;
        case Direction.DOWN:
          outMask += DirectedLinkManager.MASK_DOWN;
          break;
        case Direction.LEFT:
          outMask += DirectedLinkManager.MASK_LEFT;
          break;
        case Direction.RIGHT:
          outMask += DirectedLinkManager.MASK_RIGHT;
          break;
      }
    }
    return outMask;
  }

  static matches(ld: LinkDetail, mask: number): boolean {
    if (mask === -1) {
      return true;
    }

    // plane mask
    let planeOK = false;
    if (masked(mask, DirectedLinkManager.MASK_X_FIRST)) {
      if (mergePlaneMatches(MergePlane.X_FIRST_MERGE, DirectedGroupAxis.getState(ld.group!))) {
        planeOK = true;
      }
    }
    if (masked(mask, DirectedLinkManager.MASK_Y_FIRST)) {
      if (mergePlaneMatches(MergePlane.Y_FIRST_MERGE, DirectedGroupAxis.getState(ld.group!))) {
        planeOK = true;
      }
    }
    if (!planeOK) {
      return false;
    }

    // nearest neighbour
    if (masked(mask, DirectedLinkManager.MASK_NEAREST_NEIGHBOUR)) {
      if (!(ld as AbstractLinkDetail).nearestNeighbour) {
        return false;
      }
    }

    // in container
    if (masked(mask, DirectedLinkManager.MASK_IN_CONTAINER)) {
      if (!(ld as AbstractLinkDetail).inContainer) {
        return false;
      }
    }

    // direction mask
    let directionOK = false;
    if (masked(mask, DirectedLinkManager.MASK_NO_DIRECTION)) {
      if (ld.direction == null) {
        directionOK = true;
      }
    }
    if (masked(mask, DirectedLinkManager.MASK_LEFT)) {
      if (ld.direction === Direction.LEFT) {
        directionOK = true;
      }
    }
    if (masked(mask, DirectedLinkManager.MASK_RIGHT)) {
      if (ld.direction === Direction.RIGHT) {
        directionOK = true;
      }
    }
    if (masked(mask, DirectedLinkManager.MASK_UP)) {
      if (ld.direction === Direction.UP) {
        directionOK = true;
      }
    }
    if (masked(mask, DirectedLinkManager.MASK_DOWN)) {
      if (ld.direction === Direction.DOWN) {
        directionOK = true;
      }
    }
    return directionOK;
  }

  static all(): number {
    return -1;
  }

  readonly links: Map<Group, LinkDetail> = new Map();
  private readonly yFirstNearestNeighbours: Set<Direction> = new Set();
  private readonly xFirstNearestNeighbours: Set<Direction> = new Set();

  /** Set if the nearest neighbour is single. */
  private readonly singleDirectedMergeOption: Map<number, Group | typeof NONE> = new Map();

  linkCount = 0;

  constructor(
    private readonly ms: BasicMergeState,
    private readonly g: Group,
  ) {}

  private keepLinkTo(otherGroup: Group): boolean {
    const mp = DirectedGroupAxis.getMergePlane(this.g, otherGroup);
    return mp != null;
  }

  getAxisDirection(mp: MergePlane, d: Direction | null, incontainer: boolean): number {
    let mask = incontainer ? 2048 : 0;
    if (mp === MergePlane.X_FIRST_MERGE) {
      mask = mask + 1024;
    } else if (mp === MergePlane.Y_FIRST_MERGE) {
      mask = mask + 512;
    } else {
      mask = mask + 128;
    }
    switch (d) {
      case null:
        return mask;
      case Direction.UP:
        return mask + 1;
      case Direction.DOWN:
        return mask + 2;
      case Direction.LEFT:
        return mask + 3;
      case Direction.RIGHT:
        return mask + 4;
    }
  }

  getSingleDirectedMergeOption(
    l: Direction | null,
    axis: MergePlane,
    _ms: BasicMergeState | null,
    inContainer: boolean,
  ): Group | null {
    const ad = this.getAxisDirection(axis, l, inContainer);
    let out = this.singleDirectedMergeOption.get(ad);
    if (out == null) {
      out = NONE;
      const mask = DirectedLinkManager.createMask(axis, true, inContainer, l);
      const options = this.subsetGroup(mask);
      if (options.length === 1) {
        const first = options[0]!;
        const rl = reverseDirection(l);
        const rmask = DirectedLinkManager.createMask(axis, true, inContainer, rl);
        const lm = first.linkManager as DirectedLinkManager;
        const reverse = lm.subsetGroup(rmask);
        if (reverse.length === 1 && reverse.includes(this.g)) {
          out = first;
          lm.singleDirectedMergeOption.set(this.getAxisDirection(axis, rl, inContainer), this.g);
        }
      }
      this.singleDirectedMergeOption.set(ad, out);
    }
    return out !== NONE ? out : null;
  }

  sameContainer(inGroup: Group | null, ms: BasicMergeState): boolean {
    let ac = containersFor(this.g, ms);
    let bc: Set<Rectangular> | null = new Set();
    if (ac == null) {
      // deal with containers not being set to start with
      const cg = this.g as CompoundGroup;
      ac = containersFor(cg.a, ms);
      bc = containersFor(cg.b, ms);
    }
    const itc = containersFor(inGroup, ms);
    for (const container of itc!) {
      if (ac!.has(container)) {
        return true;
      }
      if (bc!.has(container)) {
        return true;
      }
    }
    return false;
  }

  private ensureNearestNeighboursInitialised(mask: number): void {
    if (!masked(mask, DirectedLinkManager.MASK_NEAREST_NEIGHBOUR)) {
      return;
    }
    if (masked(mask, DirectedLinkManager.MASK_X_FIRST)) {
      this.initialiseNearestNeighbourPlane(mask, MergePlane.X_FIRST_MERGE);
    }
    if (masked(mask, DirectedLinkManager.MASK_Y_FIRST)) {
      this.initialiseNearestNeighbourPlane(mask, MergePlane.Y_FIRST_MERGE);
    }
  }

  private initialiseNearestNeighbourPlane(mask: number, mp: MergePlane): void {
    if (masked(mask, DirectedLinkManager.MASK_UP)) this.initialiseNearestNeighbours(mp, Direction.UP);
    if (masked(mask, DirectedLinkManager.MASK_DOWN))
      this.initialiseNearestNeighbours(mp, Direction.DOWN);
    if (masked(mask, DirectedLinkManager.MASK_LEFT))
      this.initialiseNearestNeighbours(mp, Direction.LEFT);
    if (masked(mask, DirectedLinkManager.MASK_RIGHT))
      this.initialiseNearestNeighbours(mp, Direction.RIGHT);
  }

  private initialiseNearestNeighbours(mp: MergePlane, d: Direction): void {
    if (mp === MergePlane.X_FIRST_MERGE) {
      if (this.xFirstNearestNeighbours.has(d)) {
        return;
      }
    } else if (mp === MergePlane.Y_FIRST_MERGE) {
      if (this.yFirstNearestNeighbours.has(d)) {
        return;
      }
    } else {
      throw new LogicException("Must be checking NN with a given axis");
    }
    const mask = DirectedLinkManager.createMask(mp, false, false, d);
    const myNeighbours = this.subset(mask);

    // set them all to true to start with
    for (const linkDetail of myNeighbours) {
      (linkDetail as AbstractLinkDetail).nearestNeighbour = true;
    }

    // narrow them down
    for (const linkDetail of myNeighbours) {
      this.checkForExclusions(linkDetail.group!, d, mp, 0, new GroupChain(linkDetail.group!));
    }
    if (mp === MergePlane.X_FIRST_MERGE) {
      this.xFirstNearestNeighbours.add(d);
    }
    if (mp === MergePlane.Y_FIRST_MERGE) {
      this.yFirstNearestNeighbours.add(d);
    }
  }

  private checkForExclusions(
    group: Group,
    d: Direction,
    mp: MergePlane,
    level: number,
    gc: GroupChain,
  ): void {
    const mask = DirectedLinkManager.createMask(mp, false, false, d);
    const groupNeighbours = group.linkManager.subsetGroup(mask);
    for (const g1 of groupNeighbours) {
      const ld = this.links.get(g1);
      if (ld != null) {
        if (!ld.isOrderingLink) {
          // for ordering links, they are always neighbours (even when
          // there is a contradiction)
          (ld as AbstractLinkDetail).nearestNeighbour = false;
        }
      } else {
        if (!gc.stop(g1)) {
          this.checkForExclusions(g1, d, mp, level + 1, new GroupChain(g1, gc));
        } else {
          this.setContradiction(new GroupChain(g1, gc), g1);
        }
      }
    }
  }

  private setContradiction(groupChainIn: GroupChain, stop: Group): void {
    let groupChain: GroupChain | null = groupChainIn;
    let best = groupChain.g.getLink(groupChain.prev!.g);
    let bestCount = FLOAT_MAX;
    let ordering = best!.isOrderingLink;
    groupChain = groupChain.prev;
    while (groupChain!.g !== stop) {
      const current = groupChain!.g.getLink(groupChain!.prev!.g)!;
      if ((current.isOrderingLink === false && ordering === true) || current.numberOfLinks < bestCount) {
        best = current;
        bestCount = current.numberOfLinks;
        ordering = false;
      }
      groupChain = groupChain!.prev;
    }
    for (const c of best!.connections) {
      this.ms.contradictionHandler.setContradiction(c, false);
    }
  }

  sortLink(
    d: Direction | null,
    otherGroup: Group,
    linkValue: number,
    ordering: boolean,
    linkRank: number,
    c: Iterable<BiDirectional<Connected>>,
  ): void;
  sortLink(ld: LinkDetail): void;
  sortLink(
    dOrLd: Direction | null | LinkDetail,
    otherGroup?: Group,
    linkValue?: number,
    ordering?: boolean,
    linkRank?: number,
    c?: Iterable<BiDirectional<Connected>>,
  ): void {
    if (otherGroup === undefined) {
      const ld = dOrLd as LinkDetail;
      if (this.keepLinkTo(ld.group!)) {
        this.checkAddLinkDetail(ld);
      }
    } else {
      if (this.keepLinkTo(otherGroup)) {
        const ld = new ActualLinkDetail(
          otherGroup,
          this.g,
          linkValue!,
          dOrLd as Direction | null,
          ordering!,
          linkRank!,
          c!,
        );
        this.checkAddLinkDetail(ld);
      }
    }
  }

  private checkAddLinkDetail(other: LinkDetail): void {
    const existing = this.links.get(other.group!);
    this.links.delete(other.group!);
    const cld: AbstractLinkDetail =
      existing == null
        ? new WrapLinkDetail(other, this.g)
        : new CompoundLinkDetail(this.ms, other.group, this.g, existing, other as AbstractLinkDetail);
    cld.inContainer = this.sameContainer(other.group, this.ms);
    this.links.set(other.group!, cld);
    this.linkCount += Math.trunc(other.numberOfLinks);
  }

  subset(mask: number): ReadonlyArray<LinkDetail> {
    this.ensureNearestNeighboursInitialised(mask);
    const out: LinkDetail[] = [];
    for (const ld of this.links.values()) {
      if (DirectedLinkManager.matches(ld, mask)) out.push(ld);
    }
    return out;
  }

  subsetGroup(mask: number): ReadonlyArray<Group> {
    this.ensureNearestNeighboursInitialised(mask);
    const out: Group[] = [];
    for (const [g, ld] of this.links) {
      if (DirectedLinkManager.matches(ld, mask)) out.push(g);
    }
    return out;
  }

  allMask(): number {
    return -1;
  }

  get(g: Group): LinkDetail | null {
    return this.links.get(g) ?? null;
  }

  notifyContainerChange(g?: Group): void {
    if (g !== undefined) {
      const ld = this.links.get(g);
      (ld as AbstractLinkDetail).inContainer = this.sameContainer(g, this.ms);
    } else {
      for (const ld of this.links.values()) {
        (ld as AbstractLinkDetail).inContainer = this.sameContainer(ld.group, this.ms);
      }
    }
  }

  notifyMerge(g: CompoundGroup, aRemains: boolean, bRemains: boolean): void {
    const aggregateDimension = DirectedGroupAxis.getState(g);
    const aLD = this.links.get(g.a) ?? null;
    this.links.delete(g.a);
    const bLD = this.links.get(g.b) ?? null;
    this.links.delete(g.b);
    const cLD: AbstractLinkDetail = new CompoundLinkDetail(this.ms, g, this.g, aLD, bLD);
    switch (aggregateDimension) {
      case MergePlane.X_FIRST_MERGE:
        this.maybeKeepLink(g.a, aLD, aRemains);
        this.maybeKeepLink(g.b, bLD, bRemains);
        this.upgradeLink(g, cLD, MergePlane.X_FIRST_MERGE);
        break;
      case MergePlane.Y_FIRST_MERGE:
        this.maybeKeepLink(g.a, aLD, aRemains);
        this.maybeKeepLink(g.b, bLD, bRemains);
        this.upgradeLink(g, cLD, MergePlane.Y_FIRST_MERGE);
        break;
      case MergePlane.UNKNOWN:
        this.upgradeLink(g, cLD, MergePlane.Y_FIRST_MERGE);
        this.upgradeLink(g, cLD, MergePlane.X_FIRST_MERGE);
        break;
    }
  }

  private upgradeLink(g: CompoundGroup, cLD: AbstractLinkDetail, plane: MergePlane): void {
    if (this.keepLinkTo(g)) {
      this.links.set(g, cLD);

      // keep nearest neighbour up-to-date
      const d = cLD.direction;
      if (d != null && cLD.nearestNeighbour) {
        this.checkNearestNeighbourInPlane(g, d, plane);
        this.singleDirectedMergeOption.delete(this.getAxisDirection(plane, d, true));
        this.singleDirectedMergeOption.delete(this.getAxisDirection(plane, d, false));
      }
    }
  }

  private maybeKeepLink(oldGroup: Group, aLD: LinkDetail | null, remains: boolean): void {
    if (remains && aLD != null && this.keepLinkTo(oldGroup)) {
      this.links.set(oldGroup, aLD);
    }
  }

  private checkNearestNeighbourInPlane(g: Group, d: Direction, merge: MergePlane): void {
    const mp = DirectedGroupAxis.getState(this.g);
    if (mergePlaneMatches(mp, merge)) {
      if (merge === MergePlane.X_FIRST_MERGE) {
        if (!this.xFirstNearestNeighbours.has(d)) return;
      } else if (merge === MergePlane.Y_FIRST_MERGE) {
        if (!this.yFirstNearestNeighbours.has(d)) {
          return;
        }
      }
      this.checkForExclusions(g, d, merge, 0, new GroupChain(g));
    }
  }

  processAllLeavingLinks(compound: boolean, mask: number, lp: LinkProcessor): void {
    for (const ld of this.subset(mask)) {
      if (compound) {
        lp.process(this.g, ld.group!, ld);
      } else {
        (ld as AbstractLinkDetail).processLowestLevel(lp);
      }
    }
  }

  forLogging(): ReadonlyMap<Group, LinkDetail> {
    return this.links;
  }

  notifyAxisChange(): void {
    for (const g of [...this.links.keys()]) {
      if (!this.keepLinkTo(g)) {
        this.links.delete(g);
      }
    }
  }
}
