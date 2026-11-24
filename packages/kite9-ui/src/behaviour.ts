import type { CommandContext } from "@kite9/command";
import { ContextMenu } from "./context-menu/context-menu.js";
import type { LayoutSession } from "./layout-session.js";

export type BehaviourContext = {
  /** Light-DOM diagram root (`kite9-diagram`). */
  root: Element;
  /** Required: all mutating behaviours apply changes via @kite9/command. */
  command: CommandContext;
  /** Shared floating menu for edit actions (Styles, etc.). */
  contextMenu: ContextMenu;
  /**
   * Live adjustable layout for the scene (optional).
   * Resize / margins mutate `layout` then call `apply()`.
   */
  layout?: LayoutSession;
};

export interface Behaviour {
  readonly id: string;
  /** Attach listeners / UI; return disposer. */
  activate(ctx: BehaviourContext): () => void;
}

/** Named set of behaviours activated together (e.g. editable mode). */
export type BehaviourPack = {
  readonly id: string;
  readonly behaviours: readonly Behaviour[];
};

/** Activate every behaviour in the pack; returns a combined disposer. */
export function applyBehaviourPack(
  pack: BehaviourPack,
  root: Element,
  command: CommandContext,
  layout?: LayoutSession,
  contextMenu: ContextMenu = new ContextMenu(),
): () => void {
  const ctx: BehaviourContext = { root, command, contextMenu, layout };
  const disposers = pack.behaviours.map((b) => b.activate(ctx));
  return () => {
    contextMenu.destroy();
    for (const dispose of disposers.reverse()) {
      dispose();
    }
  };
}
