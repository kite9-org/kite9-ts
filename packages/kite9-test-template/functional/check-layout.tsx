/** One-liner functional layout check in Chromium via Playwright. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { LayoutData } from "@kite9/model";
import { expect, test, type Page } from "@playwright/test";
import { Window } from "happy-dom";
import { render, type ComponentChild } from "preact";
import type { FunctionalKind } from "./functional-kind.ts";
import { isFunctionalKind } from "./functional-kind.ts";
import type { FunctionalLayoutRun } from "./functional-layout-run.ts";
import {
  defaultLayoutChecks,
  type LayoutChecks,
} from "./layout-checks.ts";
import type { PerformanceMetrics } from "./test-result.ts";
import { writeTestResult } from "./test-result.ts";
import {
  expectedDir,
  outputsDir,
  writeLayoutArtifacts,
  type ArtifactPaths,
} from "./write-artifacts.ts";

export type CheckLayoutOptions = {
  /** Required: package that owns outputs/ and expected/. */
  packageRoot: string;
  /** Override suite folder (default: calling `*.spec.tsx` basename). */
  suite?: string;
  /** Functional suite kind (default: `grid` when not inferred). */
  kind?: FunctionalKind;
  /** Override {@link LayoutChecks} defaults. */
  checks?: Partial<LayoutChecks>;
  /**
   * Compare against `expected/<name>.json`.
   * Default: true for `display` and `grid`.
   */
  compareExpected?: boolean;
  /** Skip until supported. */
  skip?: string;
  metrics?: PerformanceMetrics;
  /** Nest `kind` under outputs/ (default: false for grid, true otherwise). */
  nestKindInOutputs?: boolean;
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
    if (m?.[1]) return m[1];
  }
  throw new Error(
    "checkLayout: could not infer suite from caller; pass { suite }",
  );
}

function kindFromCaller(): FunctionalKind {
  const stack = new Error().stack ?? "";
  for (const line of stack.split("\n")) {
    const m = line.match(
      /[\\/](display|layout|thorough|performance|grid)[\\/][^/\\]+\.spec\.tsx?/,
    );
    if (m?.[1] && isFunctionalKind(m[1])) return m[1];
  }
  return "grid";
}

function htmlFromJsx(diagram: ComponentChild): string {
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

function loadExpected(dir: string, file: string): LayoutData {
  const full = path.isAbsolute(file) ? file : path.join(dir, file);
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
  paths: ArtifactPaths,
  kind: FunctionalKind,
  suite: string,
  name: string,
  inputHtml: string,
): string {
  const dir = outputsDir(paths, kind, suite, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}-input.html`), inputHtml, "utf8");
  return dir;
}

function registerLayoutTest(
  name: string,
  getHtml: () => string,
  options: CheckLayoutOptions,
): void {
  const suite = options.suite ?? suiteFromCaller();
  const kind = options.kind ?? kindFromCaller();
  const compareExpected =
    options.compareExpected ??
    (kind === "display" || kind === "grid" || kind === "routes");
  const checks = { ...defaultLayoutChecks(kind), ...options.checks };
  const paths: ArtifactPaths = {
    packageRoot: options.packageRoot,
    nestKindInOutputs:
      options.nestKindInOutputs ?? (kind !== "grid" && kind !== "routes"),
  };
  const expectedRoot = expectedDir(paths);

  if (options.skip) {
    test.skip(name, () => {
      // kept for traceability
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
      dir = writeLayoutArtifacts(
        paths,
        kind,
        suite,
        name,
        inputHtml,
        layoutData,
      );

      if (run.positionsPngBase64) {
        writeFileSync(
          path.join(dir, `${name}-positions.png`),
          Buffer.from(run.positionsPngBase64, "base64"),
        );
      }
      if (run.compactionPngBase64) {
        writeFileSync(
          path.join(dir, `${name}-compaction.png`),
          Buffer.from(run.compactionPngBase64, "base64"),
        );
      }

      await page.locator("#mount").screenshot({
        path: path.join(dir, `${name}.png`),
      });

      const metrics: PerformanceMetrics | undefined =
        kind === "performance"
          ? { totalMs: Date.now() - started, ...options.metrics }
          : options.metrics;

      if (run.checkError) {
        throw new Error(run.checkError);
      }

      if (compareExpected) {
        const expectedFile = path.join(expectedRoot, `${name}.json`);
        if (!existsSync(expectedFile)) {
          throw new Error(
            `No expected layout for ${name} — Accept from the results page (pnpm test:results) or add test/functional/expected/${name}.json`,
          );
        }
        expect(layoutData).toEqual(loadExpected(expectedRoot, `${name}.json`));
      }
      writeTestResult(dir, kind, suite, name, "passed", undefined, metrics);
    } catch (e) {
      const failDir =
        dir ??
        (inputHtml
          ? writeInputOnly(paths, kind, suite, name, inputHtml)
          : outputsDir(paths, kind, suite, name));
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
  options: CheckLayoutOptions,
): void {
  registerLayoutTest(name, () => htmlFromJsx(diagram), options);
}

/**
 * Same as {@link checkLayout} but with a pre-built light-DOM HTML fragment.
 */
export function checkLayoutHtml(
  name: string,
  inputHtml: string,
  options: CheckLayoutOptions,
): void {
  registerLayoutTest(name, () => inputHtml, options);
}
