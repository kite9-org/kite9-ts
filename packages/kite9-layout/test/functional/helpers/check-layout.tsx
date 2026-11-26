/** One-liner functional layout check in Chromium via Playwright. */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutData } from "@kite9/model";
import { expect, test, type Page } from "@playwright/test";
import { Window } from "happy-dom";
import { render, type ComponentChild } from "preact";
import type { FunctionalLayoutRun } from "./functional-layout-run.js";
import {
  defaultLayoutChecks,
  type LayoutChecks,
} from "./layout-checks.js";
import { writeTestResult } from "./test-result.js";
import { outputsDir, writeLayoutArtifacts } from "./write-artifacts.js";

const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_DIR = path.resolve(HELPERS_DIR, "../expected");
/** When set, write `expected/<name>.json` from the run instead of asserting. */
const UPDATE_EXPECTED = process.env.UPDATE_EXPECTED === "1";

export type CheckLayoutOptions = {
  /** Override suite folder under `outputs/` (default: calling `*.spec.tsx` basename). */
  suite?: string;
  /** Override {@link LayoutChecks} defaults from AbstractDisplayFunctionalTest. */
  checks?: Partial<LayoutChecks>;
  /** Skip until layout engine supports this fixture (still keeps the spec for traceability). */
  skip?: string;
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

function writeInputOnly(suite: string, name: string, inputHtml: string): string {
  const dir = outputsDir(suite, name);
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, `${name}-input.html`), inputHtml, "utf8");
  return dir;
}

/**
 * Register a Playwright `test` that lays out `diagram` in Chromium, runs
 * {@link LayoutChecks}, writes artifacts under `outputs/`, and asserts against
 * `expected/<name>.json`.
 */
export function checkLayout(
  name: string,
  diagram: ComponentChild,
  options: CheckLayoutOptions = {},
): void {
  const suite = options.suite ?? suiteFromCaller();
  const checks = { ...defaultLayoutChecks(), ...options.checks };

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
      inputHtml = htmlFromJsx(diagram);
      const run = await runInBrowser(page, inputHtml, checks);
      const layoutData = run.layout;
      dir = writeLayoutArtifacts(suite, name, inputHtml, layoutData);

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

      // Constraint failures still get reviewable outputs; fail after writing.
      if (run.checkError) {
        throw new Error(run.checkError);
      }

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
      writeTestResult(dir, suite, name, "passed");
    } catch (e) {
      const failDir = dir ?? (inputHtml ? writeInputOnly(suite, name, inputHtml) : outputsDir(suite, name));
      writeTestResult(
        failDir,
        suite,
        name,
        "failed",
        e instanceof Error ? e.message : String(e),
      );
      throw e;
    }
  });
}
