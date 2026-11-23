import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompletedLayout } from "@kite9/model";

const here = dirname(fileURLToPath(import.meta.url));
export const fixturesHtml = join(here, "../fixtures/html");
export const fixturesJson = join(here, "../fixtures/json");
export const fixturesGrid = join(here, "../fixtures/grid");

/**
 * Mount the light-DOM scene from a full fixture HTML document into the test
 * document (extracts `<kite9-diagram>` only — avoids happy-dom fetching page
 * `<link>` / `<script>` assets).
 */
export function mountScene(name: string): Element {
  const html = readFileSync(join(fixturesHtml, name), "utf8");
  const match = html.match(/<kite9-diagram\b[\s\S]*?<\/kite9-diagram>/i);
  if (!match) throw new Error(`No <kite9-diagram> in ${name}`);
  document.body.innerHTML = match[0];
  const root = document.body.querySelector("kite9-diagram");
  if (!root) throw new Error(`Failed to mount <kite9-diagram> from ${name}`);
  return root;
}

export function expectedModelJson(name: string): unknown {
  return JSON.parse(readFileSync(join(fixturesJson, name), "utf8"));
}

export function loadGridFixture(name: string): CompletedLayout {
  return JSON.parse(readFileSync(join(fixturesGrid, name), "utf8")) as CompletedLayout;
}
