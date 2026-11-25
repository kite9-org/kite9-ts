import type { Rectangular } from "@kite9/model";
import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { MergePlane, mergePlaneMatches } from "../directed/MergePlane.js";
import { DirectedGroupAxis } from "../directed/group/DirectedGroupAxis.js";
import { AbstractMergeGenerator } from "./AbstractMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

/**
 * Generates some merge options for mergable containers. We store live groups in exactly the same
 * way as the other generators, but instead of generating a single merge option we generate all the
 * ones needed to merge the whole container. This is because it's quciker to do this, and you're
 * likely to need them.
 *
 * @author robmoffat
 */
export class ContainerUndirectedNeighbourMergeGenerator extends AbstractMergeGenerator {
  // keeps track of groups we've already done
  dontDo: Map<Rectangular, Set<Group>> = new Map();

  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper);
  }

  override containerIsLive(c: Rectangular): void {
    super.containerIsLive(c);
    this.dontDo.set(c, new Set<Group>());
  }

  private generateNeighboursForContainer(
    c: Rectangular,
    ms: BasicMergeState,
    _grouper: GeneratorBasedGroupingStrategy,
    mp: MergePlane,
  ): void {
    this.log.send(
      this.log.go()
        ? null
        : "Generating " + this.getCode() + " options for " + c + " in axis " + mp,
    );
    const csi = ms.getStateFor(c)!;
    const myDontDo = this.dontDo.get(c)!;
    const orderedItems: Group[] = [];
    for (const group of csi.contents) {
      if (mergePlaneMatches(mp, DirectedGroupAxis.getState(group))) {
        myDontDo.add(group);
        orderedItems.push(group);
      }
    }
    orderedItems.sort((o1, o2) => o1.groupOrdinal - o2.groupOrdinal);
    this.createNeighbourMergeOptions(orderedItems);
  }

  private createNeighbourMergeOptions(orderedItems: Group[]): void {
    let prev: Group | null = null;
    for (const current of orderedItems) {
      if (prev != null) {
        this.addMergeOption(prev, current, null, null);
      }
      prev = current;
    }
  }

  protected override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.UNCONNECTED_NEIGHBOUR;
  }

  generate(poll: Group): void {
    for (const c of [...this.ms.getContainersFor(poll)!.keys()]) {
      if (this.ms.isContainerLive(c)) {
        if (this.dontDo.get(c)!.has(poll)) {
          return;
        }
        const state = DirectedGroupAxis.getState(poll);
        switch (state) {
          case MergePlane.UNKNOWN:
            this.generateNeighboursForContainer(c, this.ms, this.grouper, MergePlane.X_FIRST_MERGE);
            this.generateNeighboursForContainer(c, this.ms, this.grouper, MergePlane.Y_FIRST_MERGE);
            break;
          case MergePlane.X_FIRST_MERGE:
            this.generateNeighboursForContainer(c, this.ms, this.grouper, MergePlane.X_FIRST_MERGE);
            break;
          case MergePlane.Y_FIRST_MERGE:
            this.generateNeighboursForContainer(c, this.ms, this.grouper, MergePlane.Y_FIRST_MERGE);
            break;
        }
      } else if (this.dontDo.has(c)) {
        this.dontDo.delete(c);
      }
    }
  }

  override getCode(): string {
    return "ContainerNeighbour";
  }
}
