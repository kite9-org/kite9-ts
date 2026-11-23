import { createDiagram } from "@kite9/templating";
import { afterEach, describe, expect, it } from "vitest";
import { applyLayout } from "../src/apply-layout.js";
import { testTemplatePack } from "../src/pack.js";
import { loadGridFixture, mountScene } from "./helpers.js";

afterEach(() => {
  document.body.innerHTML = "";
});

/** 2) HTML + grid fixture → painted shadow chrome and laid-out scene. */
describe("HTML + grid → shadow layout", () => {
  it("empty.html paints diagram chrome and applies empty grid", () => {
    const root = mountScene("empty.html");
    createDiagram(root, testTemplatePack);
    const grid = loadGridFixture("empty.json");
    applyLayout(root, grid);

    const shadow = root.shadowRoot!;
    expect(shadow.querySelector(".stage")).toBeTruthy();
    const objects = shadow.querySelector(".objects-layer") as HTMLElement;
    expect(objects.style.display).toBe("grid");
    expect(objects.style.gridTemplateColumns).toContain("px");
    expect(shadow.querySelector(".links-layer")?.querySelectorAll("g").length).toBe(0);
  });

  it("card.html paints chrome, places cells, and draws routes", () => {
    const root = mountScene("card.html");
    createDiagram(root, testTemplatePack);
    const grid = loadGridFixture("card.json");
    applyLayout(root, grid);

    // Template chrome in host shadows
    expect(root.shadowRoot?.querySelector(".stage")).toBeTruthy();
    expect(document.querySelector("#g1")?.shadowRoot?.querySelector(".card")).toBeTruthy();
    expect(
      document.querySelector("#c1")?.shadowRoot?.querySelector(".container-card"),
    ).toBeTruthy();
    expect(document.querySelector("#a1")?.shadowRoot?.querySelector(".card")).toBeTruthy();
    expect(document.querySelector("#fl1")?.shadowRoot?.querySelector(".label")).toBeTruthy();
    expect(document.querySelector("#tl1")?.shadowRoot?.querySelector(".label")).toBeTruthy();

    // Grid placements from fixture
    const g1 = document.querySelector("#g1") as HTMLElement;
    expect(g1.style.gridColumn).toBeTruthy();
    expect(g1.style.width).toBe("120px");
    expect(g1.style.height).toBe("80px");

    const c1 = document.querySelector("#c1") as HTMLElement;
    expect(c1.style.gridColumn).toBeTruthy();
    expect(c1.style.width).toBe("140px");

    const objects = root.shadowRoot!.querySelector(".objects-layer") as HTMLElement;
    expect(objects.style.display).toBe("grid");
    expect(objects.style.gridTemplateColumns.split(" ").length).toBe(
      grid.grid.colSizes.length,
    );

    // Routes on the links SVG overlay; light-DOM links hidden
    const linksSvg = root.shadowRoot!.querySelector(".links-layer")!;
    expect(linksSvg.querySelectorAll("g[data-link-id]").length).toBe(3);
    expect(linksSvg.querySelector('g[data-link-id="l1"] path')).toBeTruthy();
    expect((document.querySelector("#l1") as HTMLElement).style.display).toBe("none");

    // Label positions from route fixture
    const fl1 = document.querySelector("#fl1") as HTMLElement;
    expect(fl1.style.position).toBe("absolute");
    expect(fl1.style.left).toBe("158px");
    expect(fl1.style.top).toBe("68px");
  });
});
