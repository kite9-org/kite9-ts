import type { BehaviourContext, ContextMenuCallback } from "@kite9/ui";

/** Simple geometric “styles” glyph as a data URL. */
export const stylesIconUrl =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#334155" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 15h10M7 11h6"/></svg>`,
  );

/**
 * Top-level Styles control; click clears the menu and runs submenu callbacks.
 */
export function createStylesMenuCallback(
  ctx: BehaviourContext,
  submenu: readonly ContextMenuCallback[],
): ContextMenuCallback {
  return (event, cm) => {
    const selected =
      ctx.root.querySelector(".lastSelected[id][k9-ui]") ??
      ctx.root.querySelector(".selected[id][k9-ui]");
    if (!selected) return;

    cm.addControl(
      event,
      stylesIconUrl,
      "Styles",
      () => {
        cm.clear();
        for (const item of submenu) {
          item(event, cm);
        }
      },
      "Actions",
    );
  };
}
