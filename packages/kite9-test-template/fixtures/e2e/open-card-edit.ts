import type { Page } from "@playwright/test";

declare global {
  interface Window {
    __kite9Ready?: boolean;
  }
}

export type OpenCardEditOptions = {
  /**
   * Query for the harness boot (e.g. `{ behaviours: "selectable" }`).
   * Passed through to `/e2e?...`.
   */
  query?: Record<string, string>;
};

/**
 * Open the shared virtual `/e2e` harness (card diagram + behaviour boot).
 * Requires the behaviour package Vite server from `createBehaviourE2eViteConfig`.
 */
export async function openCardEdit(
  page: Page,
  options: OpenCardEditOptions = {},
): Promise<void> {
  const params = new URLSearchParams(options.query ?? {});
  const search = params.toString();
  await page.goto(search ? `/e2e?${search}` : "/e2e");
  await page.waitForFunction(() => window.__kite9Ready === true);
}
