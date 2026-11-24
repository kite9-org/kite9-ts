import type { IntegerRange } from "@kite9/model";
import type { Mismatch } from "./command.js";

/**
 * Host environment for applying commands to an HTML light-DOM subtree.
 * Holds the diagram root (not a whole Document — that was an XML-era leftover).
 */
export interface CommandContext {
  /** Base URI for resolving InsertUrl / ReplaceTagUrl locations. */
  getUri(): string | undefined;

  /** Diagram root being edited. */
  getRootElement(): Element;
  /**
   * Update the diagram root after a command replaces it
   * (e.g. ReplaceHtml of the diagram element).
   */
  setRootElement(root: Element): void;

  log(message: string): void;

  /** Next free numeric id under the diagram root. */
  uniqueId(): string;
  /**
   * Look up by id under the diagram root, or under `within` when provided
   * (e.g. a foreign Document from {@link parseDocument}).
   */
  getElementById(
    fragmentId: string | null | undefined,
    within?: Document | Element,
  ): Element | null;

  twoElementsAreIdentical(
    expected: Element | null | undefined,
    actual: Element | null | undefined,
  ): Mismatch | null;
  
  /** Decode a base64-encoded HTML fragment into an Element. */
  decodeElement(base64: string | null | undefined): Element;
  
  getStyleValue(e: Element | null | undefined, name: string): string | null;
  
  /** Parse `--kite9-occupies-*` style values like `"1 1"`. */
  getStyleRangeValue(el: Element, name: string): IntegerRange | null;
  
  /** If `value` is null, removes the property. */
  setStyleValue(e: Element, name: string, value: string | null): void;
  
  /** Set an attribute located by a relative XPath from `insert`. */
  setAttributeValue(insert: Element, xpath: string, value: string): void;
  
  /** Load another HTML document (InsertUrl / ReplaceTagUrl). */
  parseDocument(source: string | URL): Document;
}
