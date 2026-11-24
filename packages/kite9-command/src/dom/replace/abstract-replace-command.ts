import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractDomCommand } from "../abstract-dom-command.js";

export abstract class AbstractReplaceCommand<E, T> extends AbstractDomCommand {
  fragmentId = "";
  from: string | null = null;
  to: string | null = null;

  protected abstract getFromContent(ctx: CommandContext): T;
  protected abstract getToContent(ctx: CommandContext): T;
  protected abstract getExistingContent(ctx: CommandContext): E;
  protected abstract doReplace(
    site: E,
    toContent: T,
    fromContent: T,
    ctx: CommandContext,
  ): Mismatch | null;

  apply(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    const existing = this.getExistingContent(ctx);
    const fromContent = this.getFromContent(ctx);
    const m = this.same(existing, fromContent, ctx);
    if (m != null) return m;
    return this.doReplace(existing, this.getToContent(ctx), fromContent, ctx);
  }

  undo(ctx: CommandContext): Mismatch | null {
    this.checkProperties();
    const existing = this.getExistingContent(ctx);
    const toContent = this.getToContent(ctx);
    const m = this.same(existing, toContent, ctx);
    if (m != null) return m;
    this.doReplace(existing, this.getFromContent(ctx), toContent, ctx);
    return null;
  }

  protected checkProperties(): void {
    this.ensureNotNull("fragmentId", this.fragmentId);
  }

  protected same(existing: E, withContent: T, _ctx: CommandContext): Mismatch | null {
    if ((existing as unknown) === (withContent as unknown)) {
      return null;
    }
    return mismatch(
      `Diagram has changed since move command issued.  Expected ${String(withContent)} got ${String(existing)}`,
    );
  }
}
