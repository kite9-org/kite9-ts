import type { CommandContext } from "../../command-context.js";
import { InsertUrl } from "./insert-url.js";

/** Insert from URL and patch attributes (e.g. link from/to references). */
export class InsertUrlWithChanges extends InsertUrl {
  override readonly type: string = "InsertUrlWithChanges";
  xpathToValue: Record<string, string> = {};

  protected updateLinkEnds(insert: Element | null, ctx: CommandContext): void {
    if (insert == null) return;
    for (const [xpath, value] of Object.entries(this.xpathToValue)) {
      ctx.setAttributeValue(insert, xpath, value);
    }
  }

  protected override getContents(ctx: CommandContext): Element | null {
    const out = super.getContents(ctx);
    this.updateLinkEnds(out, ctx);
    return out;
  }
}
