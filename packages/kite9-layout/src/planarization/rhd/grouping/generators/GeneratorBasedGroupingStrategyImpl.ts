import type { DiagramElement, Direction, Rectangular } from "@kite9/model";
import type { DiagramElementFactory } from "../../../../common/elements/factory/DiagramElementFactory.js";
import type { GridPositioner } from "../../../../common/elements/grid/GridPositioner.js";
import type { ContradictionHandler } from "../../links/ContradictionHandler.js";
import type { GroupResult } from "../GroupResult.js";
import { AbstractGroupingStrategy } from "../basic/AbstractGroupingStrategy.js";
import type { CompoundGroup } from "../basic/group/CompoundGroup.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { MergeKey } from "../basic/merge/MergeKey.js";
import { MergeOption } from "../basic/merge/MergeOption.js";
import { AxisHandlingGroupingStrategy } from "../directed/AxisHandlingGroupingStrategy.js";
import type { PriorityRule } from "../directed/PriorityRule.js";
import { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import type { DirectedMergeState } from "../directed/merge/DirectedMergeState.js";
import { AlignedDirectedPriorityRule } from "../rules/AlignedDirectedPriorityRule.js";
import { NeighbourDirectedPriorityRule } from "../rules/NeighbourDirectedPriorityRule.js";
import { UndirectedPriorityRule } from "../rules/UndirectedPriorityRule.js";
import { AxisAlignedMergeGenerator } from "./AxisAlignedMergeGenerator.js";
import { AxisNeighbourMergeGenerator } from "./AxisNeighbourMergeGenerator.js";
import { AxisSingleMergeGenerator } from "./AxisSingleMergeGenerator.js";
import { ContainerUndirectedAlignedMergeGenerator } from "./ContainerUndirectedAlignedMergeGenerator.js";
import { ContainerUndirectedLinkedMergeGenerator } from "./ContainerUndirectedLinkedMergeGenerator.js";
import { ContainerUndirectedNeighbourMergeGenerator } from "./ContainerUndirectedNeighbourMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";
import { PerpendicularAlignedMergeGenerator } from "./PerpendicularAlignedMergeGenerator.js";
import { PerpendicularDirectedMergeGenerator } from "./PerpendicularDirectedMergeGenerator.js";
import { GeneratorMergeState } from "./merge/GeneratorMergeState.js";

enum Change {
  NO_CHANGE,
  CHANGED,
  DISCARD,
}

/**
 * This contains the mechanism for creating merge options from generators.
 *
 * The general approach is to generate as few merge options as possible.  This is done by asking each
 * generator to create legal merge options.  Should a generator create a legal option, we stop
 * and process the merges from it.
 *
 * @author robmoffat
 */
export class GeneratorBasedGroupingStrategyImpl
  extends AxisHandlingGroupingStrategy
  implements GeneratorBasedGroupingStrategy
{
  constructor(
    top: DiagramElement,
    elements: number,
    ch: ContradictionHandler,
    gp: GridPositioner,
    ef: DiagramElementFactory<unknown>,
  ) {
    super(top, elements, ch, gp, ef, new GeneratorMergeState(ch, elements));
  }

  addMergeOption(
    g1: Group,
    g2: Group,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
    bestPriority: number,
    ms: BasicMergeState,
  ): void;
  addMergeOption(mo: MergeOption, bestPriority: number, ms: BasicMergeState): number;
  addMergeOption(...args: unknown[]): number | void {
    if (args.length === 3) {
      return this.addExistingMergeOption(
        args[0] as MergeOption,
        args[1] as number,
        args[2] as BasicMergeState,
      );
    }
    const [g1, g2, alignedGroup, alignedSide, bestPriority, ms] = args as [
      Group,
      Group,
      Group | null,
      Direction | null,
      number,
      BasicMergeState,
    ];
    const mk = new MergeKey(g1, g2);
    const best = ms.getBestOption(mk);
    if (best != null && best.priority <= bestPriority) {
      // we already have this option with at least as good a priority.
      return;
    }
    const p = this.canGroupsMerge(g1, g2, ms, alignedGroup, alignedSide);
    if (p !== AbstractGroupingStrategy.INVALID_MERGE) {
      const mo = new MergeOption(g1, g2, ms.nextMergeOptionNumber(), p, alignedGroup, alignedSide);
      mo.calculateMergeOptionMetrics(ms);
      const added = ms.addOption(mo);
      if (added) {
        this.log.send(this.log.go() ? null : `Added Merge Option: ${mo}`);
      }
    }
  }

  private addExistingMergeOption(mo: MergeOption, bestPriority: number, ms: BasicMergeState): number {
    const mk = mo.mk;
    const best = ms.getBestOption(mk);
    if (best != null && best.priority <= bestPriority) {
      // we already have this option with at least as good a priority.
      return best.priority;
    }
    const c = this.updateMergeOption(mo);
    if (c === Change.DISCARD) {
      return AbstractGroupingStrategy.INVALID_MERGE;
    }
    const p = this.canGroupsMerge(mk.a, mk.b, ms, mo.alignedGroup, mo.alignedDirection);
    if (p !== AbstractGroupingStrategy.INVALID_MERGE) {
      mo.resetPriority(p);
      mo.calculateMergeOptionMetrics(ms);
      const added = ms.addOption(mo);
      if (added) {
        this.log.send(this.log.go() ? null : `Added Merge Option: ${mo}`);
      }
    }
    return p;
  }

  /**
   * Add MergeOptions to the queue for a given group.
   */
  createMergeOptions(ms: BasicMergeState): void {
    const gms = ms as GeneratorMergeState;
    let next = gms.nextLiveGroup();
    while (next != null) {
      this.log.send("Merge options for:" + next);
      for (const strat of gms.generators) {
        strat.generate(next);
      }
      next = gms.nextLiveGroup();
    }
  }

  group(): GroupResult {
    const ms = this.ms;
    this.setupMergeState(ms);
    this.preMergeInitialisation(ms);
    while (ms.groupsCount() > 1) {
      this.createMergeOptions(ms);
      try {
        const mo = ms.nextMergeOption()!;
        const c = this.updateMergeOption(mo);
        if (c === Change.CHANGED || c === Change.NO_CHANGE) {
          const p = this.canGroupsMerge(mo.mk.a, mo.mk.b, ms, mo.alignedGroup, mo.alignedDirection);
          if (p !== AbstractGroupingStrategy.INVALID_MERGE) {
            if (p !== mo.priority || c === Change.CHANGED) {
              // poke it back in to use in desperation
              mo.resetPriority(p);
              mo.calculateMergeOptionMetrics(ms);
              ms.addOption(mo);
            } else {
              if (p === AbstractGroupingStrategy.ILLEGAL_PRIORITY) {
                this.log.error(`Inserting with Illegal: ${mo}`);
              }
              this.performMerge(ms, mo);
            }
          }
        }
      } catch (e) {
        this.log.send("Groups:", ms.groups());
        throw e;
      }
    }
    return ms;
  }

  /**
   * This is called when a merge option changes because groups within it have already
   * been merged.
   */
  private updateMergeOption(mo: MergeOption): Change {
    const a = this.getWorkingGroup(mo.mk.a);
    const b = this.getWorkingGroup(mo.mk.b);
    const alignedGroup = this.getWorkingGroup(mo.alignedGroup);
    if (a !== b && a !== alignedGroup && b !== alignedGroup) {
      if (a !== mo.mk.a || b !== mo.mk.b || alignedGroup !== mo.alignedGroup) {
        const newKey = new MergeKey(a!, b!);
        mo.mk = newKey;
        mo.alignedGroup = alignedGroup;
        return Change.CHANGED;
      } else {
        return Change.NO_CHANGE;
      }
    } else {
      return Change.DISCARD;
    }
  }

  protected override introduceCombinedGroup(ms: BasicMergeState, combined: CompoundGroup): void {
    combined.log(this.log);
    ms.addLiveGroup(combined);
  }

  compatibleMerge(a: Group, b: Group): boolean {
    return DirectedGroupAxis.compatibleNeighbour(a, b);
  }

  protected setupMergeState(bms: BasicMergeState): void {
    const ms = bms as GeneratorMergeState;

    // axis merges take priority over everything else
    ms.generators.push(new AxisSingleMergeGenerator(this, ms, this));
    ms.generators.push(new AxisAlignedMergeGenerator(this, ms, this));
    ms.generators.push(new AxisNeighbourMergeGenerator(this, ms, this));

    // perpendicular, undirected, in-container merges
    ms.generators.push(new ContainerUndirectedLinkedMergeGenerator(this, ms, this));
    ms.generators.push(new ContainerUndirectedAlignedMergeGenerator(this, ms, this));
    ms.generators.push(new ContainerUndirectedNeighbourMergeGenerator(this, ms, this));

    // perpendicular, directed, in & out of container merges
    ms.generators.push(new PerpendicularAlignedMergeGenerator(this, ms, this));
    ms.generators.push(new PerpendicularDirectedMergeGenerator(this, ms, this));

    // order is significant

    // axis merges first
    ms.rules.push(new NeighbourDirectedPriorityRule(true));
    ms.rules.push(new AlignedDirectedPriorityRule(true));

    // undirected merges
    ms.rules.push(new UndirectedPriorityRule());

    // perpendicular merges
    ms.rules.push(new NeighbourDirectedPriorityRule(false));
    ms.rules.push(new AlignedDirectedPriorityRule(false));
  }

  protected override getRules(ms: DirectedMergeState): PriorityRule[] {
    return (ms as GeneratorMergeState).rules;
  }

  protected override startContainerMerge(ms: BasicMergeState, c: Rectangular): void {
    super.startContainerMerge(ms, c);
    for (const gen of (ms as GeneratorMergeState).generators) {
      gen.containerIsLive(c);
    }
  }
}
