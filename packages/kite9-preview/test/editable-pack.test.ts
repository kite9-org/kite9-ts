import { describe, expect, it } from "vitest";
import { editablePack } from "../src/editable-pack.js";

describe("editablePack", () => {
  it("includes select, actionable, styleable, resizable", () => {
    expect(editablePack.id).toBe("editable");
    expect(editablePack.behaviours.map((b) => b.id)).toEqual([
      "selectable",
      "actionable",
      "styleable",
      "resizable",
    ]);
  });
});
