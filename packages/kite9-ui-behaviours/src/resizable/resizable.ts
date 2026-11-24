import type { Behaviour, BehaviourContext } from "@kite9/ui";
import { activateChromeResize } from "./chrome-resize.js";

/** Chrome corner resize handles on selected `k9-ui~=size` hosts. */
export function createResizableBehaviour(): Behaviour {
  return {
    id: "resizable",
    activate(ctx: BehaviourContext): () => void {
      return activateChromeResize(ctx);
    },
  };
}
