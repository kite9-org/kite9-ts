/** Per-run metadata written next to functional-test artifacts. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export type TestResultStatus = "passed" | "failed";

export type TestResultMeta = {
  suite: string;
  name: string;
  status: TestResultStatus;
  at: string;
  error?: string;
  href: string;
};

export function resultMetaPath(dir: string): string {
  return path.join(dir, "result.json");
}

export function writeTestResult(
  dir: string,
  suite: string,
  name: string,
  status: TestResultStatus,
  error?: string,
): TestResultMeta {
  mkdirSync(dir, { recursive: true });
  const meta: TestResultMeta = {
    suite,
    name,
    status,
    at: new Date().toISOString(),
    href: `./${name}.html`,
    ...(error ? { error } : {}),
  };
  writeFileSync(resultMetaPath(dir), JSON.stringify(meta, null, 2), "utf8");
  return meta;
}
