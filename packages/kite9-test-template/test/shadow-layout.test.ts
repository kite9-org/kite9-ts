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
    applyLayout(root, grid, testTemplatePack);

    const shadow = root.shadowRoot!;
    expect(shadow.querySelector(".stage")).toBeTruthy();
    const objects = shadow.querySelector(".objects-layer") as HTMLElement;
    expect(objects.style.display).toBe("grid");
    expect(objects.style.gridTemplateColumns).toContain("px");
    expect(shadow.querySelector(".links-layer")?.querySelectorAll("g").length).toBe(0);
  });

  it("card.html paints chrome, places cells, and draws SVG link layer", () => {
    const root = mountScene("card.html");
    createDiagram(root, testTemplatePack);
    const grid = loadGridFixture("card.json");
    applyLayout(root, grid, testTemplatePack);

    // Template chrome in host shadows
    expect(root.shadowRoot?.querySelector(".stage")).toBeTruthy();
    expect(document.querySelector("#g1")?.shadowRoot?.querySelector(".card")).toBeTruthy();
    expect(
      document.querySelector("#c1")?.shadowRoot?.querySelector(".container-card"),
    ).toBeTruthy();
    expect(document.querySelector("#a1")?.shadowRoot?.querySelector(".card")).toBeTruthy();
    expect(document.querySelector("#k1")?.shadowRoot?.querySelector(".key-card")).toBeTruthy();
    expect(document.querySelector("#s1")?.shadowRoot?.querySelector(".port")).toBeTruthy();

    // Grid placements from fixture
    const g1 = document.querySelector("#g1") as HTMLElement;
    expect(g1.style.gridColumn).toBeTruthy();
    expect(g1.style.width).toBe("120px");
    expect(g1.style.height).toBe("80px");

    const c1 = document.querySelector("#c1") as HTMLElement;
    expect(c1.style.gridColumn).toBeTruthy();
    expect(c1.style.width).toBe("140px");

    // Socket mounted on g2's left edge; l2 route ends there
    const s1 = document.querySelector("#s1") as HTMLElement;
    expect(s1.style.position).toBe("absolute");
    expect(s1.style.left).toBe("0px");
    expect(s1.style.top).toBe("50%");
    expect(s1.style.transform).toBe("translate(-50%, -50%)");
    const l2 = root.shadowRoot!.querySelector(
      '.links-layer g[data-link-id="l2"] path[data-connection-path]',
    )!;
    // l2 runs along content-row top edge (yi=2 → y=32) from xi=5→6.
    expect(l2.getAttribute("d")).toBe("M296 32 L360 32");

    const objects = root.shadowRoot!.querySelector(".objects-layer") as HTMLElement;
    expect(objects.style.display).toBe("grid");
    expect(objects.style.gridTemplateColumns.split(" ").length).toBe(
      grid.grid.colSizes.length,
    );

    // Routes on the links SVG overlay; light-DOM links hidden
    const linksSvg = root.shadowRoot!.querySelector(".links-layer")!;
    const l1 = linksSvg.querySelector('g[data-link-id="l1"]')!;
    expect(linksSvg.querySelectorAll("g[data-link-id]").length).toBe(2);
    expect(l1.querySelector("path")).toBeTruthy();
    expect((document.querySelector("#l1") as HTMLElement).style.display).toBe("none");

    // Terminators: hit-boxes on both ends; visual via shared SVG marker defs
    const fromTerm = l1.querySelector('[data-terminator-end="from"]')!;
    const toTerm = l1.querySelector('[data-terminator-end="to"]')!;
    expect(fromTerm.querySelector("ellipse.terminator-hit")).toBeTruthy();
    expect(toTerm.querySelector("ellipse.terminator-hit")).toBeTruthy();
    expect(toTerm.getAttribute("data-terminator-style")?.toUpperCase()).toBe("ARROW");
    expect(linksSvg.querySelector("#arrow-end-marker")).toBeTruthy();
    expect(linksSvg.querySelector("#none-start-marker")).toBeTruthy();
    const path = l1.querySelector("path[data-connection-path]")!;
    expect(path.getAttribute("marker-end")).toBe("url(#arrow-end-marker)");
    expect(path.getAttribute("marker-start")).toBe("url(#none-start-marker)");
    expect(toTerm.querySelector("polygon")).toBeNull();

    // Labels live in SVG foreignObject (not absolute HTML on the diagram)
    const fl1Fo = l1.querySelector('foreignObject[data-label-id="fl1"]');
    const tl1Fo = l1.querySelector('foreignObject[data-label-id="tl1"]');
    expect(fl1Fo).toBeTruthy();
    expect(tl1Fo).toBeTruthy();
    expect(fl1Fo?.getAttribute("x")).toBe("158");
    expect(fl1Fo?.getAttribute("y")).toBe("68");
    expect((document.querySelector("#fl1") as HTMLElement).style.position).not.toBe(
      "absolute",
    );
  });
});
