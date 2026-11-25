import { Layout } from "@kite9/model";
import type { BiDirectional, Connected, Direction, Rectangular } from "@kite9/model";
import type { GroupLinkNode } from "../../GroupLinkNode.js";
import type { Group } from "./Group.js";

export interface LeafGroup extends Group {
  readonly kind: "leaf";

  readonly connected: GroupLinkNode;
  readonly container: Rectangular;

  sortLink(
    d: Direction | null,
    otherGroup: Group,
    linkValue: number,
    ordering: boolean,
    linkRank: number,
    c: Iterable<BiDirectional<Connected>>,
  ): void;
}

export function getAxisLayout(container: Rectangular | null): Layout | null {
  const layout = container?.getLayout() ?? null;
  switch (layout) {
    case Layout.HORIZONTAL:
    case Layout.VERTICAL:
      return layout;
    default:
      return null;
  }
}
