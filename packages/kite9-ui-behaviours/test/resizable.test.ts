import { describe, expect, it } from "vitest";
import { createResizableBehaviour } from "../src/resizable/index.js";

describe("createResizableBehaviour", () => {
  it("exposes id resizable", () => {
    expect(createResizableBehaviour().id).toBe("resizable");
  });
});
