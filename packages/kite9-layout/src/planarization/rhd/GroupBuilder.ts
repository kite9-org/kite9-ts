import type { Rectangular } from "@kite9/model";
import type { GroupLinkNode } from "./grouping/GroupLinkNode.js";
import type { CompoundGroup } from "./grouping/basic/group/CompoundGroup.js";
import type { Group } from "./grouping/basic/group/Group.js";
import type { LeafGroup } from "./grouping/basic/group/LeafGroup.js";
import type { MergeOption } from "./grouping/basic/merge/MergeOption.js";

export interface GroupBuilder {
  buildInitialGroups(): void;

  /**
   * Leaf Groups represent a flat plane of objects to lay out on the diagram.  This means that
   * if you want to lay out a container and also some of its contents, the container must be given
   * ports, which are therefore at the same "level" as the contents.
   */
  createLeafGroup(gln: GroupLinkNode, ord: Rectangular): LeafGroup;

  /**
   * We combine leaf groups together in a compound hierarchy.
   * `size` defaults to `a.size + b.size`.
   */
  createCompoundGroup(
    a: Group,
    b: Group,
    treatAsLeaf: boolean,
    mo: MergeOption | null,
    size?: number,
  ): CompoundGroup;
}
