import type { Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractInsertCommand } from "./abstract-insert-command.js";

export class InsertUrl extends AbstractInsertCommand {
  readonly type: string = "InsertUrl";
  uriStr: string | null = null;

  apply(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doInsert(ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doDelete(ctx);
  }

  protected getContents(ctx: CommandContext): Element | null {
    const out = this.getForeignElementCopy(this.uriStr!, true, ctx);
    this.replaceIds(out, this.newId!);
    return out;
  }

  protected override checkProperties(): void {
    super.checkProperties();
    this.ensureNotNull("uriStr", this.uriStr);
    this.ensureNotNull("newId", this.newId);
  }
}
