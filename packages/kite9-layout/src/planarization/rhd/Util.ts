import type { DiagramElement } from "@kite9/model";
import { isConnectedRectangular } from "../../common/elements/TypeGuards.js";

export const Util = {
  countConnectedElements(de: DiagramElement): number {
    let out = 0;
    if (isConnectedRectangular(de)) {
      out++;
      for (const c of de.getContents()) {
        out += Util.countConnectedElements(c);
      }
    }
    return out;
  },
};
