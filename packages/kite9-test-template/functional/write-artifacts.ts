/** Node-side artifact writers for Playwright functional runs. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { LayoutData } from "@kite9/model";
import type { FunctionalKind } from "./functional-kind.ts";

export type ArtifactPaths = {
  /** Package root that owns `outputs/` and `test/functional/expected/`. */
  packageRoot: string;
  /**
   * When true (default for layout kinds), write `outputs/{kind}/{suite}/{name}/`.
   * When false (`grid`), write `outputs/{suite}/{name}/`.
   */
  nestKindInOutputs?: boolean;
};

export function outputsDir(
  paths: ArtifactPaths,
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  const nest =
    paths.nestKindInOutputs ?? (kind !== "grid" && kind !== "routes");
  return nest
    ? path.join(paths.packageRoot, "outputs", kind, suite, name)
    : path.join(paths.packageRoot, "outputs", suite, name);
}

export function expectedDir(paths: ArtifactPaths): string {
  return path.join(paths.packageRoot, "test/functional/expected");
}

/**
 * Browser viewer: light-DOM + `@kite9/preview` bootScene (edit/resize).
 * `layoutJsonUrl` should be a Vite-resolvable absolute path when the HTML is
 * served outside the Vite root (e.g. `/grid-outputs/.../name-layout.json`).
 */
export function buildViewHtml(
  name: string,
  inputHtml: string,
  kind: FunctionalKind,
  layoutJsonUrl = `./${name}-layout.json`,
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
    <a class="back" href="/results/?kind=${kind}">← all results</a>
    <h1>${name}</h1>
    <div id="mount">
${inputHtml}
    </div>
    <script type="module">
      import { bootScene } from "@kite9/preview";
      import layoutData from ${JSON.stringify(layoutJsonUrl)};

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
  paths: ArtifactPaths,
  kind: FunctionalKind,
  suite: string,
  name: string,
  inputHtml: string,
  layoutData: LayoutData,
): string {
  const dir = outputsDir(paths, kind, suite, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}-input.html`), inputHtml, "utf8");
  writeFileSync(
    path.join(dir, `${name}-layout.json`),
    `${JSON.stringify(layoutData, null, 2)}\n`,
    "utf8",
  );
  const nest = paths.nestKindInOutputs ?? kind !== "grid";
  // Outside Vite root (grid): import via /@fs so transform resolves the JSON.
  const layoutJsonUrl = nest
    ? `./${name}-layout.json`
    : `/@fs${path.join(dir, `${name}-layout.json`).split(path.sep).join("/")}`;
  writeFileSync(
    path.join(dir, `${name}.html`),
    buildViewHtml(name, inputHtml, kind, layoutJsonUrl),
    "utf8",
  );
  return dir;
}
