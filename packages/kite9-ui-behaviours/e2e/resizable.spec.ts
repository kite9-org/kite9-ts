import { expect, test } from "@playwright/test";
import { openWithBehaviours } from "./open.js";
import { selectById } from "./select-by-id.js";

test.describe("resizable", () => {
  test("select glyph → resize handle visible", async ({ page }) => {
    await openWithBehaviours(page, "selectable", "resizable");
    const g1 = page.locator("kite9-glyph#g1");
    await selectById(page, "g1");
    await expect(g1).toHaveClass(/selected/);

    const visible = await g1.evaluate((el) => {
      const handle = (el as HTMLElement).shadowRoot?.querySelector(
        "[part='resize']",
      ) as HTMLElement | null;
      if (!handle) return false;
      return getComputedStyle(handle).display !== "none";
    });
    expect(visible).toBe(true);
  });

  test("drag handle → size and grid cell grow", async ({ page }) => {
    await openWithBehaviours(page, "selectable", "resizable");
    const g1 = page.locator("kite9-glyph#g1");
    const c1 = page.locator("kite9-container#c1");
    await selectById(page, "g1");

    const before = await page.evaluate(() => {
      const g = document.querySelector("kite9-glyph#g1") as HTMLElement;
      const c = document.querySelector("kite9-container#c1") as HTMLElement;
      const diagram = document.querySelector("kite9-diagram") as HTMLElement;
      const objects = diagram.shadowRoot!.querySelector(
        ".objects-layer",
      ) as HTMLElement;
      const linkPath = diagram.shadowRoot!.querySelector(
        '.links-layer g[data-link-id="l2"] path[data-connection-path]',
      ) as SVGPathElement | null;
      return {
        styleW: g.style.width,
        boxW: g.getBoundingClientRect().width,
        gLeft: g.getBoundingClientRect().left,
        cLeft: c.getBoundingClientRect().left,
        colTracks: objects.style.gridTemplateColumns,
        linkD: linkPath?.getAttribute("d") ?? "",
      };
    });

    await g1.evaluate((el) => {
      const handle = (el as HTMLElement).shadowRoot?.querySelector(
        "[part='resize']",
      ) as HTMLElement | null;
      if (!handle) throw new Error("no handle");
      const rect = handle.getBoundingClientRect();
      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 2,
          clientY: rect.top + 2,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 42,
          clientY: rect.top + 32,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 42,
          clientY: rect.top + 32,
          pointerId: 1,
        }),
      );
    });

    const after = await page.evaluate(() => {
      const g = document.querySelector("kite9-glyph#g1") as HTMLElement;
      const c = document.querySelector("kite9-container#c1") as HTMLElement;
      const diagram = document.querySelector("kite9-diagram") as HTMLElement;
      const objects = diagram.shadowRoot!.querySelector(
        ".objects-layer",
      ) as HTMLElement;
      const linkPath = diagram.shadowRoot!.querySelector(
        '.links-layer g[data-link-id="l2"] path[data-connection-path]',
      ) as SVGPathElement | null;
      return {
        styleW: g.style.width,
        boxW: g.getBoundingClientRect().width,
        gLeft: g.getBoundingClientRect().left,
        cLeft: c.getBoundingClientRect().left,
        colTracks: objects.style.gridTemplateColumns,
        linkD: linkPath?.getAttribute("d") ?? "",
      };
    });

    expect(after.styleW).not.toBe(before.styleW);
    // Must not stay clamped to the original CSS-grid cell (PoC grows tracks).
    expect(after.boxW).toBeGreaterThan(before.boxW + 10);
    // Resized host stays put; later columns shift by the grow delta only.
    expect(Math.abs(after.gLeft - before.gLeft)).toBeLessThan(2);
    const grow = after.boxW - before.boxW;
    expect(Math.abs(after.cLeft - before.cLeft - grow)).toBeLessThan(3);
    // Outer / inter gutters must not be rebuilt (no wholesale jump).
    expect(after.colTracks.startsWith("16px 16px")).toBe(true);
    expect(after.colTracks).toContain("64px");
    // Links must re-anchor to hosts (not stay on pre-resize coords).
    expect(after.linkD).not.toBe(before.linkD);
    expect(after.linkD.length).toBeGreaterThan(0);
  });

  test("shrink container → stops at nested content (no squash)", async ({
    page,
  }) => {
    await openWithBehaviours(page, "selectable", "resizable");
    const c1 = page.locator("kite9-container#c1");
    await selectById(page, "c1");

    const before = await page.evaluate(() => {
      const container = document.querySelector(
        "kite9-container#c1",
      ) as HTMLElement;
      const nested = document.querySelector("kite9-glyph#g2") as HTMLElement;
      return {
        containerW: container.getBoundingClientRect().width,
        nestedW: nested.getBoundingClientRect().width,
      };
    });
    expect(before.containerW).toBeGreaterThan(before.nestedW);

    // Drag hard inward — should clamp above nested width.
    await c1.evaluate((el) => {
      const handle = (el as HTMLElement).shadowRoot?.querySelector(
        "[part='resize']",
      ) as HTMLElement | null;
      if (!handle) throw new Error("no handle");
      const rect = handle.getBoundingClientRect();
      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 2,
          clientY: rect.top + 2,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          clientX: rect.left - 200,
          clientY: rect.top - 200,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          composed: true,
          clientX: rect.left - 200,
          clientY: rect.top - 200,
          pointerId: 1,
        }),
      );
    });

    const after = await page.evaluate(() => {
      const container = document.querySelector(
        "kite9-container#c1",
      ) as HTMLElement;
      const nested = document.querySelector("kite9-glyph#g2") as HTMLElement;
      const cb = container.getBoundingClientRect();
      const nb = nested.getBoundingClientRect();
      return {
        containerW: cb.width,
        containerH: cb.height,
        nestedW: nb.width,
        nestedH: nb.height,
        // nested still fully inside container (1px tolerance for subpixels)
        fitsX: nb.right <= cb.right + 1,
        fitsY: nb.bottom <= cb.bottom + 1,
      };
    });

    expect(after.containerW).toBeLessThan(before.containerW);
    expect(after.containerW).toBeGreaterThanOrEqual(after.nestedW);
    expect(after.fitsX).toBe(true);
    expect(after.fitsY).toBe(true);
  });

  test("drag nested glyph → parent container grows past prior size", async ({
    page,
  }) => {
    await openWithBehaviours(page, "selectable", "resizable");
    const g2 = page.locator("kite9-glyph#g2");
    await selectById(page, "g2");

    const before = await page.evaluate(() => {
      const nested = document.querySelector("kite9-glyph#g2") as HTMLElement;
      const container = document.querySelector(
        "kite9-container#c1",
      ) as HTMLElement;
      return {
        nestedW: nested.getBoundingClientRect().width,
        containerW: container.getBoundingClientRect().width,
        containerStyleW: container.style.width,
      };
    });

    await g2.evaluate((el) => {
      const handle = (el as HTMLElement).shadowRoot?.querySelector(
        "[part='resize']",
      ) as HTMLElement | null;
      if (!handle) throw new Error("no handle");
      const rect = handle.getBoundingClientRect();
      handle.dispatchEvent(
        new PointerEvent("pointerdown", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 2,
          clientY: rect.top + 2,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointermove", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 80,
          clientY: rect.top + 40,
          pointerId: 1,
        }),
      );
      handle.dispatchEvent(
        new PointerEvent("pointerup", {
          bubbles: true,
          composed: true,
          clientX: rect.left + 80,
          clientY: rect.top + 40,
          pointerId: 1,
        }),
      );
    });

    const after = await page.evaluate(() => {
      const nested = document.querySelector("kite9-glyph#g2") as HTMLElement;
      const container = document.querySelector(
        "kite9-container#c1",
      ) as HTMLElement;
      return {
        nestedW: nested.getBoundingClientRect().width,
        containerW: container.getBoundingClientRect().width,
        containerStyleW: container.style.width,
        nestedMaxW: (nested as HTMLElement).style.maxWidth,
      };
    });

    expect(after.nestedW).toBeGreaterThan(before.nestedW + 40);
    expect(after.containerW).toBeGreaterThan(before.containerW + 20);
    expect(after.containerW).toBeGreaterThanOrEqual(after.nestedW);
    expect(after.nestedMaxW === "" || after.nestedMaxW === "none").toBe(true);
  });
});

