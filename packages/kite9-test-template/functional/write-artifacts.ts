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
 * Browser viewer: actual + expected side by side when a baseline exists.
 * `layoutJsonUrl` should be a Vite-resolvable path when the HTML is served
 * outside the Vite root (e.g. `/@fs/.../name-layout.json`).
 */
export function buildViewHtml(
  name: string,
  inputHtml: string,
  kind: FunctionalKind,
  layoutJsonUrl = `./${name}-layout.json`,
): string {
  const expectedUrl = `/expected/${kind}/${name}`;
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${name}</title>
    <style>
      body { margin: 1.25rem; font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; }
      h1 { margin: 0 0 0.75rem; font-size: 1.1rem; font-weight: 500; }
      a.back { display: inline-block; margin-bottom: 0.75rem; color: #1d4ed8; font-size: 0.9rem; }
      .compare {
        display: flex; flex-wrap: wrap; gap: 1.25rem; align-items: flex-start;
      }
      .panel { min-width: 0; }
      .panel h2 {
        margin: 0 0 0.5rem; font-size: 0.75rem; font-weight: 700;
        letter-spacing: 0.04em; text-transform: uppercase; color: #64748b;
      }
      .panel.expected h2 { color: #1d4ed8; }
      .mount {
        display: inline-block; background: #fff;
        box-shadow: 0 1px 3px rgb(15 23 42 / 12%);
      }
      .expected-missing {
        color: #64748b; font-size: 0.9rem; padding: 0.75rem 0;
      }
    </style>
  </head>
  <body>
    <a class="back" href="/results/?kind=${kind}">← all results</a>
    <h1>${name}</h1>
    <div class="compare">
      <section class="panel actual">
        <h2>Actual</h2>
        <div class="mount" id="mount-actual">
${inputHtml}
        </div>
      </section>
      <section class="panel expected" id="expected-panel">
        <h2>Expected</h2>
        <div class="mount" id="mount-expected">
${inputHtml}
        </div>
        <p class="expected-missing" id="expected-missing" hidden>No expected baseline yet.</p>
      </section>
    </div>
    <script type="module">
      import { bootScene } from "@kite9/preview";
      import actualLayout from ${JSON.stringify(layoutJsonUrl)};

      function normalizeLayout(data) {
        if (!data || typeof data !== "object") return data;
        const placements = data.placements;
        if (placements && !Array.isArray(placements) && typeof placements === "object") {
          return {
            ...data,
            placements: Object.entries(placements).map(([id, p]) => ({ id, ...p })),
          };
        }
        return data;
      }

      const actualRoot = document.querySelector("#mount-actual kite9-diagram");
      if (!actualRoot) throw new Error("No actual <kite9-diagram>");
      actualRoot.setAttribute("mode", "edit");
      bootScene(actualLayout, actualRoot);

      const expectedRoot = document.querySelector("#mount-expected kite9-diagram");
      const missing = document.getElementById("expected-missing");
      const expectedMount = document.getElementById("mount-expected");
      try {
        const res = await fetch(${JSON.stringify(expectedUrl)});
        if (!res.ok) throw new Error(String(res.status));
        const expectedLayout = normalizeLayout(await res.json());
        if (!expectedRoot) throw new Error("No expected <kite9-diagram>");
        expectedRoot.setAttribute("mode", "edit");
        bootScene(expectedLayout, expectedRoot);
      } catch {
        if (expectedMount) expectedMount.hidden = true;
        if (missing) missing.hidden = false;
      }
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
