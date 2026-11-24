import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/** Library build: preserve modules and inline `*.css?inline` into JS (shadow chrome). */
export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: true,
    // Inline Metropolis WOFF2 into chrome CSS so shadow roots stay self-contained.
    assetsInlineLimit: 32_768,
    lib: {
      entry: path.resolve(rootDir, "src/index.ts"),
      formats: ["es"],
    },
    rollupOptions: {
      external: [
        "preact",
        "preact/jsx-runtime",
        "preact/hooks",
        "@kite9/css",
        "@kite9/model",
        "@kite9/templating",
        "@kite9/command",
        "@kite9/ui",
      ],
      output: {
        preserveModules: true,
        preserveModulesRoot: "src",
        entryFileNames: "[name].js",
      },
    },
  },
});
