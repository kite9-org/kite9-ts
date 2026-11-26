import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(rootDir, "..");

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  resolve: {
    alias: {
      "@kite9/css": path.resolve(packagesDir, "kite9-css/src/index.ts"),
      "@kite9/model": path.resolve(packagesDir, "kite9-model/src/index.ts"),
      "@kite9/templating": path.resolve(
        packagesDir,
        "kite9-templating/src/index.ts",
      ),
      "@kite9/test-template": path.resolve(
        packagesDir,
        "kite9-test-template/src/index.ts",
      ),
      "@kite9/layout": path.resolve(rootDir, "src/index.ts"),
      "@kite9/ui": path.resolve(packagesDir, "kite9-ui/src/index.ts"),
      "@kite9/command": path.resolve(packagesDir, "kite9-command/src/index.ts"),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.{ts,tsx}"],
    testTimeout: 60_000,
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.ts"],
    },
  },
});
