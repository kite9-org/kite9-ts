import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  checkLayout as checkLayoutBase,
  type CheckLayoutOptions,
} from "@kite9/test-template/functional/check-layout.tsx";
import type { ComponentChild } from "preact";

const PACKAGE_ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export function checkLayout(
  name: string,
  diagram: ComponentChild,
  options: Omit<CheckLayoutOptions, "packageRoot" | "kind"> = {},
): void {
  checkLayoutBase(name, diagram, {
    ...options,
    packageRoot: PACKAGE_ROOT,
    kind: "grid",
  });
}
