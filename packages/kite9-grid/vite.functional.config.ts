import path from "node:path";
import { fileURLToPath } from "node:url";
import { createFunctionalViteConfig } from "@kite9/test-template/functional/create-functional-vite-config.ts";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default createFunctionalViteConfig({
  packageRoot: rootDir,
  bootEntry: path.resolve(rootDir, "test/functional/boot.ts"),
  port: 5177,
  title: "@kite9/grid functional",
  extraAlias: [
    {
      find: "@kite9/grid",
      replacement: path.resolve(rootDir, "src/index.ts"),
    },
  ],
});
