import type { GroupPhase } from "../../GroupPhase.js";
import type { Group } from "../basic/group/Group.js";
import type { BasicMergeState } from "../basic/merge/BasicMergeState.js";
import { AbstractRuleBasedGroupingStrategy } from "../directed/AbstractRuleBasedGroupingStrategy.js";
import { DirectedLinkManager } from "../directed/group/DirectedLinkManager.js";
import { AbstractMergeGenerator } from "./AbstractMergeGenerator.js";
import type { GeneratorBasedGroupingStrategy } from "./GeneratorBasedGroupingStrategy.js";

/**
 * Generates linked merge options for undirected links.
 *
 * @author robmoffat
 */
export class ContainerUndirectedLinkedMergeGenerator extends AbstractMergeGenerator {
  constructor(gp: GroupPhase, ms: BasicMergeState, grouper: GeneratorBasedGroupingStrategy) {
    super(gp, ms, grouper);
  }

  generate(group: Group): void {
    this.log.send(this.log.go() ? null : "Generating " + this.getCode() + " options for " + group);
    const mask = DirectedLinkManager.createMask(null, false, true, null);
    for (const destinationGroup of group.linkManager.subsetGroup(mask)) {
      this.addMergeOption(group, destinationGroup, null, null);
    }
  }

  public override getMyBestPriority(): number {
    return AbstractRuleBasedGroupingStrategy.UNDIRECTED_LINKED;
  }

  override getCode(): string {
    return "ContainerUndirected";
  }
}
