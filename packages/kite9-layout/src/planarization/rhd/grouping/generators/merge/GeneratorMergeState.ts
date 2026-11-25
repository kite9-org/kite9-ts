import { PriorityQueue } from "../../../../../common/algorithms/ssp/PriorityQueue.js";
import type { ContradictionHandler } from "../../../links/ContradictionHandler.js";
import type { Group } from "../../basic/group/Group.js";
import type { PriorityRule } from "../../directed/PriorityRule.js";
import { DirectedMergeState } from "../../directed/merge/DirectedMergeState.js";
import type { MergeGenerator } from "../MergeGenerator.js";

function cmp(a: number, b: number): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Extends the merge state for the generator based grouping strategy. Keeps a
 * list of which groups a generator has not been run on.
 *
 * @author robmoffat
 */
export class GeneratorMergeState extends DirectedMergeState {
  readonly generators: MergeGenerator[] = [];
  readonly rules: PriorityRule[] = [];
  readonly toDo: PriorityQueue<Group>;

  constructor(ch: ContradictionHandler, elements: number) {
    super(ch, elements);
    this.toDo = new PriorityQueue<Group>(elements + 1, (arg0, arg1) => {
      if (arg0.size !== arg1.size) {
        return cmp(arg0.size, arg1.size);
      } else {
        return cmp(arg0.linkManager.linkCount, arg1.linkManager.linkCount);
      }
    });
  }

  override addLiveGroup(group: Group): void {
    super.addLiveGroup(group);
    this.toDo.add(group);
  }

  nextLiveGroup(): Group | null {
    return this.toDo.remove();
  }
}
