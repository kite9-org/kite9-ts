import { AbstractCommandContext } from "./abstract-command-context.js";
import type { Mismatch } from "./command.js";

/**
 * In-memory CommandContext that supplies root and uri.
 * Foreign document loading is left to subclasses (e.g. {@link TestLocalCommandContext}).
 */
export class LocalCommandContext extends AbstractCommandContext {
  private root: Element;
  private readonly uri: string | undefined;

  constructor(root: Element, uri: string) {
    super();
    this.root = root;
    this.uri = uri;
  }

  getUri(): string | undefined {
    return this.uri;
  }

  getRootElement(): Element {
    return this.root;
  }

  setRootElement(root: Element): void {
    this.root = root;
  }

  parseDocument(source: string | URL): Document {
    const key = typeof source === "string" ? source : source.href;
    throw new Error(
      `parseDocument not configured for ${key}; use TestLocalCommandContext or override`,
    );
  }
}

/** Whitespace-insensitive HTML structural equality of two roots. */
export function rootsStructurallyEqual(
  a: Element,
  b: Element,
): Mismatch | null {
  return new LocalCommandContext(a).twoElementsAreIdentical(a, b);
}
