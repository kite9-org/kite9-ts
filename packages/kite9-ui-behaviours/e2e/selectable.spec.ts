import { expect, test } from "@playwright/test";
import { openWithBehaviours } from "./open.js";
import { selectById } from "./select-by-id.js";

test.describe("selectable", () => {
  test("click glyph → .selected", async ({ page }) => {
    await openWithBehaviours(page, "selectable");
    const glyph = page.locator("kite9-glyph#g1");
    await selectById(page, "g1");
    await expect(glyph).toHaveClass(/selected/);
  });

  test("click second glyph → first unselected", async ({ page }) => {
    await openWithBehaviours(page, "selectable");
    const g1 = page.locator("kite9-glyph#g1");
    const g2 = page.locator("kite9-glyph#g2");
    await selectById(page, "g1");
    await expect(g1).toHaveClass(/selected/);
    await selectById(page, "g2");
    await expect(g2).toHaveClass(/selected/);
    await expect(g1).not.toHaveClass(/selected/);
  });

  test("click stage → selection cleared", async ({ page }) => {
    await openWithBehaviours(page, "selectable");
    const g1 = page.locator("kite9-glyph#g1");
    await selectById(page, "g1");
    await expect(g1).toHaveClass(/selected/);

    await page.locator("kite9-diagram").evaluate((root) => {
      const stage = (root as HTMLElement).shadowRoot?.querySelector(".stage");
      stage?.dispatchEvent(
        new MouseEvent("mousedown", {
          bubbles: true,
          composed: true,
          clientX: 2,
          clientY: 2,
        }),
      );
    });
    await expect(g1).not.toHaveClass(/selected/);
  });

  test("click SVG connection path → light-DOM kite9-link .selected", async ({
    page,
  }) => {
    await openWithBehaviours(page, "selectable");
    const link = page.locator("kite9-link#l1");

    const clicked = await page.locator("kite9-diagram").evaluate((root) => {
      const path = (root as HTMLElement).shadowRoot?.querySelector(
        'path[data-connection-path="l1"]',
      );
      if (!path) return false;
      path.dispatchEvent(
        new MouseEvent("mousedown", { bubbles: true, composed: true }),
      );
      return true;
    });
    expect(clicked).toBe(true);
    await expect(link).toHaveClass(/selected/);
  });
});
