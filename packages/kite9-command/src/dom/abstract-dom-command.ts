import {
  BAD_REQUEST,
  CommandException,
} from "../command-exception.js";
import type { Command, Mismatch } from "../command.js";
import type { CommandContext } from "../command-context.js";

/** Base for HTML light-DOM commands (was AbstractADLCommand). */
export abstract class AbstractDomCommand implements Command {
  abstract readonly type: string;

  abstract apply(ctx: CommandContext): Mismatch | null;
  abstract undo(ctx: CommandContext): Mismatch | null;

  protected ensureNotNull(field: string, value: unknown): void {
    if (value == null) {
      throw new CommandException(
        BAD_REQUEST,
        `${this.constructor.name} requires ${field} to be set`,
        this,
      );
    }
  }

  protected isEmpty(s: string | null | undefined): boolean {
    return s == null || s.trim().length === 0;
  }

  protected findFragmentElement(
    fragmentId: string | null | undefined,
    ctx: CommandContext,
  ): Element | null {
    let id = fragmentId;
    if (this.isEmpty(id)) {
      return ctx.getRootElement();
    }
    const partIndex = id!.indexOf("@");
    if (partIndex > -1) {
      ctx.log(`Stripping part from ${id}`);
      id = id!.substring(0, partIndex);
    }
    return ctx.getElementById(id);
  }

  protected getForeignElementCopy(
    uriStr: string,
    deep: boolean,
    ctx: CommandContext,
  ): Element {
    try {
      const hash = uriStr.indexOf("#");
      const id = uriStr.substring(hash + 1);
      const location = uriStr.substring(0, hash);
      let scope: Document | Element = ctx.getRootElement();
      if (location.length > 0) {
        const baseUri = ctx.getUri();
        const resolved =
          baseUri != null ? new URL(location, baseUri).href : location;
        scope = ctx.parseDocument(resolved);
      }
      const template = ctx.getElementById(id, scope);
      if (template == null) {
        throw new Error(`Couldn't find referred template at ${location}`);
      }
      return template.cloneNode(deep) as Element;
    } catch (e) {
      throw new Error(`Couldn't get foreign element: ${uriStr}`, { cause: e });
    }
  }

  protected replaceIds(insert: Element, ctxOrBase: CommandContext | string): void {
    if (typeof ctxOrBase !== "string") {
      this.replaceIdsWithBase(insert, ctxOrBase.uniqueId());
    } else {
      this.replaceIdsWithBase(insert, ctxOrBase);
    }
  }

  private replaceIdsWithBase(insert: Element, base: string): void {
    if (insert.hasAttribute("id")) {
      insert.setAttribute("id", base);
    }
    this.replaceIdsChildren(insert.childNodes, `${base}-`);
  }

  private replaceIdsChildren(children: NodeListOf<ChildNode>, base: string): void {
    let nextId = 0;
    for (let i = 0; i < children.length; i++) {
      const n = children.item(i);
      if (n instanceof Element) {
        this.replaceIdsWithBase(n, base + nextId);
        nextId++;
      }
    }
  }

  /** If `site` was the diagram root, point context at its replacement. */
  protected updateRootIfReplaced(
    ctx: CommandContext,
    site: Element,
    replacement: Element,
  ): void {
    if (ctx.getRootElement() === site) {
      ctx.setRootElement(replacement);
    }
  }
}
