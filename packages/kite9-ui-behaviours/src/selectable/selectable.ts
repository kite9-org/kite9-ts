import type { Behaviour, BehaviourContext } from "@kite9/ui";
import {
  addNamedEventListener,
  currentTarget,
  getKite9Target,
  removeNamedEventListener,
  setDiagramRoot,
} from "@kite9/ui";
import {
  clearSelection,
  emitSelectionChange,
  isSelected,
  select,
  singleSelect,
  unselect,
} from "./selection.js";

export type SelectableOptions = {
  /** When true, only one element may be selected at a time. Default true. */
  singleSelectMode?: boolean;
};

function enableLinkHitTesting(root: Element): void {
  root.classList.add("edit-mode");
  if (!root.hasAttribute("mode")) {
    root.setAttribute("mode", "edit");
  }
}

function disableLinkHitTesting(root: Element): void {
  root.classList.remove("edit-mode");
}

export function createSelectableBehaviour(
  options: SelectableOptions = {},
): Behaviour {
  const singleSelectMode = options.singleSelectMode ?? true;

  return {
    id: "selectable",
    activate(ctx: BehaviourContext): () => void {
      const { root } = ctx;
      setDiagramRoot(root);
      enableLinkHitTesting(root);

      const resolveHit = (event: Event): Element | null => {
        const path = typeof event.composedPath === "function" ? event.composedPath() : [];
        for (const node of path) {
          if (!(node instanceof Element)) continue;
          const resolved = getKite9Target(node, root);
          if (resolved) return resolved;
        }
        const fromEvent =
          event.target instanceof Element ? event.target : null;
        if (fromEvent) {
          const resolved = getKite9Target(fromEvent, root);
          if (resolved) return resolved;
        }
        return getKite9Target(currentTarget(event), root);
      };

      const onPointer = (event: Event) => {
        const handled = event as Event & { handledSelect?: boolean };
        if (handled.handledSelect) return;

        const target = resolveHit(event);

        if (target == null) {
          clearSelection(root);
          emitSelectionChange(root);
          handled.handledSelect = true;
          return;
        }

        if (!isSelected(target)) {
          if (singleSelectMode) {
            singleSelect([target], root);
          } else {
            select(target, root);
          }
        } else {
          unselect(target);
        }

        emitSelectionChange(root);
        handled.handledSelect = true;
      };

      addNamedEventListener(root, "mousedown", "selectable", onPointer);
      // Capture on shadow so stage clicks fire even when light-DOM is empty areas
      const shadow = (root as HTMLElement).shadowRoot;
      if (shadow) {
        addNamedEventListener(shadow, "mousedown", "selectable-shadow", onPointer);
      }

      return () => {
        removeNamedEventListener(root, "mousedown", "selectable");
        if (shadow) {
          removeNamedEventListener(shadow, "mousedown", "selectable-shadow");
        }
        disableLinkHitTesting(root);
      };
    },
  };
}
