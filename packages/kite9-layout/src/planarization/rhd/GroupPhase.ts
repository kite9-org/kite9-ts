import {
  BorderTraversal,
  Dimension,
  Direction,
  Layout,
  Measurement,
  getDimensionForDirection,
  reverseDirection,
} from "@kite9/model";
import type {
  BiDirectional,
  Connected,
  ConnectedRectangular,
  Connection,
  Diagram,
  DiagramElement,
  Port,
  Rectangular,
} from "@kite9/model";
import type { DiagramElementFactory } from "../../common/elements/factory/DiagramElementFactory.js";
import type { GridPositioner } from "../../common/elements/grid/GridPositioner.js";
import {
  isConnected,
  isConnectedRectangular,
  isDiagram,
  isPort,
  isRectangular,
} from "../../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../../logging/Kite9Log.js";
import type { Logable } from "../../logging/Logable.js";
import { LogicException } from "../../logging/LogicException.js";
import type { GroupBuilder } from "./GroupBuilder.js";
import { ConnectedGroupLinkNode } from "./grouping/ConnectedGroupLinkNode.js";
import type { GroupLinkNode } from "./grouping/GroupLinkNode.js";
import type { CompoundGroup } from "./grouping/basic/group/CompoundGroup.js";
import type { Group } from "./grouping/basic/group/Group.js";
import type { LeafGroup } from "./grouping/basic/group/LeafGroup.js";
import type { MergeOption } from "./grouping/basic/merge/MergeOption.js";
import type { ContradictionHandler } from "./links/ContradictionHandler.js";
import { OrderingTemporaryBiDirectional } from "./links/OrderingTemporaryBiDirectional.js";

const INT_MAX = 2147483647;

const TEMPORARY_NEEDED: ReadonlySet<Layout> = new Set([
  Layout.LEFT,
  Layout.RIGHT,
  Layout.UP,
  Layout.DOWN,
]);

function groupBy<T, K>(items: Iterable<T>, key: (t: T) => K): Map<K, T[]> {
  const out = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    let l = out.get(k);
    if (l == null) {
      l = [];
      out.set(k, l);
    }
    l.push(item);
  }
  return out;
}

let companionLog: Kite9Log | null = null;

/**
 * A GroupPhase is responsible for creating the Group data structures out of the
 * vertices, and holding various related lookup maps.
 *
 * @author robmoffat
 */
export abstract class GroupPhase implements GroupBuilder, Logable {
  static readonly LINK_WEIGHT = 1;

  static get log(): Kite9Log {
    if (companionLog == null) {
      companionLog = kite9Log({ isLoggingEnabled: true, prefix: "GP  " });
    }
    return companionLog;
  }

  static isHorizontalDirection(drawDirection: Direction | null): boolean {
    return drawDirection === Direction.LEFT || drawDirection === Direction.RIGHT;
  }

  static isVerticalDirection(drawDirection: Direction | null): boolean {
    return drawDirection === Direction.UP || drawDirection === Direction.DOWN;
  }

  static getLayoutForDirection(currentDirection: Direction | null): Layout | null {
    if (currentDirection == null) return null;
    switch (currentDirection) {
      case Direction.RIGHT:
        return Layout.RIGHT;
      case Direction.LEFT:
        return Layout.LEFT;
      case Direction.DOWN:
        return Layout.DOWN;
      case Direction.UP:
        return Layout.UP;
    }
  }

  static getDirectionForLayout(currentDirection: Layout | null): Direction {
    switch (currentDirection) {
      case Layout.RIGHT:
        return Direction.RIGHT;
      case Layout.LEFT:
        return Direction.LEFT;
      case Layout.DOWN:
        return Direction.DOWN;
      case Layout.UP:
        return Direction.UP;
      default:
        throw new LogicException(`Wasn't expecting direction: ${currentDirection}`);
    }
  }

  readonly log: Kite9Log = kite9Log(this);

  readonly allGroups: Set<LeafGroup> = new Set();
  /** Kotlin `Map<Pair<Connection, Boolean>, LeafGroup>`, keyed by connection then `from` end. */
  private readonly linkEndMap: Map<Connection, Map<boolean, LeafGroup>> = new Map();
  private readonly done: Set<DiagramElement> = new Set();
  private readonly hasConnections: Map<DiagramElement | null, boolean> = new Map();

  groupCount = 0;
  containerCount = 0;

