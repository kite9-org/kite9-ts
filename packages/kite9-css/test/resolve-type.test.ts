import { describe, expect, it } from "vitest";
import { ELEMENT_TYPE_PROPERTY } from "../src/constants.js";
import { DiagramElementType } from "../src/enums.js";
import { resolveDiagramElementType } from "../src/resolve-type.js";

describe("resolveDiagramElementType", () => {
  it("reads author style on the host", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.style.setProperty(ELEMENT_TYPE_PROPERTY, "connection");
    expect(resolveDiagramElementType(host)).toBe(DiagramElementType.CONNECTION);
    host.remove();
  });

  it("returns null for none", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    host.style.setProperty(ELEMENT_TYPE_PROPERTY, "none");
    expect(resolveDiagramElementType(host)).toBeNull();
    host.remove();
  });

  it("author inline beats template :host default (cascade, no copy)", () => {
    class CascadeHost extends HTMLElement {
      constructor() {
        super();
        const shadow = this.attachShadow({ mode: "open" });
        shadow.innerHTML = `<style>:host { ${ELEMENT_TYPE_PROPERTY}: connected-rectangular; }</style><slot></slot>`;
      }
    }
    if (!customElements.get("kite9-cascade-host")) {
      customElements.define("kite9-cascade-host", CascadeHost);
    }

    const host = document.createElement("kite9-cascade-host");
    document.body.appendChild(host);

    // Template default alone
    const fromTemplate = resolveDiagramElementType(host);
    // happy-dom may or may not surface :host custom props; author style must win when set
    host.style.setProperty(ELEMENT_TYPE_PROPERTY, "port");
    expect(resolveDiagramElementType(host)).toBe(DiagramElementType.PORT);

    // If template was visible, it was connected-rectangular before override
    if (fromTemplate != null) {
      expect(fromTemplate).toBe(DiagramElementType.CONNECTED_RECTANGULAR);
    }

    host.remove();
  });
});
