/** Per-run metadata written next to functional-test artifacts. */

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { FunctionalKind } from "./functional-kind.ts";

export type TestResultStatus = "passed" | "failed";

export type PerformanceMetrics = {
  totalMs: number;
  connecteds?: number;
  connections?: number;
  stages?: Record<string, number>;
};

export type TestResultMeta = {
  kind: FunctionalKind;
  suite: string;
  name: string;
  status: TestResultStatus;
  at: string;
  error?: string;
  href: string;
  metrics?: PerformanceMetrics;
};

export function writeTestResult(
  dir: string,
  kind: FunctionalKind,
  suite: string,
  name: string,
  status: TestResultStatus,
  error?: string,
  metrics?: PerformanceMetrics,
): TestResultMeta {
  mkdirSync(dir, { recursive: true });
  const meta: TestResultMeta = {
    kind,
    suite,
    name,
    status,
    at: new Date().toISOString(),
    href: `./${name}.html`,
    ...(error ? { error } : {}),
    ...(metrics ? { metrics } : {}),
  };
  writeFileSync(
    path.join(dir, "result.json"),
    `${JSON.stringify(meta, null, 2)}\n`,
    "utf8",
  );
  return meta;
}
