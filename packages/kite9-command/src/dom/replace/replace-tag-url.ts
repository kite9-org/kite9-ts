import type { CommandContext } from "../../command-context.js";
import { ReplaceTag } from "./replace-tag.js";

/** Like ReplaceTag, but `to` is a document#id URI. */
export class ReplaceTagUrl extends ReplaceTag {
  override readonly type: string = "ReplaceTagUrl";

  protected override getToContent(ctx: CommandContext): Element {
    return this.getForeignElementCopy(this.to!, false, ctx);
  }
}
