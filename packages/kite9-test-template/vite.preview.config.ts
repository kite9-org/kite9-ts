import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Dev server for fixture HTML scenes (`pnpm preview` / `pnpm dev`). */
export default defineConfig({
  root: rootDir,
  publicDir: false,
  // Multi-page: do not SPA-fallback unknown paths to index.html.
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
  },
  plugins: [
    {
      name: "redirect-root-to-preview-index",
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === "/" || req.url === "/index.html") {
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
        card: path.resolve(rootDir, "fixtures/html/card.html"),
      },
    },
  },
  resolve: {
    alias: {
      "@kite9/test-template": path.resolve(rootDir, "src/index.ts"),
    },
  },
});
