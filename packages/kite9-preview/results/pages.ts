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

/**
 * Diagram viewer that paints `inputHtml` with the expected layout baseline
 * (same chrome as output `*.html`, but layout JSON is the expected file).
 */
export function renderExpectedView(opts: {
  kind: string;
  suite: string;
  name: string;
  inputHtml: string;
  layoutData: unknown;
}): string {
  const { kind, suite, name, inputHtml, layoutData } = opts;
  const title = escapeHtml(`${name} (expected)`);
  const layoutJson = JSON.stringify(layoutData).replaceAll("</", "<\\/");
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 1.25rem; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      h1 { margin: 0 0 0.75rem; font-size: 1.1rem; font-weight: 500; }
      .badge {
        display: inline-block; margin-left: 0.5rem;
        font-size: 0.7rem; font-weight: 700; letter-spacing: 0.04em;
        text-transform: uppercase; color: #1d4ed8;
        border: 1px solid #93c5fd; background: #eff6ff;
        border-radius: 4px; padding: 0.15rem 0.4rem; vertical-align: middle;
      }
      #mount { display: inline-block; background: #fff; box-shadow: 0 1px 3px rgb(15 23 42 / 12%); }
      a.back { display: inline-block; margin-bottom: 0.75rem; color: #1d4ed8; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <a class="back" href="/results/?kind=${escapeHtml(kind)}">← all results</a>
    <h1>${escapeHtml(name)} <span class="badge">expected</span></h1>
    <div id="mount">
${inputHtml}
    </div>
    <script type="module">
      import { bootScene } from "@kite9/preview";
      const layoutData = ${layoutJson};
      const root = document.querySelector("kite9-diagram");
      if (!root) throw new Error("No <kite9-diagram> in document");
      root.setAttribute("mode", "edit");
      bootScene(layoutData, root);
    </script>
  </body>
</html>
`;
}