  constructor(
    readonly top: DiagramElement,
    readonly elements: number,
    readonly ch: ContradictionHandler,
    readonly gp: GridPositioner,
    public ef: DiagramElementFactory<unknown>,
  ) {}

  /** Signed 32-bit hash seed for new groups. */
  protected nextHashCode(): number {
    return (Math.random() * 0x100000000) | 0;
  }

  get prefix(): string {
    return "GS  ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  abstract createLeafGroup(gln: GroupLinkNode, ord: Rectangular): LeafGroup;

  abstract createCompoundGroup(
    a: Group,
    b: Group,
    treatAsLeaf: boolean,
    mo: MergeOption | null,
    size?: number,
  ): CompoundGroup;

  private setLinkEnd(c: Connection, from: boolean, lg: LeafGroup): void {
    let ends = this.linkEndMap.get(c);
    if (ends == null) {
      ends = new Map();
      this.linkEndMap.set(c, ends);
    }
    ends.set(from, lg);
  }

  private populateContainerPortsLeafGroups(ord: Rectangular): number {
    let created = 0;
    // creates a LeafGroup for every port in the container,
    // ensure we respect the port ordering, if we can ascertain one.
    const allPorts = groupBy(
      ord.getContents().filter((it): it is Port => isPort(it)),
      (it) => it.getPortDirection(),
    );

    for (const [d, ports] of allPorts) {
      const portGroups = groupBy(ports, (it) => {
        const pp = it.getContainerPosition(getDimensionForDirection(d));
        switch (pp.type) {
          case Measurement.PIXELS:
            return pp.amount < 0 ? 0 : 1;
          case Measurement.PERCENTAGE:
          case Measurement.NONE:
            return 2;
        }
      });

      for (const l of portGroups.values()) {
        const sortedPorts = [...l].sort((p1, p2) => {
          const a1 = p1.getContainerPosition(getDimensionForDirection(p1.getPortDirection())).amount;
          const a2 = p2.getContainerPosition(getDimensionForDirection(p2.getPortDirection())).amount;
          return a1 < a2 ? -1 : a1 > a2 ? 1 : 0;
        });
        let directionBasedOnSide: Direction;
        switch (d) {
          case Direction.UP:
          case Direction.DOWN:
            directionBasedOnSide = Direction.RIGHT;
            break;
          case Direction.LEFT:
          case Direction.RIGHT:
            directionBasedOnSide = Direction.DOWN;
            break;
        }
        let prevLg: LeafGroup | null = null;
        for (const next of sortedPorts) {
          const lg = this.createLeafGroup(next, ord);
          created++;
          if (prevLg != null) {
            const tc = new OrderingTemporaryBiDirectional(
              prevLg.connected,
              next,
              directionBasedOnSide,
            );
            prevLg.sortLink(
              directionBasedOnSide,
              lg,
              GroupPhase.LINK_WEIGHT,
              true,
              INT_MAX,
              this.single(tc),
            );
            lg.sortLink(
              reverseDirection(directionBasedOnSide),
              prevLg,
              GroupPhase.LINK_WEIGHT,
              true,
              INT_MAX,
              this.single(tc),
            );
          }
          prevLg = lg;
        }
      }
    }

    return created;
  }

  /**
   * Creates LeafGroups between elements where the layout is left, right, up, down
   * to enforce that ordering.
   */
  private populateNonGridLayoutLeafGroups(ord: Rectangular): number {
    let created = 0;
    const l = ord.getLayout();

    const addContainerOrderingInfo = (current: LeafGroup, prev: LeafGroup): void => {
      const d = GroupPhase.getDirectionForLayout(l);
      const tc = new OrderingTemporaryBiDirectional(prev.connected, current.connected, d);
      prev.sortLink(d, current, GroupPhase.LINK_WEIGHT, true, INT_MAX, this.single(tc));
      current.sortLink(
        reverseDirection(d),
        prev,
        GroupPhase.LINK_WEIGHT,
        true,
        INT_MAX,
        this.single(tc),
      );
    };

    const contents = ord.getContents().filter(isConnectedRectangular);

    const prevLg = null as LeafGroup | null;

    for (const nextE of contents) {
      created += this.populateLeafGroups(nextE);
      if (prevLg != null && l != null && TEMPORARY_NEEDED.has(l)) {
        const gln = new ConnectedGroupLinkNode(nextE, "-hub");
        nextE.addTemporaryContent(gln);
        const nextLg = this.createLeafGroup(gln, nextE);
        created++;
        addContainerOrderingInfo(nextLg, prevLg);
      }
    }

    return created;
  }

  private populateGridContentsLeafGroups(ord: Rectangular): number {
    let created = 0;
    // need to iterate in 2d
    const grid = this.gp.placeOnGrid(ord);
    const gridGroups = new Map<string, LeafGroup>();
    const key = (x: number, y: number): string => `${x},${y}`;

    // create unconnected groups
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0]!.length; x++) {
        const de = grid[y]![x]! as ConnectedRectangular;
        created += this.populateLeafGroups(de);
        const gln = new ConnectedGroupLinkNode(ord, `-grid-(${x}, ${y})`, [x, y]);
        de.addTemporaryContent(gln);
        const ggGrid = this.createLeafGroup(gln, de);
        created++;
        gridGroups.set(key(x, y), ggGrid);
      }
    }

    // link them up
    for (let y = 0; y < grid.length; y++) {
      for (let x = 0; x < grid[0]!.length; x++) {
        const g = gridGroups.get(key(x, y))!;
        const aboveG = y > 0 ? gridGroups.get(key(x, y - 1)) : undefined;
        const beforeG = x > 0 ? gridGroups.get(key(x - 1, y)) : undefined;
        if (beforeG != null && g !== beforeG) {
          const tc = new OrderingTemporaryBiDirectional(
            beforeG.connected,
            g.connected,
            Direction.RIGHT,
          );
          beforeG.sortLink(Direction.RIGHT, g, GroupPhase.LINK_WEIGHT, true, INT_MAX, this.single(tc));
          g.sortLink(Direction.LEFT, beforeG, GroupPhase.LINK_WEIGHT, true, INT_MAX, this.single(tc));
        }
        if (aboveG != null && g !== aboveG) {
          const tc = new OrderingTemporaryBiDirectional(
            aboveG.connected,
            g.connected,
            Direction.DOWN,
          );
          aboveG.sortLink(Direction.DOWN, g, GroupPhase.LINK_WEIGHT, true, INT_MAX, this.single(tc));
          g.sortLink(Direction.UP, aboveG, GroupPhase.LINK_WEIGHT, true, INT_MAX, this.single(tc));
        }
      }
    }

    return created;
  }

  populateEmptyElementLeafGroup(ord: Rectangular): number {
    // ok, so nothing connects to this, but we still need to create a
    // leaf group for it of some sort.
    const gln = new ConnectedGroupLinkNode(ord, "-bareleaf");
    ord.addTemporaryContent(gln);
    this.createLeafGroup(gln, ord);
    return 1;
  }

  populateConnectedElementLeafGroups(ord: Rectangular): number {
    let created = 0;
    const connectionsByDimension: Map<Dimension | null, Connection[]> = isConnected(ord)
      ? groupBy(ord.getLinks(), (it) => {
          const dd = it.getDrawDirection();
          return dd == null ? null : getDimensionForDirection(dd);
        })
      : new Map();

    const directedLeafGroupsNeeded = Math.max(
      connectionsByDimension.get(Dimension.H)?.length ?? 0,
      connectionsByDimension.get(Dimension.V)?.length ?? 0,
    );

    // map the directed links
    for (let i = 1; i <= directedLeafGroupsNeeded; i++) {
      const gln = new ConnectedGroupLinkNode(ord, `-dl${i}`);
      ord.addTemporaryContent(gln);
      const lg = this.createLeafGroup(gln, ord);
      created++;
      const hLink = connectionsByDimension.get(Dimension.H)?.[i - 1] ?? null;
      const vLink = connectionsByDimension.get(Dimension.V)?.[i - 1] ?? null;

      if (hLink != null) {
        const hFrom = hLink.getFrom() === (ord as unknown);
        this.setLinkEnd(hLink, hFrom, lg);
      }

      if (vLink != null) {
        const vFrom = vLink.getFrom() === (ord as unknown);
        this.setLinkEnd(vLink, vFrom, lg);
      }
    }

    // for now, map all undirected links to the same node
    const undirectedConnections = connectionsByDimension.get(null);
    if (undirectedConnections != null && undirectedConnections.length > 0) {
      const gln = new ConnectedGroupLinkNode(ord, "-und");
      ord.addTemporaryContent(gln);
      const lg = this.createLeafGroup(gln, ord);
      created++;
      for (const it of undirectedConnections) {
        const from = it.getFrom() === (ord as unknown);
        this.setLinkEnd(it, from, lg);
      }
    }

    return created;
  }

  /**
   * Creates leaf groups and any ordering between them, recursively.
   * @param ord  The object to create the group for
   */
  private populateLeafGroups(ord: Rectangular): number {
    if (this.done.has(ord)) {
      throw new LogicException(
        `Diagram Element ${ord} appears multiple times in the diagram definition`,
      );
    }

    const leaf = this.needsSelfLeafGroups(ord);
    let created = 0;

    if (!leaf) {
      // handle element contents of this element
      const l = ord.getLayout();
      if (l === Layout.GRID) {
        created += this.populateGridContentsLeafGroups(ord);
      } else {
        created += this.populateNonGridLayoutLeafGroups(ord);
      }

      // handle port contents of this element
      created += this.populateContainerPortsLeafGroups(ord);

      // handle connections to this element
      created += this.populateConnectedElementLeafGroups(ord);
      if (created === 0) {
        created += this.populateEmptyElementLeafGroup(ord);
      }
    } else {
      created += this.populateConnectedElementLeafGroups(ord);
      if (created === 0) {
        created += this.populateEmptyElementLeafGroup(ord);
      }
    }

    return created;
  }

  private setupLinks(): void {
    const getLinkRank = (c: Connection): number =>
      c.getDrawDirection() != null ? c.getRank() : 0;

    for (const [c, value] of this.linkEndMap) {
      if (value.size !== 2) {
        throw new LogicException("Should be two ends for every connection");
      }
      const from = value.get(true)!;
      const to = value.get(false)!;
      from.sortLink(
        c.getDrawDirectionFrom(from.container as unknown as Connected),
        to,
        GroupPhase.LINK_WEIGHT,
        true,
        getLinkRank(c),
        this.single(c),
      );
      to.sortLink(
        c.getDrawDirectionFrom(to.container as unknown as Connected),
        from,
        GroupPhase.LINK_WEIGHT,
        true,
        INT_MAX,
        this.single(c),
      );
    }
  }

  private needsSelfLeafGroups(ord: Rectangular): boolean {
    if (isDiagram(ord) && !this.hasConnectedContents(ord)) {
      // we need at least one group in the GroupPhase, so if the diagram is empty, return a
      // single leaf group.
      return true;
    } else {
      return !this.hasLowerLevelContents(ord);
    }
  }

  hasLowerLevelContents(c: DiagramElement): boolean {
    if (isDiagram(c)) {
      return true;
    }
    // does anything inside it have connections?
    if (isRectangular(c)) {
      for (const de of c.getContents()) {
        if (this.hasNestedConnections(de)) {
          return true;
        }
      }

      // are connections allowed to pass through it?
      const canTraverse = this.isElementTraversible(c);
      if (canTraverse && this.hasNestedConnections(c)) {
        return true;
      }
    }

    // is it embedded in a grid?  If yes, use corners
    if (isConnectedRectangular(c)) {
      const l = c.getContainer()?.getLayout() ?? null;
      return l === Layout.GRID;
    }

    return false;
  }

  private isElementTraversible(c: DiagramElement, d?: Direction): boolean {
    if (d === undefined) {
      return (
        this.isElementTraversible(c, Direction.UP) ||
        this.isElementTraversible(c, Direction.DOWN) ||
        this.isElementTraversible(c, Direction.LEFT) ||
        this.isElementTraversible(c, Direction.RIGHT)
      );
    }
    return isRectangular(c) ? c.getTraversalRule(d) === BorderTraversal.ALWAYS : false;
  }

  hasNestedConnections(c: DiagramElement | null): boolean {
    const cached = this.hasConnections.get(c);
    if (cached !== undefined) {
      return cached;
    }
    let has = false;
    if (isConnected(c)) {
      has = c.getLinks().length > 0;
    }
    if (!has && isRectangular(c)) {
      for (const de of c.getContents()) {
        if (this.hasNestedConnections(de)) {
          has = true;
          break;
        }
      }
    }
    this.hasConnections.set(c, has);
    return has;
  }

  private hasConnectedContents(d: Diagram): boolean {
    for (const de of d.getContents()) {
      if (isConnected(de)) {
        return true;
      }
    }
    return false;
  }

  private single(c: BiDirectional<Connected>): Set<BiDirectional<Connected>> {
    return new Set([c]);
  }

  buildInitialGroups(): void {
    this.populateLeafGroups(this.top as ConnectedRectangular);
    this.setupLinks();
    for (const group of this.allGroups) {
      group.log(this.log);
    }
  }
}
