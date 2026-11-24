import type { Behaviour, BehaviourContext } from "@kite9/ui";
import { Overlay, setDiagramRoot } from "@kite9/ui";
import { createMarginsStyleCallback } from "./margins.js";
import { createStylesMenuCallback } from "./style-menu.js";

/**
 * Registers Styles → Margins on the shared context menu.
 * Overlay sizing appears only after choosing Margins (not on select).
 */
export function createStyleableBehaviour(): Behaviour {
  return {
    id: "styleable",
    activate(ctx: BehaviourContext): () => void {
      setDiagramRoot(ctx.root);
      const overlay = new Overlay(ctx.root);
      const margins = createMarginsStyleCallback(ctx, overlay);
      const styles = createStylesMenuCallback(ctx, [margins]);
      ctx.contextMenu.add(styles);

      return () => {
        overlay.destroy();
      };
    },
  };
}
