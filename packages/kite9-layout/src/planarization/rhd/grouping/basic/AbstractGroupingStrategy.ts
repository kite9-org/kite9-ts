import type { DiagramElement, Direction, Rectangular } from "@kite9/model";
import type { DiagramElementFactory } from "../../../../common/elements/factory/DiagramElementFactory.js";
import type { GridPositioner } from "../../../../common/elements/grid/GridPositioner.js";
import { GroupPhase } from "../../GroupPhase.js";
import type { ContradictionHandler } from "../../links/ContradictionHandler.js";
import type { GroupingStrategy } from "../GroupingStrategy.js";
import type { GroupResult } from "../GroupResult.js";
import type { CompoundGroup } from "./group/CompoundGroup.js";
import type { Group } from "./group/Group.js";
import type { LeafGroup } from "./group/LeafGroup.js";
import { GroupContainerState, type BasicMergeState } from "./merge/BasicMergeState.js";
import type { MergeOption } from "./merge/MergeOption.js";

/**
 * Merges groups together into a hierarchical structure for routing layout.
 *
 * MergeOptions hold the options for merge in a priority queue.
 *
 * @author robmoffat
 */
export abstract class AbstractGroupingStrategy extends GroupPhase implements GroupingStrategy {
  static readonly ILLEGAL_PRIORITY = 1000;
  static readonly INVALID_MERGE = -1;

  constructor(
    top: DiagramElement,
    elements: number,
    ch: ContradictionHandler,
    gp: GridPositioner,
    ef: DiagramElementFactory<unknown>,
  ) {
    super(top, elements, ch, gp, ef);
  }

  abstract group(): GroupResult;

  /**
   * Actually does the merge suggested by the merge option, replacing the individual groups with a
   * compound group.
   */
  protected performMerge(ms: BasicMergeState, mo: MergeOption): void {
    if (mo.priority >= AbstractGroupingStrategy.ILLEGAL_PRIORITY) {
      this.log.error(this.log.go() ? null : `Merging: ${mo}`);
    } else {
      this.log.send(this.log.go() ? null : `Merging: ${mo}`);
    }
    const combined = this.createMergedCompoundGroup(ms, mo);
    this.doCompoundGroupInsertion(ms, combined, false);
  }

  protected doCompoundGroupInsertion(
    ms: BasicMergeState,
    combined: CompoundGroup,
    skipContainerCompletionCheck: boolean,
  ): void {
    this.updateContainers(combined, ms);
    this.removeOldGroups(ms, combined);
    this.handleReferences(combined);
    this.introduceCombinedGroup(ms, combined);
    if (!skipContainerCompletionCheck) {
      this.checkGroupsContainersAreComplete(combined, ms);
    }
  }

  /**
   * See if the merging of this group completes any containers, and change the container states
   * accordingly.
   */
  private updateContainers(group: CompoundGroup, ms: BasicMergeState): void {
    const containersA = ms.getContainersFor(group.a)!;
    const containersB = ms.getContainersFor(group.b)!;
    const combined = new Set<Rectangular>(containersA.keys());
    for (const k of containersB.keys()) combined.add(k);
    for (const container of combined) {
      const aContained = containersA.get(container);
      const bContained = containersB.get(container);
      const contained =
        (aContained != null && aContained.hasContent()) ||
        (bContained != null && bContained.hasContent());
      const isComplete =
        (aContained != null && aContained.isComplete) ||
        (bContained != null && bContained.isComplete);
      const out = GroupContainerState.get(contained, isComplete);
      ms.addGroupContainerMapping(group, container, out);
    }
  }

  /** Performs the functions needed to add the new compound group to the merge state */
  protected abstract introduceCombinedGroup(ms: BasicMergeState, combined: CompoundGroup): void;

  /**
   * Kotlin `createCompoundGroup(ms, mo)`; renamed because it would clash with
   * {@link GroupPhase.createCompoundGroup}.
   */
  protected abstract createMergedCompoundGroup(
    ms: BasicMergeState,
    mo: MergeOption,
  ): CompoundGroup;

  /** This works out how to handle references going to the components of a new compound group. */
  protected handleReferences(group: CompoundGroup): void {
    const a = group.a;
    const b = group.b;
    group.processAllLeavingLinks(true, group.linkManager.allMask(), {
      process: (_originatingGroup, destinationGroup, _ld) => {
        if (destinationGroup.isActive()) {
          destinationGroup.linkManager.notifyMerge(group, a.isActive(), b.isActive());
        }
      },
    });
  }

  /** Checks the groups that were part of the merge and removes them. */
  protected abstract removeOldGroups(ms: BasicMergeState, combined: CompoundGroup): void;

