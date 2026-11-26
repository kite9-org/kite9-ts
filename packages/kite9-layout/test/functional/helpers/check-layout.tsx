/** One-liner functional layout check in Chromium via Playwright. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutData } from "@kite9/model";
import { expect, test, type Page } from "@playwright/test";
import { Window } from "happy-dom";
import { render, type ComponentChild } from "preact";
import type { FunctionalKind } from "./functional-kind.js";
import { isFunctionalKind } from "./functional-kind.js";
import type { FunctionalLayoutRun } from "./functional-layout-run.js";
import {
  defaultLayoutChecks,
  type LayoutChecks,
} from "./layout-checks.js";
import type { PerformanceMetrics } from "./test-result.js";
import { writeTestResult } from "./test-result.js";
import { outputsDir, writeLayoutArtifacts } from "./write-artifacts.js";

const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_DIR = path.resolve(HELPERS_DIR, "../expected");
/** When set, write `expected/<name>.json` from the run instead of asserting. */
const UPDATE_EXPECTED = process.env.UPDATE_EXPECTED === "1";

export type CheckLayoutOptions = {
  /** Override suite folder under `outputs/{kind}/` (default: calling `*.spec.tsx` basename). */
  suite?: string;
  /** Functional suite kind (default: inferred from path `display|layout|thorough|performance`). */
  kind?: FunctionalKind;
  /** Override {@link LayoutChecks} defaults. */
  checks?: Partial<LayoutChecks>;
  /**
   * Compare against `expected/<name>.json` (display baselines).
   * Default: true for `display`, false for layout / thorough / performance.
   */
  compareExpected?: boolean;
  /** Skip until layout engine supports this fixture (still keeps the spec for traceability). */
  skip?: string;
  /** Optional performance metrics recorded into result.json. */
  metrics?: PerformanceMetrics;
};

declare global {
  interface Window {
    __kite9Ready?: boolean;
    __runFunctionalLayout?: (
      html: string,
      checks?: Partial<LayoutChecks>,
    ) => FunctionalLayoutRun;
  }
}

function suiteFromCaller(): string {
  const stack = new Error().stack ?? "";
  for (const line of stack.split("\n")) {
    const m = line.match(/([^/\\]+)\.spec\.tsx?/);
    if (m?.[1]) return m[1].toLowerCase();
  }
  throw new Error(
    "checkLayout: could not infer suite from caller; pass { suite }",
  );
}

function kindFromCaller(): FunctionalKind {
  const stack = new Error().stack ?? "";
  for (const line of stack.split("\n")) {
    const m = line.match(
      /[\\/](display|layout|thorough|performance)[\\/][^/\\]+\.spec\.tsx?/,
    );
    if (m?.[1] && isFunctionalKind(m[1])) return m[1];
  }
  return "display";
}

function htmlFromJsx(diagram: ComponentChild): string {
  // Playwright Node has no DOM; Preact needs global document.
  const win = new Window();
  const g = globalThis as typeof globalThis & {
    window: Window;
    document: Document;
  };
  const prevWindow = g.window;
  const prevDocument = g.document;
  g.window = win as unknown as Window;
  g.document = win.document as unknown as Document;
  try {
    const wrap = win.document.createElement("div");
    render(diagram, wrap as unknown as Element);
    const el = wrap.firstElementChild;
    if (!el) throw new Error("checkLayout: JSX did not produce a root element");
    return el.outerHTML;
  } finally {
    g.window = prevWindow;
    g.document = prevDocument;
  }
}

function loadExpected(file: string): LayoutData {
  const full = path.isAbsolute(file) ? file : path.join(EXPECTED_DIR, file);
  if (!existsSync(full)) {
    throw new Error(`checkLayout: expected layout missing: ${full}`);
  }
  return JSON.parse(readFileSync(full, "utf8")) as LayoutData;
}

