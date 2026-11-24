import {
  createActionableBehaviour,
  createResizableBehaviour,
  createSelectableBehaviour,
  createStyleableBehaviour,
} from "@kite9/ui-behaviours";
import type { BehaviourPack } from "@kite9/ui";

/** Composed in preview — select + context menu + styles + resize for `mode="edit"`. */
export const editablePack: BehaviourPack = {
  id: "editable",
  behaviours: [
    createSelectableBehaviour(),
    createActionableBehaviour(),
    createStyleableBehaviour(),
    createResizableBehaviour(),
  ],
};
