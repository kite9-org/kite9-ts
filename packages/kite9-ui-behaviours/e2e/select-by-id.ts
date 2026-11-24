import type { Page } from "@playwright/test";

/** Dispatch `mousedown` on a light-DOM host by id (works with open shadow). */
export async function selectById(page: Page, id: string): Promise<void> {
  await page.evaluate((hostId) => {
    const el = document.getElementById(hostId);
    if (!el) throw new Error(`missing #${hostId}`);
    el.dispatchEvent(
      new MouseEvent("mousedown", { bubbles: true, composed: true }),
    );
  }, id);
}
