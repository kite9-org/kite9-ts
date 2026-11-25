import type { Direction, Rectangular } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { Containers } from "../basic/merge/Containers.js";
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

  override addMergeOption(
    g1: Group,
    g2: Group,
    alignedGroup: Group | null,
    alignedSide: Direction | null,
  ): void {
    if (this.liveOnly) {
      const cc = Containers.getCommonContainers(this.ms, g1, g2);
      const liveCC = Containers.getLiveContainers(this.ms, cc);
      if (liveCC.size > 0) {
        super.addMergeOption(g1, g2, alignedGroup, alignedSide);
      } else {
        for (const c of cc) {
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
      }
    } else {
      super.addMergeOption(g1, g2, alignedGroup, alignedSide);
    }
  }
}
