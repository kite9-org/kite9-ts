/** Node-side artifact writers for Playwright functional runs. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutData } from "@kite9/model";
import type { FunctionalKind } from "./functional-kind.js";

const PKG_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);

export function outputsDir(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  return path.join(PKG_ROOT, "outputs", kind, suite, name);
}

/**
 * Browser viewer: light-DOM + `@kite9/preview` bootScene (edit/resize).
 * Served by `pnpm test:results` (preview vite.results.config).
 */
export function buildViewHtml(
  name: string,
  inputHtml: string,
  kind: FunctionalKind,
): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <style>
      body { margin: 1.25rem; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      h1 { margin: 0 0 0.75rem; font-size: 1.1rem; font-weight: 500; }
      #mount { display: inline-block; background: #fff; box-shadow: 0 1px 3px rgb(15 23 42 / 12%); }
      a.back { display: inline-block; margin-bottom: 0.75rem; color: #1d4ed8; font-size: 0.9rem; }
    </style>
  </head>
  <body>
    <a class="back" href="/?kind=${kind}">← all results</a>
    <h1>${name}</h1>
    <div id="mount">
${inputHtml}
    </div>
    <script type="module">
      import { bootScene } from "@kite9/preview";
      import layoutData from "./${name}-layout.json";

      const root = document.querySelector("kite9-diagram");
      if (!root) throw new Error("No <kite9-diagram> in document");
      root.setAttribute("mode", "edit");
      bootScene(layoutData);
    </script>
  </body>
</html>
`;
}

export function writeLayoutArtifacts(
  kind: FunctionalKind,
  suite: string,
  name: string,
  inputHtml: string,
  layoutData: LayoutData,
): string {
  const dir = outputsDir(kind, suite, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}-input.html`), inputHtml, "utf8");
  writeFileSync(
    path.join(dir, `${name}-layout.json`),
    JSON.stringify(layoutData, null, 2),
    "utf8",
  );
  writeFileSync(
    path.join(dir, `${name}.html`),
    buildViewHtml(name, inputHtml, kind),
    "utf8",
  );
  return dir;
}
