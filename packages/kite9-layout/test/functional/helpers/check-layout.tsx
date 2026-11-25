/** One-liner functional layout check in Chromium via Playwright. */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LayoutData } from "@kite9/model";
import { expect, test, type Page } from "@playwright/test";
import { Window } from "happy-dom";
import { render, type ComponentChild } from "preact";
import { writeTestResult } from "./test-result.js";
import { outputsDir, writeLayoutArtifacts } from "./write-artifacts.js";

const HELPERS_DIR = path.dirname(fileURLToPath(import.meta.url));
const EXPECTED_DIR = path.resolve(HELPERS_DIR, "../expected");

export type CheckLayoutOptions = {
  /** Override suite folder under `outputs/` (default: calling `*.spec.tsx` basename). */
  suite?: string;
};

declare global {
  interface Window {
    __kite9Ready?: boolean;
    __runFunctionalLayout?: (html: string) => LayoutData;
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

async function runInBrowser(page: Page, inputHtml: string): Promise<LayoutData> {
  await page.goto("/functional");
  await page.waitForFunction(() => window.__kite9Ready === true);
  return page.evaluate((html) => {
    const run = window.__runFunctionalLayout;
    if (!run) throw new Error("__runFunctionalLayout missing — boot failed");
    return run(html);
  }, inputHtml);
}

/**
 * Register a Playwright `test` that lays out `diagram` in Chromium, writes
 * artifacts under `outputs/`, and asserts against `expected/<name>.json`.
 */
export function checkLayout(
  name: string,
  diagram: ComponentChild,
  options: CheckLayoutOptions = {},
): void {
  const suite = options.suite ?? suiteFromCaller();

  test(name, async ({ page }) => {
    let dir: string | undefined;
    try {
      const inputHtml = htmlFromJsx(diagram);
      const layoutData = await runInBrowser(page, inputHtml);
      dir = writeLayoutArtifacts(suite, name, inputHtml, layoutData);

      await page.locator("#mount").screenshot({
        path: path.join(dir, `${name}.png`),
      });

      expect(layoutData).toEqual(loadExpected(`${name}.json`));
      writeTestResult(dir, suite, name, "passed");
    } catch (e) {
      const failDir = dir ?? outputsDir(suite, name);
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
