import path from "node:path";
import { fileURLToPath } from "node:url";
import { createBehaviourE2eViteConfig } from "@kite9/test-template/e2e/vite";

const packageRoot = path.dirname(fileURLToPath(import.meta.url));

export default createBehaviourE2eViteConfig({
  packageRoot,
  bootEntry: path.resolve(packageRoot, "e2e/boot.ts"),
  port: 5180,
});
