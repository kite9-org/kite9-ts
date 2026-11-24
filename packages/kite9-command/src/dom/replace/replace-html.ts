import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { BAD_REQUEST, CommandException } from "../../command-exception.js";
import { AbstractReplaceCommand } from "./abstract-replace-command.js";

/** Replace an element with another HTML fragment (was ReplaceXML). */
export class ReplaceHtml extends AbstractReplaceCommand<Element | null, Element> {
  readonly type = "ReplaceHtml";

  protected getFromContent(ctx: CommandContext): Element {
    const out = ctx.decodeElement(this.from);
    if (out.getAttribute("id") !== this.fragmentId) {
      throw new CommandException(
        BAD_REQUEST,
        "ReplaceHtml should preserve ID",
        this,
      );
    }
    return out;
  }

  protected getToContent(ctx: CommandContext): Element {
    const out = ctx.decodeElement(this.to);
    if (out.getAttribute("id") !== this.fragmentId) {
      throw new CommandException(
        BAD_REQUEST,
        "ReplaceHtml should preserve ID",
        this,
      );
    }
    return out;
  }

  protected getExistingContent(ctx: CommandContext): Element | null {
    return this.findFragmentElement(this.fragmentId, ctx);
  }

  protected doReplace(
    site: Element | null,
    toContent: Element,
    _fromContent: Element,
    ctx: CommandContext,
  ): Mismatch | null {
    if (site == null) {
      return mismatch("Can't replace HTML when site is missing ");
    }
    ctx.getRootElement().ownerDocument.adoptNode(toContent);
    const into = site.parentNode;
    into?.replaceChild(toContent, site);
    this.updateRootIfReplaced(ctx, site, toContent);
    ctx.log(`Processed replace HTML of ${this.fragmentId}`);
    return null;
  }

  protected override same(
    existing: Element | null,
    withContent: Element,
    ctx: CommandContext,
  ): Mismatch | null {
    return ctx.twoElementsAreIdentical(existing, withContent);
  }
}
