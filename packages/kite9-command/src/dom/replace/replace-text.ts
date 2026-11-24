import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractReplaceCommand } from "./abstract-replace-command.js";

export enum PreserveChildElements {
  BEFORE = "BEFORE",
  AFTER = "AFTER",
  NONE = "NONE",
}

export class ReplaceText extends AbstractReplaceCommand<Element | null, string> {
  readonly type = "ReplaceText";
  preserve: PreserveChildElements = PreserveChildElements.AFTER;

  private collectChildren(e: Element): Element[] {
    if (this.preserve === PreserveChildElements.NONE) return [];
    const out: Element[] = [];
    for (let i = 0; i < e.childNodes.length; i++) {
      const n = e.childNodes.item(i);
      if (n instanceof Element) out.push(n);
    }
    return out;
  }

  protected getFromContent(): string {
    return this.from!;
  }

  protected getToContent(): string {
    return this.to!;
  }

  protected getExistingContent(ctx: CommandContext): Element | null {
    return this.findFragmentElement(this.fragmentId, ctx);
  }

  protected doReplace(
    site: Element | null,
    toContent: string,
    _fromContent: string,
    ctx: CommandContext,
  ): Mismatch | null {
    if (site == null) return null;
    const childElements = this.collectChildren(site);
    site.textContent = toContent;
    if (this.preserve === PreserveChildElements.BEFORE) {
      for (const c of [...childElements].reverse()) {
        site.insertBefore(c, null);
      }
    } else if (this.preserve === PreserveChildElements.AFTER) {
      for (const c of childElements) {
        site.appendChild(c);
      }
    }
    ctx.log(`Processed replace text of ${this.fragmentId}`);
    return null;
  }

  protected override same(
    existing: Element | null,
    withContent: string,
    _ctx: CommandContext,
  ): Mismatch | null {
    const eText = existing?.textContent ?? "";
    const eTextReplaced = eText.replace(/\s/g, "");
    const withReplaced = withContent.replace(/\s/g, "");
    switch (this.preserve) {
      case PreserveChildElements.AFTER:
        return this.check(eTextReplaced.startsWith(withReplaced), eText, withContent);
      case PreserveChildElements.BEFORE:
        return this.check(eTextReplaced.endsWith(withReplaced), eText, withContent);
      case PreserveChildElements.NONE:
        return this.check(eTextReplaced === withReplaced, eText, withContent);
    }
  }

  private check(ok: boolean, eText: string, withContent: string): Mismatch | null {
    return ok ? null : mismatch(`Text not same: '${eText}' and '${withContent}'`);
  }
}
