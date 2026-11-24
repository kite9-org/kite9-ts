import { describe, expect, it } from "vitest";
import {
  isSelected,
  select,
  singleSelect,
  unselect,
} from "../src/selectable/selection.js";

describe("selection helpers", () => {
  it("selects and clears nested/parent selection", () => {
    const root = document.createElement("div");
    const parent = document.createElement("kite9-container");
    parent.id = "c1";
    const child = document.createElement("kite9-glyph");
    child.id = "g1";
    parent.appendChild(child);
    root.appendChild(parent);

    select(parent, root);
    expect(isSelected(parent)).toBe(true);

    select(child, root);
    expect(isSelected(child)).toBe(true);
    expect(isSelected(parent)).toBe(false);
  });

  it("singleSelect replaces selection", () => {
    const root = document.createElement("div");
    const a = document.createElement("kite9-glyph");
    a.id = "a";
    const b = document.createElement("kite9-glyph");
    b.id = "b";
    root.append(a, b);

    singleSelect([a], root);
    singleSelect([b], root);
    expect(isSelected(a)).toBe(false);
    expect(isSelected(b)).toBe(true);
    unselect(b);
    expect(isSelected(b)).toBe(false);
  });
});
