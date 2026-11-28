import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type UserConfig } from "vite";

const testTemplateRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const packagesRoot = path.resolve(testTemplateRoot, "..");

const E2E_BOOT_VIRTUAL = "/__kite9_e2e_boot.ts";

function e2eHarnessHtmlPlugin(bootEntry: string): Plugin {
  return {
    name: "kite9-behaviour-e2e-harness",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/e2e" || url === "/e2e/") {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Kite9 behaviour e2e</title>
  </head>
  <body>
    <div id="mount"></div>
    <script type="module" src="${E2E_BOOT_VIRTUAL}"></script>
  </body>
</html>`);
          return;
        }
        next();
      });
    },
    resolveId(id) {
      if (id === E2E_BOOT_VIRTUAL) return bootEntry;
      return null;
    },
  };
}

export type BehaviourE2eViteOptions = {
  /** Absolute path to the behaviour package root (for aliases / default boot). */
  packageRoot: string;
  /** Absolute path to the package `e2e/boot.ts` entry. */
  bootEntry: string;
  port: number;
  /** Extra Vite resolve aliases (e.g. sibling behaviours). */
  extraAlias?: Array<{ find: string; replacement: string }>;
};

/** Shared Vite config for behaviour Playwright — no per-package HTML fixtures. */
export function createBehaviourE2eViteConfig(
  options: BehaviourE2eViteOptions,
): UserConfig {
  const { packageRoot, bootEntry, port, extraAlias = [] } = options;

  return defineConfig({
    root: packageRoot,
    publicDir: false,
    appType: "mpa",
    esbuild: {
      jsx: "automatic",
      jsxImportSource: "preact",
    },
    server: {
      host: "127.0.0.1",
      port,
      strictPort: true,
    },
    plugins: [e2eHarnessHtmlPlugin(bootEntry)],
    resolve: {
      alias: [
        {
          find: "@kite9/test-template/fixtures/grid/card.json",
          replacement: path.resolve(
            testTemplateRoot,
            "fixtures/grid/card.json",
          ),
        },
        {
          find: "@kite9/test-template",
          replacement: path.resolve(testTemplateRoot, "src/index.ts"),
        },
        {
          find: "@kite9/preview",
          replacement: path.resolve(packagesRoot, "kite9-preview/src/index.ts"),
        },
        {
          find: "@kite9/ui",
          replacement: path.resolve(packagesRoot, "kite9-ui/src/index.ts"),
        },
        {
          find: "@kite9/command",
          replacement: path.resolve(packagesRoot, "kite9-command/src/index.ts"),
        },
        {
          find: "@kite9/templating",
          replacement: path.resolve(
            packagesRoot,
            "kite9-templating/src/index.ts",
          ),
        },
        {
          find: "@kite9/model",
          replacement: path.resolve(packagesRoot, "kite9-model/src/index.ts"),
        },
        {
          find: "@kite9/css",
          replacement: path.resolve(packagesRoot, "kite9-css/src/index.ts"),
        },
        {
          find: "@kite9/ui-behaviours/selectable",
          replacement: path.resolve(
            packagesRoot,
            "kite9-ui-behaviours/src/selectable/index.ts",
          ),
        },
        {
          find: "@kite9/ui-behaviours/actionable",
          replacement: path.resolve(
            packagesRoot,
            "kite9-ui-behaviours/src/actionable/index.ts",
          ),
        },
        {
          find: "@kite9/ui-behaviours/styleable",
          replacement: path.resolve(
            packagesRoot,
            "kite9-ui-behaviours/src/styleable/index.ts",
          ),
        },
        {
          find: "@kite9/ui-behaviours/resizable",
          replacement: path.resolve(
            packagesRoot,
            "kite9-ui-behaviours/src/resizable/index.ts",
          ),
        },
        {
          find: "@kite9/ui-behaviours",
          replacement: path.resolve(
            packagesRoot,
            "kite9-ui-behaviours/src/index.ts",
          ),
        },
        ...extraAlias,
      ],
    },
  });
}
