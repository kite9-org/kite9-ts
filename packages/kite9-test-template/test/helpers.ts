import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutData } from "@kite9/model";
import { createCardDiagram } from "../src/fixtures/card-diagram.js";
import { createEmptyDiagram } from "../src/fixtures/empty-diagram.js";

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesJson = join(here, "../fixtures/json");
export const fixturesGrid = join(here, "../fixtures/grid");

/**
 * Mount the light-DOM scene into the test document.
 * Markup comes from shared helpers (`createCardDiagram` / `createEmptyDiagram`).
 */
export function mountScene(name: string): Element {
  document.body.innerHTML = "";
  let root: Element;
  if (name === "card.html") {
    root = createCardDiagram();
  } else if (name === "empty.html") {
    root = createEmptyDiagram();
  } else {
    throw new Error(`Unknown scene fixture: ${name}`);
  }
  document.body.appendChild(root);
  return root;
}

export function expectedModelJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesJson, name), "utf8"));
}

export function loadGridFixture(name: string): LayoutData {
  return JSON.parse(
    readFileSync(join(fixturesGrid, name), "utf8"),
  ) as LayoutData;
}
