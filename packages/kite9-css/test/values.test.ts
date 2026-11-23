import { describe, expect, it } from "vitest";
import { DiagramElementType } from "../src/enums.js";
import { fromCssValue, toCssValue } from "../src/values.js";

describe("toCssValue / fromCssValue", () => {
  it("lowercases kebab-case", () => {
    expect(toCssValue("CONNECTED_RECTANGULAR")).toBe("connected-rectangular");
    expect(toCssValue(DiagramElementType.LABEL)).toBe("label");
  });

  it("parses six kinds", () => {
    expect(fromCssValue("diagram", DiagramElementType)).toBe(
      DiagramElementType.DIAGRAM,
    );
    expect(fromCssValue("connected-rectangular", DiagramElementType)).toBe(
      DiagramElementType.CONNECTED_RECTANGULAR,
    );
    expect(fromCssValue("connection", DiagramElementType)).toBe(
      DiagramElementType.CONNECTION,
    );
  });

  it("returns null for none / empty / unknown legacy tokens", () => {
    expect(fromCssValue("none", DiagramElementType)).toBeNull();
    expect(fromCssValue("", DiagramElementType)).toBeNull();
    expect(fromCssValue(null, DiagramElementType)).toBeNull();
    expect(fromCssValue("container", DiagramElementType)).toBeNull();
    expect(fromCssValue("link", DiagramElementType)).toBeNull();
  });
});
