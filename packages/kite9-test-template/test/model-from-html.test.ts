import { createDiagram, serializeDiagram } from "@kite9/templating";
import { afterEach, describe, expect, it } from "vitest";
import { testTemplatePack } from "../src/pack.js";
import { expectedModelJson, mountScene } from "./helpers.js";

afterEach(() => {
  document.body.innerHTML = "";
});

/** 1) Light DOM HTML → stable model JSON (no layout assertions). */
describe("HTML light DOM → model JSON", () => {
  it("empty.html", () => {
    const root = mountScene("empty.html");
    const diagram = createDiagram(root, testTemplatePack);
    expect(serializeDiagram(diagram)).toEqual(expectedModelJson("empty.json"));
  });

  it("card.html", () => {
    const root = mountScene("card.html");
    const diagram = createDiagram(root, testTemplatePack);
    expect(serializeDiagram(diagram)).toEqual(expectedModelJson("card.json"));
  });
});
