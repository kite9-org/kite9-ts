import type { Rectangular } from "@kite9/model";
import { PriorityQueue } from "../../../../../common/algorithms/ssp/PriorityQueue.js";
import { isConnected, isRectangular } from "../../../../../common/elements/TypeGuards.js";
import { kite9Log, type Kite9Log } from "../../../../../logging/Kite9Log.js";
import type { Logable } from "../../../../../logging/Logable.js";
import { LogicException } from "../../../../../logging/LogicException.js";
import type { ContradictionHandler } from "../../../links/ContradictionHandler.js";
import type { LinkDetail } from "../../../links/LinkManager.js";
import { ContainerStateInfo, GroupResult } from "../../GroupResult.js";
import { isLeafGroup, type Group } from "../group/Group.js";
import type { MergeKey } from "./MergeKey.js";
import type { MergeOption } from "./MergeOption.js";

/** Kotlin `BasicMergeState.GroupContainerState`. */
export class GroupContainerState {
  static readonly HAS_CONTENT = new GroupContainerState("HAS_CONTENT", true, false);
  static readonly COMPLETE_WITH_CONTENT = new GroupContainerState(
    "COMPLETE_WITH_CONTENT",
    true,
    true,
  );
  static readonly NO_CONTENT = new GroupContainerState("NO_CONTENT", false, false);
  static readonly COMPLETE_NO_CONTENT = new GroupContainerState(
    "COMPLETE_NO_CONTENT",
    false,
    true,
  );

  private constructor(
    readonly name: string,
    private readonly hc: boolean,
    readonly isComplete: boolean,
  ) {}

  hasContent(): boolean {
    return this.hc;
  }

  static get(contained: boolean, isComplete: boolean): GroupContainerState {
    if (contained) {
      return isComplete
        ? GroupContainerState.COMPLETE_WITH_CONTENT
        : GroupContainerState.HAS_CONTENT;
    }
    return isComplete
      ? GroupContainerState.COMPLETE_NO_CONTENT
      : GroupContainerState.NO_CONTENT;
  }

  toString(): string {
    return this.name;
  }
}

export class BasicMergeState extends GroupResult implements Logable {
  readonly log: Kite9Log = kite9Log(this);

  protected readonly liveGroups: Set<Group> = new Set<Group>();

  /** options in processing order */
  protected readonly optionQueue: PriorityQueue<MergeOption>;

  /** contains all considered merge options, legal ones outrank illegal ones */
  protected readonly bestOptions: Map<string, MergeOption> = new Map();

  private readonly groupContainers: Map<Group, Map<Rectangular, GroupContainerState>> = new Map();
  private readonly liveContainers: Set<Rectangular> = new Set<Rectangular>();
  private nextMergeNumber = 0;

  constructor(
    public contradictionHandler: ContradictionHandler,
    elements: number,
  ) {
    super();
    this.optionQueue = new PriorityQueue<MergeOption>(elements * 5 + 1, null);
  }

  get prefix(): string {
    return "MS  ";
  }

  get isLoggingEnabled(): boolean {
    return true;
  }

  removeLiveGroup(a: Group): void {
    this.log.send(`Completed group: ${a}`);
    a.live = false;
    this.liveGroups.delete(a);
    for (const c of this.groupContainers.get(a)!.keys()) {
      const csi = this.containerStates.get(c);
      csi!.contents.delete(a);
    }
  }

  removeLiveContainer(c: Rectangular): void {
    this.liveContainers.delete(c);
  }

  addOption(mo: MergeOption): boolean {
    const existing = this.bestOptions.get(mo.mk.key);
    if (existing == null || mo.compareTo(existing) === -1) {
      // this option is better than existing
      this.optionQueue.add(mo);
      this.bestOptions.set(mo.mk.key, mo);
      return true;
    }
    return false;
  }

  getBestOption(mk: MergeKey): MergeOption | null {
    return this.bestOptions.get(mk.key) ?? null;
  }

  nextMergeOptionNumber(): number {
    return this.nextMergeNumber++;
  }

  isLiveGroup(group: Group): boolean {
    return group.live;
  }

  addLiveGroup(group: Group): void {
    this.liveGroups.add(group);
    group.live = true;
  }

  addGroupContainerMapping(toAdd: Group, c2: Rectangular, newState: GroupContainerState): void {
    let within = this.groupContainers.get(toAdd);
    if (within == null) {
      within = new Map();
      this.groupContainers.set(toAdd, within);
    }
    this.log.send(
      "Mapping " + toAdd.groupNumber + " into container " + c2 + " state= " + newState,
    );
    within.set(c2, newState);
    const csi = this.getStateFor(c2);
    csi!.contents.add(toAdd);
  }

  override getStateFor(c2: Rectangular): ContainerStateInfo | null {
    let csi = super.getStateFor(c2);
    if (csi == null) {
      csi = new ContainerStateInfo(c2, this.containerStates);
      this.containerStates.set(c2, csi);
      for (const c of c2.getContents()) {
        if (isRectangular(c) && isConnected(c)) {
          const csi2 = this.getStateFor(c);
          if (csi2 != null) {
            csi.incompleteSubcontainers.add(c);
          }
        }
      }
    }
    return csi;
  }

  addLiveContainer(c: Rectangular): void {
    this.log.send(`Making container live:${c}`);
    this.liveContainers.add(c);
  }

  groupsCount(): number {
    return this.liveGroups.size;
  }

  hasRemainingMergeOptions(): boolean {
    return this.optionQueue.size() > 0;
  }

  nextMergeOption(): MergeOption | null {
    const mo = this.optionQueue.remove();
    this.bestOptions.delete(mo!.mk.key);
    return mo;
  }

  protected isLinkCounted(
    _from: Group | null,
    _to: Group | null,
    via: Group,
    _ld: LinkDetail | null,
  ): boolean {
    return via.isActive();
  }

  getContainersFor(a: Group | null): Map<Rectangular, GroupContainerState> | null {
    if (isLeafGroup(a)) {
      let out = this.groupContainers.get(a);
      if (out == null) {
        out = new Map([[a.container, GroupContainerState.HAS_CONTENT]]);
        this.groupContainers.set(a, out);
      }
      return out;
    } else {
      return (a != null ? this.groupContainers.get(a) : undefined) ?? null;
    }
  }

  removeGroupContainerMapping(g: Group, c: Rectangular): GroupContainerState | null {
    const within = this.groupContainers.get(g);
    if (within == null) {
      throw new LogicException("Group not present in an existing container" + g);
    }
    const out = within.get(c) ?? null;
    within.delete(c);
    return out;
  }

  isContainerLive(container: Rectangular): boolean {
    return this.liveContainers.has(container);
  }

  groups(): Set<Group> {
    return this.liveGroups;
  }
}