async function runInBrowser(
  page: Page,
  inputHtml: string,
  checks: Partial<LayoutChecks>,
): Promise<FunctionalLayoutRun> {
  await page.goto("/functional");
  await page.waitForFunction(() => window.__kite9Ready === true);
  return page.evaluate(
    ({ html, checks: c }) => {
      const run = window.__runFunctionalLayout;
      if (!run) throw new Error("__runFunctionalLayout missing — boot failed");
      return run(html, c);
    },
    { html: inputHtml, checks },
  );
}

function writeInputOnly(
  kind: FunctionalKind,
  suite: string,
  name: string,
  inputHtml: string,
): string {
  const dir = outputsDir(kind, suite, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}-input.html`), inputHtml, "utf8");
  return dir;
}

function registerLayoutTest(
  name: string,
  getHtml: () => string,
  options: CheckLayoutOptions = {},
): void {
  const suite = options.suite ?? suiteFromCaller();
  const kind = options.kind ?? kindFromCaller();
  const compareExpected = options.compareExpected ?? kind === "display";
  const checks = { ...defaultLayoutChecks(kind), ...options.checks };

  if (options.skip) {
    test.skip(name, () => {
      // kept for old→new traceability
    });
    return;
  }

  test(name, async ({ page }) => {
    let dir: string | undefined;
    let inputHtml = "";
    try {
      inputHtml = getHtml();
      const started = Date.now();
      const run = await runInBrowser(page, inputHtml, checks);
      const layoutData = run.layout;
      dir = writeLayoutArtifacts(kind, suite, name, inputHtml, layoutData);

      writeFileSync(
        path.join(dir, `${name}-positions.png`),
        Buffer.from(run.positionsPngBase64, "base64"),
      );
      writeFileSync(
        path.join(dir, `${name}-compaction.png`),
        Buffer.from(run.compactionPngBase64, "base64"),
      );

      await page.locator("#mount").screenshot({
        path: path.join(dir, `${name}.png`),
      });

      const metrics: PerformanceMetrics | undefined =
        kind === "performance"
          ? {
              totalMs: Date.now() - started,
              ...options.metrics,
            }
          : options.metrics;

      // Constraint failures still get reviewable outputs; fail after writing.
      if (run.checkError) {
        throw new Error(run.checkError);
      }

      if (compareExpected) {
        if (UPDATE_EXPECTED) {
          mkdirSync(EXPECTED_DIR, { recursive: true });
          writeFileSync(
            path.join(EXPECTED_DIR, `${name}.json`),
            `${JSON.stringify(layoutData, null, 2)}\n`,
            "utf8",
          );
        } else {
          const expectedFile = path.join(EXPECTED_DIR, `${name}.json`);
          if (!existsSync(expectedFile)) {
            throw new Error(
              `No expected layout for ${name} — Accept from the results page (pnpm test:results) or set UPDATE_EXPECTED=1`,
            );
          }
          expect(layoutData).toEqual(loadExpected(`${name}.json`));
        }
      }
      writeTestResult(dir, kind, suite, name, "passed", undefined, metrics);
    } catch (e) {
      const failDir =
        dir ??
        (inputHtml
          ? writeInputOnly(kind, suite, name, inputHtml)
          : outputsDir(kind, suite, name));
      writeTestResult(
        failDir,
        kind,
        suite,
        name,
        "failed",
        e instanceof Error ? e.message : String(e),
        options.metrics,
      );
      throw e;
    }
  });
}

/**
 * Register a Playwright `test` that lays out JSX `diagram` in Chromium.
 */
export function checkLayout(
  name: string,
  diagram: ComponentChild,
  options: CheckLayoutOptions = {},
): void {
  registerLayoutTest(name, () => htmlFromJsx(diagram), options);
}

/**
 * Same as {@link checkLayout} but with a pre-built light-DOM HTML fragment
 * (e.g. thorough fixtures under `thorough/fixtures/*.html`).
 */
export function checkLayoutHtml(
  name: string,
  inputHtml: string,
  options: CheckLayoutOptions = {},
): void {
  registerLayoutTest(name, () => inputHtml, options);
}
