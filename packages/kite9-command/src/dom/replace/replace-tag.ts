import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractReplaceCommand } from "./abstract-replace-command.js";

/**
 * Replaces tag names and attributes, keeping contents unaltered.
 */
export class ReplaceTag extends AbstractReplaceCommand<Element | null, Element> {
  readonly type: string = "ReplaceTag";
  keptAttributes: string[] = ["id"];

  private keepImportantAttributes(e: Element, n: Element): void {
    for (const a of this.keptAttributes) {
      if (e.hasAttribute(a)) {
        n.setAttribute(a, e.getAttribute(a)!);
      } else {
        n.removeAttribute(a);
      }
    }
  }

  private copyAttributes(from: Element, to: Element, matching: boolean): void {
    for (const item of Array.from(from.attributes)) {
      if (matching === this.keptAttributes.includes(item.name)) {
        to.setAttribute(item.name, item.value);
      }
    }
  }

  private moveContents(from: Element, to: Element): void {
    while (to.childNodes.length > 0) {
      to.removeChild(to.childNodes.item(0)!);
    }
    while (from.childNodes.length > 0) {
      to.appendChild(from.childNodes.item(0)!);
    }
  }

  protected doReplace(
    site: Element | null,
    toContent: Element,
    _fromContent: Element,
    ctx: CommandContext,
  ): Mismatch | null {
    if (site == null) return null;
    ctx.getRootElement().ownerDocument.adoptNode(toContent);
    this.keepImportantAttributes(site, toContent);
    site.parentNode?.insertBefore(toContent, site);
    this.copyAttributes(site, toContent, true);
    this.moveContents(site, toContent);
    site.parentNode?.removeChild(site);
    this.updateRootIfReplaced(ctx, site, toContent);
    ctx.log(`Processed replace tag of ${this.fragmentId}`);
    return null;
  }

  protected override same(
    existing: Element | null,
    withContent: Element,
    _ctx: CommandContext,
  ): Mismatch | null {
    if (existing == null) {
      return mismatch("Existing is null, so not a replace");
    }
    const m1 = this.checkAttributesSame(existing, withContent);
    return m1 ?? this.checkAttributesSame(withContent, existing);
  }

  private checkAttributesSame(a: Element, b: Element): Mismatch | null {
    for (const aa of Array.from(a.attributes)) {
      if (!this.keptAttributes.includes(aa.name) && aa.name !== "xmlns") {
        const aValue = aa.value;
        const bValue = b.getAttribute(aa.name) ?? "";
        if (aValue !== bValue) {
          return mismatch(
            `Attribute${aa.name} differs: ${aValue} and ${bValue}`,
          );
        }
      }
    }
    return null;
  }

  protected getFromContent(ctx: CommandContext): Element {
    return ctx.decodeElement(this.from);
  }

  protected getToContent(ctx: CommandContext): Element {
    return ctx.decodeElement(this.to);
  }

  protected getExistingContent(ctx: CommandContext): Element | null {
    return this.findFragmentElement(this.fragmentId, ctx);
  }
}