test.describe("styleable margins", () => {
  test("Styles → Margins → overlay → OK sets margin var and grows track", async ({
    page,
  }) => {
    await openWithBehaviours(
      page,
      "selectable",
      "actionable",
      "styleable",
      "resizable",
    );
    await selectById(page, "g1");

    const beforeCol = await page.evaluate(() => {
      const root = document.querySelector("kite9-diagram") as HTMLElement;
      const objects = root.shadowRoot!.querySelector(
        ".objects-layer",
      ) as HTMLElement;
      return objects.style.gridTemplateColumns;
    });

    // Open context menu (actionable listens for click)
    await page.locator("kite9-glyph#g1").evaluate((el) => {
      el.dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true }),
      );
    });

    await expect(page.locator("#kite9-contextMenu")).toBeVisible();
    await page.locator('[data-kite9-cm="Styles"]').click();
    await page.locator('[data-kite9-cm="Margins"]').click();

    await page.waitForFunction(() => {
      const root = document.querySelector("kite9-diagram") as HTMLElement;
      return !!root.shadowRoot?.querySelector("svg._overlay ellipse");
    });

    // Real pointer drag (fires click after mouseup) — OK/Cancel must remain.
    const handleBox = await page.evaluate(() => {
      const root = document.querySelector("kite9-diagram") as HTMLElement;
      const handle = root.shadowRoot?.querySelectorAll(
        "svg._overlay ellipse",
      )[1] as SVGElement | undefined;
      if (!handle) throw new Error("no right-margin handle");
      const r = handle.getBoundingClientRect();
      return {
        x: r.left + r.width / 2,
        y: r.top + r.height / 2,
      };
    });
    await page.mouse.move(handleBox.x, handleBox.y);
    await page.mouse.down();
    await page.mouse.move(handleBox.x + 48, handleBox.y, { steps: 4 });
    await page.mouse.up();

    await expect(page.locator("#kite9-contextMenu")).toBeVisible();
    await expect(page.locator("[data-kite9-ok]")).toBeVisible();
    await page.locator("[data-kite9-ok]").click();

    const after = await page.evaluate(() => {
      const g1 = document.querySelector("kite9-glyph#g1") as HTMLElement;
      const root = document.querySelector("kite9-diagram") as HTMLElement;
      const objects = root.shadowRoot!.querySelector(
        ".objects-layer",
      ) as HTMLElement;
      return {
        marginRight: g1.style.marginRight,
        marginLeft: g1.style.marginLeft || "0px",
        justifySelf: g1.style.justifySelf,
        alignSelf: g1.style.alignSelf,
        colTracks: objects.style.gridTemplateColumns,
        contentW: g1.style.width,
      };
    });

    expect(parseFloat(after.marginRight)).toBeGreaterThan(20);
    expect(parseFloat(after.marginLeft)).toBe(0);
    expect(after.justifySelf).toBe("start");
    expect(after.alignSelf).toBe("start");
    expect(after.colTracks).not.toBe(beforeCol);
    // Content box unchanged; occupancy (tracks) grew.
    expect(after.contentW).toBe("120px");
    expect(after.colTracks.startsWith("16px 16px")).toBe(true);
    // 120 content + ~48 right margin
    expect(after.colTracks).toMatch(/16px 16px 1[6-9]\dpx/);
  });
});
