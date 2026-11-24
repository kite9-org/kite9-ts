import type { Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractInsertCommand } from "./abstract-insert-command.js";

/** Insert a base64-encoded HTML fragment (was InsertXML). */
export class InsertHtml extends AbstractInsertCommand {
  readonly type = "InsertHtml";
  base64Element: string | null = null;

  apply(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doInsert(ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doDelete(ctx);
  }

  protected getContents(ctx: CommandContext): Element | null {
    const out = this.copyWithoutContainedIds(ctx.decodeElement(this.base64Element));
    if (this.newId != null && out != null) {
      this.replaceIds(out, this.newId);
    }
    return out;
  }

  protected override checkProperties(): void {
    super.checkProperties();
    this.ensureNotNull("base64Element", this.base64Element);
  }
}
