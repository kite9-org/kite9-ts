import type { Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractInsertCommand } from "./abstract-insert-command.js";

/**
 * Delete is the opposite of insert; payload says what you're deleting so it
 * can be checked / undone.
 */
export class Delete extends AbstractInsertCommand {
  readonly type = "Delete";
  base64Element = "";

  apply(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doDelete(ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    return this.doInsert(ctx);
  }

  protected getContents(ctx: CommandContext): Element | null {
    return this.copyWithoutContainedIds(ctx.decodeElement(this.base64Element));
  }

  protected override checkProperties(): void {
    super.checkProperties();
    this.ensureNotNull("base64Element", this.base64Element);
  }
}
