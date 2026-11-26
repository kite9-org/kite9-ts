import type { Direction, Rectangular } from "@kite9/model";
import { LogicException } from "../../../../logging/LogicException.js";
import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { MergeOption } from "../basic/merge/MergeOption.js";
import { AbstractMergeGenerator } from "./AbstractMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

/**
 * Options that are not in live containers wait until the containers are live
 * before being added to the queue.
 *
 * @author robmoffat
 */
export abstract class AbstractWaitingContainerMergeGenerator extends AbstractMergeGenerator {
  private readonly waitingOptions: Map<Rectangular | null, MergeOption[]> = new Map();

  constructor(
    gp: GroupPhase,
    ms: BasicMergeState,
    grouper: GeneratorBasedGroupingStrategy,
    private readonly liveOnly: boolean,
  ) {
    super(gp, ms, grouper);
  }

  override containerIsLive(c: Rectangular): void {
    if (this.liveOnly) {
      const waitList = this.waitingOptions.get(c);
      this.waitingOptions.delete(c);
      if (waitList != null) {
        for (const mo of waitList) {
          this.grouper.addMergeOption(mo, this.getMyBestPriority(), this.ms);
        }
      }
    }
  }

  getCommonContainer(a: Group, b: Group): Rectangular {
    let ac: Set<Rectangular> = new Set(this.ms.getContainersFor(a)?.keys() ?? []);
    let bc: Set<Rectangular> = new Set(this.ms.getContainersFor(b)?.keys() ?? []);
    while (true) {
      if (ac.size === 0 || bc.size === 0) throw new LogicException("Group has no containers?");
      for (const container of ac) {
        if (bc.has(container)) return container;
      }

      ac = withParents(ac);
      bc = withParents(bc);
    }
  }

  override addMergeOption(
    g1: Group,
    g2: Group,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
  ): void {
    if (this.liveOnly) {
      const c = this.getCommonContainer(g1, g2);
      if (this.ms.isContainerLive(c)) {
        super.addMergeOption(g1, g2, alignedGroup, alignedSide);
      } else {
        // add to the wait-list
        let waitList = this.waitingOptions.get(c);
        if (waitList == null) {
          waitList = [];
          this.waitingOptions.set(c, waitList);
        }
        const p = this.getMyBestPriority();
        const mo = new MergeOption(g1, g2, this.ms.nextMergeOptionNumber(), p, alignedGroup, alignedSide);
        waitList.push(mo);
      }
    } else {
      super.addMergeOption(g1, g2, alignedGroup, alignedSide);
    }
  }
}

function withParents(s: Set<Rectangular>): Set<Rectangular> {
  const out = new Set(s);
  for (const it of s) {
    const p = it.getContainer();
    if (p != null) out.add(p);
  }
  return out;
}
