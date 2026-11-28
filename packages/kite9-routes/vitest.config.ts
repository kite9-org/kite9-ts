import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packagesDir = path.resolve(rootDir, "..");

export default defineConfig({
  resolve: {
    alias: {
      "@kite9/css": path.resolve(packagesDir, "kite9-css/src/index.ts"),
      "@kite9/model": path.resolve(packagesDir, "kite9-model/src/index.ts"),
      "@kite9/templating": path.resolve(
        packagesDir,
        "kite9-templating/src/index.ts",
      ),
      "@kite9/grid": path.resolve(packagesDir, "kite9-grid/src/index.ts"),
    },
  },
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
