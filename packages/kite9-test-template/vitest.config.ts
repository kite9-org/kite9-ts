import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(rootDir, "..");

export default defineConfig({
  resolve: {
    // Instrument workspace sources (not dist) so coverage includes them.
    alias: {
      "@kite9/css": path.resolve(packagesDir, "kite9-css/src/index.ts"),
      "@kite9/model": path.resolve(packagesDir, "kite9-model/src/index.ts"),
      "@kite9/templating": path.resolve(
        packagesDir,
        "kite9-templating/src/index.ts",
      ),
    },
  },
  test: {
    environment: "happy-dom",
    include: ["test/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "./coverage",
      // Sibling workspace packages live outside this package root.
      allowExternal: true,
      include: [
        path.join(rootDir, "src/**/*.{ts,tsx}"),
        path.join(packagesDir, "kite9-templating/src/**/*.{ts,tsx}"),
        path.join(packagesDir, "kite9-model/src/**/*.{ts,tsx}"),
        path.join(packagesDir, "kite9-css/src/**/*.{ts,tsx}"),
      ],
    },
  },
});