  /**
   * If the provided group doesn't need any more merging, remove it from the merge state, and
   * potentially, promote it's container.
   */
  protected checkGroupsContainersAreComplete(group: Group, ms: BasicMergeState): void {
    const containerMap = ms.getContainersFor(group)!;
    const containers2 = [...containerMap.keys()];
    for (const container of containers2) {
      const state = containerMap.get(container);
      if (state != null && !state.isComplete) {
        if (this.isContainerComplete(container, ms)) {
          this.completeContainer(ms, container);
        }
      }
    }
  }

  protected isContainerComplete(c: Rectangular, ms: BasicMergeState): boolean {
    const csi = ms.getStateFor(c)!;
    if (csi.done) return true;
    if (csi.incompleteSubcontainers.size > 0) {
      return false;
    }
    csi.done = this.isContainerCompleteInner(c, ms);
    return csi.done;
  }

  protected abstract isContainerCompleteInner(c: Rectangular, ms: BasicMergeState): boolean;

  protected isContainerMergeable(c: Rectangular, ms: BasicMergeState): boolean {
    const csi = ms.getStateFor(c)!;
    return csi.incompleteSubcontainers.size === 0;
  }

  protected completeContainer(ms: BasicMergeState, c: Rectangular): void {
    // ok, no need to merge this one - it needs removing from the list
    this.log.send(this.log.go() ? null : `Completed container: ${c}`);
    const csiChild = ms.getStateFor(c)!;
    csiChild.done = true;
    ms.removeLiveContainer(c);
    const cc = c.getContainer();
    if (cc != null) {
      // push groups from this container into parent
      const csiParent = ms.getStateFor(cc)!;
      csiParent.incompleteSubcontainers.delete(c);
      const toIterate = [...csiChild.contents];
      let promotionOK = true;
      for (const g of toIterate) {
        promotionOK = this.checkGroupChangeContainer(ms, c, cc, g) && promotionOK;
      }
      if (promotionOK) {
        if (this.isContainerMergeable(cc, ms)) {
          this.startContainerMerge(ms, cc);
        }
        if (this.isContainerComplete(cc, ms)) {
          this.completeContainer(ms, cc);
        }
      }
    }
  }

  protected startContainerMerge(ms: BasicMergeState, c: Rectangular): void {
    ms.addLiveContainer(c);
    const csi = ms.getStateFor(c)!;
    for (const g of csi.contents) {
      ms.addLiveGroup(g);
      this.groupChangedContainer(ms, g);
    }
  }

  private checkGroupChangeContainer(
    ms: BasicMergeState,
    c: Rectangular,
    cc: Rectangular,
    g: Group,
  ): boolean {
    this.log.send("Moving group: " + g.groupOrdinal + " from " + c + " to " + cc);
    ms.removeGroupContainerMapping(g, c);
    ms.addGroupContainerMapping(g, cc, GroupContainerState.HAS_CONTENT);
    return true;
  }

  protected abstract groupChangedContainer(ms: BasicMergeState, g: Group): void;

  protected initContained(ms: BasicMergeState, leaves: LeafGroup[], toAdd: LeafGroup): void {
    // set up container details
    const c2 = toAdd.container;
    ms.addGroupContainerMapping(
      toAdd,
      c2,
      toAdd.occupiesSpace() ? GroupContainerState.HAS_CONTENT : GroupContainerState.NO_CONTENT,
    );
    leaves.push(toAdd);
  }

  /**
   * Throws out any merge options that don't make sense.
   *
   * Priority is returned, or null if the merge is irrelevant
   *
   * This is called before we add merge options to the queue, and also when we take them off the
   * queue, as the state will change.
   *
   * Extra parameters about aligned group are added to simplify the process for
   */
  canGroupsMerge(
    a: Group,
    b: Group,
    _ms: BasicMergeState,
    _alignedGroup: Group | null,
    _d: Direction | null,
  ): number {
    // not a real merge
    return a === b ? AbstractGroupingStrategy.INVALID_MERGE : 0;
  }

  protected preMergeInitialisation(ms: BasicMergeState): void {
    for (const g of this.allGroups) {
      this.initContained(ms, [], g);
    }
    const bottomLevelContainers = [...ms.getContainers()];
    if (bottomLevelContainers.length > 0) {
      for (const c of bottomLevelContainers) {
        if (this.isContainerMergeable(c, ms)) {
          this.startContainerMerge(ms, c);
        }
        if (this.isContainerComplete(c, ms)) {
          this.completeContainer(ms, c);
        }
      }
    } else if (this.allGroups.size === 1) {
      ms.addLiveGroup(this.allGroups.values().next().value!);
    }
  }
}
