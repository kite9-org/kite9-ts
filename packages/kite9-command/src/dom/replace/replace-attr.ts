import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractReplaceCommand } from "./abstract-replace-command.js";

export class ReplaceAttr extends AbstractReplaceCommand<string | null, string | null> {
  readonly type = "ReplaceAttr";
  name: string | null = null;

  protected getFromContent(): string | null {
    return this.from;
  }

  protected getToContent(): string | null {
    return this.to;
  }

  protected getExistingContent(ctx: CommandContext): string {
    const on = this.findFragmentElement(this.fragmentId, ctx);
    return on?.getAttribute(this.name!) ?? "";
  }

  protected doReplace(
    _site: string | null,
    toContent: string | null,
    _fromContent: string | null,
    ctx: CommandContext,
  ): Mismatch | null {
    const e = this.findFragmentElement(this.fragmentId, ctx);
    if (e == null) {
      return mismatch(`Couldn't find element with id ${this.fragmentId}`);
    }
    if (toContent == null) {
      e.removeAttribute(this.name!);
    } else {
      e.setAttribute(this.name!, toContent);
    }
    ctx.log(`Processed replace attribute of ${this.fragmentId} ${this.name}`);
    return null;
  }

  protected override checkProperties(): void {
    this.ensureNotNull("name", this.name);
    super.checkProperties();
  }

  protected override same(
    existing: string | null,
    withContent: string | null,
    ctx: CommandContext,
  ): Mismatch | null {
    if (this.isEmpty(existing) && this.isEmpty(withContent)) {
      return null;
    }
    return super.same(existing, withContent, ctx);
  }
}
