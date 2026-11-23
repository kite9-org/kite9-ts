import type { CompletedLayout } from "@kite9/model";
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { applyLayout, testTemplatePack } from "../src/index.js";

/**
 * Paint template chrome into shadow roots and apply a completed layout.
 * If `#json` is present, fill it with `serializeDiagram` output.
 */
export function bootScene(layout: CompletedLayout): void {
  const root = document.querySelector("kite9-diagram");
  if (!root) {
    throw new Error("No <kite9-diagram> in document");
  }

  const diagram = createDiagram(root, testTemplatePack);
  applyLayout(root, layout, testTemplatePack);

  const jsonOut = document.querySelector("#json");
  if (jsonOut) {
    jsonOut.textContent = JSON.stringify(serializeDiagram(diagram), null, 2);
  }
}
