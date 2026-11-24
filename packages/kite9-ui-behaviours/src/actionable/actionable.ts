import type { Behaviour, BehaviourContext } from "@kite9/ui";
import {
  addNamedEventListener,
  removeNamedEventListener,
} from "@kite9/ui";

/**
 * Opens the shared context menu on click when something is selected.
 * Pair with selectable (mousedown) — register after selectable in the pack.
 */
export function createActionableBehaviour(): Behaviour {
  return {
    id: "actionable",
    activate(ctx: BehaviourContext): () => void {
      const { root, contextMenu } = ctx;

      const onClick = (event: Event) => {
        // Overlay sizing chrome lives in shadow; its click must not dismiss
        // an open OK/Cancel editor (e.g. margins).
        const path = event.composedPath();
        if (
          path.some(
            (n) =>
              n instanceof Element &&
              (n.classList?.contains("_overlay") ||
                n.closest?.("svg._overlay, g._overlay")),
          )
        ) {
          return;
        }

        contextMenu.destroy();

        const selected =
          root.querySelector(".lastSelected") ??
          root.querySelector(".selected");
        if (!selected?.getAttribute("id")) {
          return;
        }

        contextMenu.handle(event);
        event.stopPropagation();
      };

      addNamedEventListener(root, "click", "actionable", onClick);
      const shadow = (root as HTMLElement).shadowRoot;
      if (shadow) {
        addNamedEventListener(shadow, "click", "actionable-shadow", onClick);
      }

      return () => {
        removeNamedEventListener(root, "click", "actionable");
        if (shadow) {
          removeNamedEventListener(shadow, "click", "actionable-shadow");
        }
        contextMenu.destroy();
      };
    },
  };
}
