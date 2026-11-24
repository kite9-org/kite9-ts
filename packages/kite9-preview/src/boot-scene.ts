import { LocalCommandContext } from "@kite9/command";
import type { LayoutData } from "@kite9/model";
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { applyLayout, testTemplatePack } from "@kite9/test-template";
import { AdjustableLayout, applyBehaviourPack } from "@kite9/ui";
import { editablePack } from "./editable-pack.js";

/**
 * Paint template chrome, apply layout, and when `mode="edit"` activate
 * the editable BehaviourPack (select, context menu, styles, resize).
 */
export function bootScene(layoutSource: LayoutData): void {
  const root = document.querySelector("kite9-diagram");
  if (!root) {
    throw new Error("No <kite9-diagram> in document");
  }

  const diagram = createDiagram(root, testTemplatePack);
  const layout = AdjustableLayout.from(layoutSource);
  const paint = () => applyLayout(root, layout, testTemplatePack);
  paint();

  const jsonOut = document.querySelector("#json");
  if (jsonOut) {
    jsonOut.textContent = JSON.stringify(serializeDiagram(diagram), null, 2);
  }

  let disposeBehaviours: (() => void) | null = null;

  const syncBehaviours = () => {
    disposeBehaviours?.();
    disposeBehaviours = null;
    const mode = root.getAttribute("mode");
    if (mode === "edit") {
      const command = new LocalCommandContext(root);
      disposeBehaviours = applyBehaviourPack(
        editablePack,
        root,
        command,
        { layout, apply: paint },
      );
    }
  };

  syncBehaviours();

  const mo = new MutationObserver((records) => {
    if (records.some((r) => r.attributeName === "mode")) {
      syncBehaviours();
      if (jsonOut) {
        jsonOut.textContent = JSON.stringify(serializeDiagram(diagram), null, 2);
      }
    }
  });
  mo.observe(root, { attributes: true, attributeFilter: ["mode"] });
}
