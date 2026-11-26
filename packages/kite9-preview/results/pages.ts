/** Server-side HTML for the functional results Vite middleware. */

import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prettyDiagramHtml } from "./pretty-html.js";

export { prettyDiagramHtml } from "./pretty-html.js";

const resultsDir = path.dirname(fileURLToPath(import.meta.url));

function loadTemplate(name: string): string {
  return readFileSync(path.join(resultsDir, name), "utf8");
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Vite `/@fs` URL so middleware-served HTML can load assets outside the Vite root. */
function resultsAssetUrl(name: string): string {
  return `/@fs${path.join(resultsDir, name)}`;
}

export function renderResultsIndex(rows: unknown[]): string {
  const dataJson = JSON.stringify(rows).replaceAll("</", "<\\/");
  return loadTemplate("index.html")
    .replace("__RESULTS_DATA__", dataJson)
    .replace("__RESULTS_CSS__", resultsAssetUrl("index.css"))
    .replace("__RESULTS_CLIENT__", resultsAssetUrl("index.ts"));
}

export function renderSourceView(
  suite: string,
  name: string,
  fragment: string,
): string {
  const pretty = escapeHtml(prettyDiagramHtml(fragment));
  return loadTemplate("source.html")
    .replaceAll("__NAME__", escapeHtml(name))
    .replaceAll("__SUITE__", escapeHtml(suite))
    .replace("__PRETTY__", pretty);
}

export function renderSourceText(fragment: string): string {
  return prettyDiagramHtml(fragment);
}
