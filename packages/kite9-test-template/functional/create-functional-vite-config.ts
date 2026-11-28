import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin, type UserConfig } from "vite";

const testTemplateRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packagesRoot = path.resolve(testTemplateRoot, "..");

const BOOT_VIRTUAL = "/__kite9_functional_boot.ts";

function functionalHarnessPlugin(bootEntry: string, title: string): Plugin {
  return {
    name: "kite9-functional-harness",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/functional" || url === "/functional/") {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${title}</title>
    <style>
      body { margin: 1.25rem; font-family: system-ui, sans-serif; background: #f8fafc; }
      #mount { display: inline-block; background: #fff; }
    </style>
  </head>
  <body>
    <div id="mount"></div>
    <script type="module" src="${BOOT_VIRTUAL}"></script>
  </body>
</html>`);
          return;
        }
        next();
      });
    },
    resolveId(id) {
      if (id === BOOT_VIRTUAL) return bootEntry;
      return null;
    },
  };
}

export type FunctionalViteOptions = {
  packageRoot: string;
  bootEntry: string;
  port: number;
  title?: string;
  extraAlias?: Array<{ find: string; replacement: string }>;
};

/** Shared Vite config for Playwright functional harness pages. */
export function createFunctionalViteConfig(
  options: FunctionalViteOptions,
): UserConfig {
  const {
    packageRoot,
    bootEntry,
    port,
    title = "Kite9 functional",
    extraAlias = [],
  } = options;

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
    plugins: [functionalHarnessPlugin(bootEntry, title)],
    resolve: {
      alias: [
        {
          find: "@kite9/test-template/functional",
          replacement: path.resolve(testTemplateRoot, "functional"),
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
        ...extraAlias,
      ],
    },
  });
}
