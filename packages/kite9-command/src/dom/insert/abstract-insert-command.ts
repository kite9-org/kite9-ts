import { mismatch, type Mismatch } from "../../command.js";
import type { CommandContext } from "../../command-context.js";
import { AbstractDomCommand } from "../abstract-dom-command.js";

export abstract class AbstractInsertCommand extends AbstractDomCommand {
  fragmentId: string | null = null;
  beforeId: string | null = null;
  containedIds: string[] = [];
  newId: string | null = null;

  protected doDelete(ctx: CommandContext): Mismatch | null {
    const oldState = this.getContents(ctx);
    if (oldState == null) return null;

    const toDelete = this.findFragmentElement(oldState.getAttribute("id"), ctx);
    const parent = toDelete?.parentNode as Element | null;
    const m = this.same(toDelete, oldState, ctx);
    if (m != null) return m;
    if (parent == null || toDelete == null) {
      return mismatch("Delete target missing");
    }
    const parentId = parent.getAttribute("id") ?? "";
    if (parentId !== this.fragmentId) {
      return mismatch(`Parent id ${parentId} doesn't match ${this.fragmentId}`);
    }
    const children = toDelete.childNodes;
    let i = 0;
    while (i < children.length) {
      const c = children.item(i);
      if (
        c instanceof Element &&
        this.containedIds.includes(c.getAttribute("id") ?? "")
      ) {
        parent.insertBefore(c, toDelete);
      } else {
        i++;
      }
    }
    toDelete.parentNode?.removeChild(toDelete);
    ctx.log(`Processed delete to ${this.fragmentId}`);
    return null;
  }

  protected same(
    expected: Element | null | undefined,
    actual: Element | null | undefined,
    ctx: CommandContext,
  ): Mismatch | null {
    const expectedNoId = this.copyWithoutContainedIds(expected);
    const actualNoId = this.copyWithoutContainedIds(actual);
    return ctx.twoElementsAreIdentical(expectedNoId, actualNoId);
  }

  protected copyWithoutContainedIds(
    expected: Element | null | undefined,
  ): Element | null {
    if (expected == null) return null;
    const out = expected.cloneNode(true) as Element;
    let i = 0;
    while (i < out.childNodes.length) {
      const n = out.childNodes.item(i);
      if (
        n instanceof Element &&
        this.containedIds.includes(n.getAttribute("id") ?? "")
      ) {
        out.removeChild(n);
      } else {
        i++;
      }
    }
    return out;
  }

  protected doInsert(ctx: CommandContext): Mismatch | null {
    const destination = this.getDestination(ctx);
    const before = this.getBefore(ctx);
    const contents = this.getContents(ctx);
    if (contents == null) return null;

    const containsId = contents.getAttribute("id") ?? "";
    if (this.alreadyExists(containsId, ctx)) {
      return mismatch(`Already contains ${containsId}`);
    }
    if (destination == null) {
      return mismatch("Destination no longer exists");
    }
    ctx.getRootElement().ownerDocument.adoptNode(contents);
    if (before != null) {
      destination.insertBefore(contents, before);
    } else {
      destination.appendChild(contents);
    }

    const children = destination.childNodes;
    const toMove: Element[] = [];
    for (let i = 0; i < children.length; i++) {
      const c = children.item(i);
      if (
        c instanceof Element &&
        this.containedIds.includes(c.getAttribute("id") ?? "")
      ) {
        toMove.push(c);
      }
    }
    for (const element of toMove) {
      contents.appendChild(element);
    }
    ctx.log(`Processed insert into ${this.fragmentId}`);
    return null;
  }

  private alreadyExists(newId: string, ctx: CommandContext): boolean {
    return ctx.getElementById(newId) != null;
  }

  protected getBefore(ctx: CommandContext): Element | null {
    if (this.beforeId != null) {
      return this.findFragmentElement(this.beforeId, ctx);
    }
    return null;
  }

  protected getDestination(ctx: CommandContext): Element | null {
    return this.findFragmentElement(this.fragmentId, ctx);
  }

  protected abstract getContents(ctx: CommandContext): Element | null;

  protected checkProperties(): void {
    this.ensureNotNull("fragmentId", this.fragmentId);
  }
}
