import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(rootDir, "..");
const bootEntry = path.resolve(rootDir, "test/functional/boot.ts");

const BOOT_VIRTUAL = "/__kite9_functional_boot.ts";

function functionalHarnessPlugin(): Plugin {
  return {
    name: "kite9-layout-functional-harness",
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
    <title>@kite9/layout functional</title>
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

/** Vite server for Playwright functional layout (real Chromium measure). */
export default defineConfig({
  root: rootDir,
  publicDir: false,
  appType: "mpa",
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  server: {
    host: "127.0.0.1",
    port: 5176,
    strictPort: true,
  },
  plugins: [functionalHarnessPlugin()],
  resolve: {
    alias: [
      {
        find: "@kite9/layout",
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
      {
        find: "@kite9/test-template",
        replacement: path.resolve(packages, "kite9-test-template/src/index.ts"),
      },
      {
        find: "@kite9/templating",
        replacement: path.resolve(packages, "kite9-templating/src/index.ts"),
      },
      {
        find: "@kite9/model",
        replacement: path.resolve(packages, "kite9-model/src/index.ts"),
      },
      {
        find: "@kite9/css",
        replacement: path.resolve(packages, "kite9-css/src/index.ts"),
      },
      {
        find: "@kite9/ui",
        replacement: path.resolve(packages, "kite9-ui/src/index.ts"),
      },
      {
        find: "@kite9/command",
        replacement: path.resolve(packages, "kite9-command/src/index.ts"),
      },
    ],
  },
});
