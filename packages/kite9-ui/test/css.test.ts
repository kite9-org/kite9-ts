import { describe, expect, it } from "vitest";
import { formatStyle, parseStyle } from "../src/css.js";

describe("parseStyle / formatStyle", () => {
  it("round-trips simple declarations", () => {
    const parsed = parseStyle("color: red; width: 10px;");
    expect(parsed.color).toBe("red");
    expect(parsed.width).toBe("10px");
    expect(formatStyle(parsed)).toContain("color: red;");
  });
});
