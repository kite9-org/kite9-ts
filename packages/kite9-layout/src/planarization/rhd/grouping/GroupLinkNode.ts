import type { Connected } from "@kite9/model";

/**
 * This is a marker interface for things that can be linked to in the grouping phase.
 * Any links not meeting a LinkNode must be transferred onto a LinkNode.
 */
export interface GroupLinkNode extends Connected {}
