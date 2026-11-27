import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import {
  kite9ResultsPlugin,
  previewPackagesRoot,
  previewRoot,
} from "./results/vite-plugin.js";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packages = previewPackagesRoot;

export default defineConfig({
  root: previewRoot,
  publicDir: false,
  appType: "mpa",
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  server: {
    host: "127.0.0.1",
    port: 5174,
    strictPort: true,
    open: "/preview/index.html",
    fs: { allow: [packages] },
  },
  plugins: [
    kite9ResultsPlugin(),
    {
      name: "redirect-root-to-preview-index",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          const raw = req.url ?? "/";
          const q = raw.indexOf("?");
          const pathname = q >= 0 ? raw.slice(0, q) : raw;
          const search = q >= 0 ? raw.slice(q) : "";
          // Legacy artifact "← all results" links used /?kind=… when results lived at /
          if (
            (pathname === "/" || pathname === "/index.html") &&
            search.includes("kind=")
          ) {
            res.statusCode = 302;
            res.setHeader("Location", `/results/${search}`);
            res.end();
            return;
          }
          if (pathname === "/" || pathname === "/index.html") {
            res.statusCode = 302;
            res.setHeader("Location", "/preview/index.html");
            res.end();
            return;
          }
          next();
        });
      },
    },
  ],
  build: {
    outDir: "dist-preview",
    emptyOutDir: true,
    rollupOptions: {
      input: {
        index: path.resolve(rootDir, "preview/index.html"),
        empty: path.resolve(rootDir, "fixtures/html/empty.html"),
        simple: path.resolve(rootDir, "fixtures/html/simple.html"),
        card: path.resolve(rootDir, "fixtures/html/card.html"),
      },
    },
  },
  resolve: {
    alias: [
      {
        find: "@kite9/test-template/fixtures/grid/card.json",
        replacement: path.resolve(
          packages,
          "kite9-test-template/fixtures/grid/card.json",
        ),
      },
      {
        find: "@kite9/test-template/fixtures/grid/simple.json",
        replacement: path.resolve(
          packages,
          "kite9-test-template/fixtures/grid/simple.json",
        ),
      },
      {
        find: "@kite9/test-template/fixtures/grid/empty.json",
        replacement: path.resolve(
          packages,
          "kite9-test-template/fixtures/grid/empty.json",
        ),
      },
      {
        find: "@kite9/preview",
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
      {
        find: "@kite9/test-template",
        replacement: path.resolve(
          packages,
          "kite9-test-template/src/index.ts",
        ),
      },
      {
        find: "@kite9/ui",
        replacement: path.resolve(packages, "kite9-ui/src/index.ts"),
      },
      {
        find: "@kite9/command",
        replacement: path.resolve(packages, "kite9-command/src/index.ts"),
      },
      {
        find: "@kite9/ui-behaviours/selectable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/selectable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/actionable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/actionable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/styleable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/styleable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/resizable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/resizable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/index.ts",
        ),
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
        find: "@kite9/layout",
        replacement: path.resolve(packages, "kite9-layout/src/index.ts"),
      },
    ],
  },
});
