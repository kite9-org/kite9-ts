import type { LinkDetail } from "../../../links/LinkManager.js";
import type { Group } from "./Group.js";

export interface CompoundGroup extends Group {
  readonly kind: "compound";

  readonly a: Group;
  readonly b: Group;

  readonly internalLinkA: LinkDetail | null;

  readonly internalLinkB: LinkDetail | null;
}
