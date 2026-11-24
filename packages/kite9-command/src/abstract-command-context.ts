import { integerRange, type IntegerRange } from "@kite9/model";
import { mismatch, type Mismatch } from "./command.js";
import type { CommandContext } from "./command-context.js";

/**
 * Shared HTML light-DOM command-context behaviour.
 * Subclasses supply root / uri / foreign-document loading.
 */
export abstract class AbstractCommandContext implements CommandContext {
  abstract getUri(): string | undefined;
  abstract getRootElement(): Element;
  abstract setRootElement(root: Element): void;
  abstract parseDocument(source: string | URL): Document;

  log(message: string): void {
    console.info(message);
  }

  uniqueId(): string {
    let nextId = 1;
    while (this.getElementById(String(nextId)) != null) {
      nextId++;
    }
    return String(nextId);
  }

  getElementById(
    fragmentId: string | null | undefined,
    within?: Document | Element,
  ): Element | null {
    if (fragmentId == null || fragmentId === "") return null;
    const scope: Document | Element = within ?? this.getRootElement();
    if (isDocument(scope)) {
      return scope.getElementById(fragmentId);
    }
    // Walk the subtree — querySelector("#1") is invalid for numeric ids.
    return findByIdDeep(scope, fragmentId);
  }

  twoElementsAreIdentical(
    expected: Element | null | undefined,
    actual: Element | null | undefined,
  ): Mismatch | null {
    if (expected == null && actual == null) return null;
    if (expected == null || actual == null) {
      return mismatch(
        `Element null mismatch: expected=${expected} actual=${actual}`,
      );
    }
    const diffs = compareElements(expected, actual);
    if (diffs.length === 0) return null;
    return mismatch(diffs.join("\n"));
  }

  decodeElement(base64: string | null | undefined): Element {
    if (base64 == null) {
      throw new Error("decodeElement requires base64");
    }
    const html = decodeBase64Utf8(base64);
    const parsed = parseHtmlDocument(html);
    const el = parsed.body.firstElementChild;
    if (el == null) {
      throw new Error(`decodeElement: no element in fragment: ${html}`);
    }
    return el;
  }

  getStyleValue(e: Element | null | undefined, name: string): string | null {
    if (e == null) return null;
    return parseStyle(e).get(name) ?? null;
  }

  getStyleRangeValue(el: Element, name: string): IntegerRange | null {
    const val = this.getStyleValue(el, name);
    if (val == null) return null;
    return parseIntegerRange(val);
  }

  setStyleValue(e: Element, name: string, value: string | null): void {
    const map = parseStyle(e);
    if (value != null) {
      map.set(name, value);
    } else {
      map.delete(name);
    }
    replaceStyle(e, map);
  }

  setAttributeValue(insert: Element, xpath: string, value: string): void {
    const attr = resolveAttributeXPath(insert, xpath);
    if (attr == null) {
      throw new Error(`Couldn't set attribute value ${xpath}`);
    }
    attr.ownerElement!.setAttribute(attr.name, value);
  }
}

/** Parse HTML into a Document (happy-dom / browser DOMParser). */
export function parseHtmlDocument(html: string): Document {
  return new DOMParser().parseFromString(html, "text/html");
}

/** First element under `<body>` — typical diagram fixture root. */
export function diagramRootFromHtml(html: string): Element {
  const doc = parseHtmlDocument(html);
  const root = doc.body?.firstElementChild;
  if (root == null) {
    throw new Error("No diagram root in HTML (expected body > element)");
  }
  return root;
}

function isDocument(n: Document | Element): n is Document {
  return n.nodeType === Node.DOCUMENT_NODE;
}

function findByIdDeep(root: Element, id: string): Element | null {
  if (root.getAttribute("id") === id) return root;
  for (const child of Array.from(root.children)) {
    const found = findByIdDeep(child, id);
    if (found) return found;
  }
  return null;
}

function decodeBase64Utf8(base64: string): string {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new TextDecoder("utf-8").decode(bytes);
}

/** Naive style map: `a: b; c: d` — no quoted-string / url() awareness. */
export function parseStyle(e: Element): Map<string, string> {
  const style = e.getAttribute("style") ?? "";
  const out = new Map<string, string>();
  for (const part of style.split(";")) {
    if (!part.includes(":")) continue;
    const colon = part.indexOf(":");
    const key = part.slice(0, colon).trim();
    const value = part.slice(colon + 1).trim();
    if (key) out.set(key, value);
  }
  return out;
}

function replaceStyle(e: Element, map: Map<string, string>): void {
  let newStyle = "";
  for (const [k, v] of map) {
    newStyle += `${k}: ${v}; `;
  }
  if (newStyle.trim().length === 0) {
    e.removeAttribute("style");
  } else {
    e.setAttribute("style", newStyle);
  }
}

/** Parse `"0 0"` / `"1 1"` occupy ranges. */
export function parseIntegerRange(val: string): IntegerRange | null {
  const parts = val.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return null;
  if (parts.length === 1) {
    const n = Number.parseInt(parts[0]!, 10);
    if (Number.isNaN(n)) return null;
    return integerRange(n, n);
  }
  const from = Number.parseInt(parts[0]!, 10);
  const to = Number.parseInt(parts[1]!, 10);
  if (Number.isNaN(from) || Number.isNaN(to)) return null;
  return integerRange(from, to);
}

export function formatIntegerRange(r: IntegerRange): string {
  if (r.from > r.to) return "*";
  return `${r.from} ${r.to}`;
}

/**
 * Enough for test patterns like `*[local-name()='from']/@reference`.
 * Supports: `*[local-name()='name']/@attr` and `tag/@attr` relative to `insert`.
 */
export function resolveAttributeXPath(
  insert: Element,
  xpath: string,
): Attr | null {
  const m = xpath.match(
    /^(?:\*\[local-name\(\)='([^']+)'\]|([A-Za-z][\w:-]*))\/@([A-Za-z_][\w:-]*)$/,
  );
  if (!m) return null;
  const localName = m[1] ?? m[2]!;
  const attrName = m[3]!;
  const el = findChildByLocalName(insert, localName);
  if (el == null) return null;
  if (!el.hasAttribute(attrName)) {
    el.setAttribute(attrName, "");
  }
  return el.getAttributeNode(attrName);
}

function findChildByLocalName(parent: Element, localName: string): Element | null {
  const want = localName.toLowerCase();
  for (const child of Array.from(parent.children)) {
    if (child.localName.toLowerCase() === want) return child;
  }
  return null;
}

function compareElements(a: Element, b: Element): string[] {
  const diffs: string[] = [];
  compareNode(a, b, "", diffs);
  return diffs;
}

function compareNode(a: Node, b: Node, path: string, diffs: string[]): void {
  if (a.nodeType !== b.nodeType) {
    diffs.push(`${path}: nodeType ${a.nodeType} vs ${b.nodeType}`);
    return;
  }
  if (a.nodeType === Node.TEXT_NODE) {
    const ta = normalizeWs(a.textContent ?? "");
    const tb = normalizeWs(b.textContent ?? "");
    if (ta !== tb) diffs.push(`${path}: text '${a.textContent}' vs '${b.textContent}'`);
    return;
  }
  if (a.nodeType === Node.COMMENT_NODE) return;
  if (a.nodeType !== Node.ELEMENT_NODE) return;

  const ea = a as Element;
  const eb = b as Element;
  if (ea.localName.toLowerCase() !== eb.localName.toLowerCase()) {
    diffs.push(`${path}: tag ${ea.localName} vs ${eb.localName}`);
    return;
  }
  const here = path ? `${path}/${ea.localName}` : ea.localName;

  const attrsA = attrMap(ea);
  const attrsB = attrMap(eb);
  const names = new Set([...attrsA.keys(), ...attrsB.keys()]);
  for (const name of names) {
    if (name === "xmlns") continue;
    const va = attrsA.get(name) ?? "";
    const vb = attrsB.get(name) ?? "";
    if (name === "style") {
      if (normalizeStyle(va) !== normalizeStyle(vb)) {
        diffs.push(`${here}/@style: '${va}' vs '${vb}'`);
      }
    } else if (normalizeWs(va) !== normalizeWs(vb)) {
      diffs.push(`${here}/@${name}: '${va}' vs '${vb}'`);
    }
  }

  const kidsA = significantChildren(ea);
  const kidsB = significantChildren(eb);
  const n = Math.max(kidsA.length, kidsB.length);
  for (let i = 0; i < n; i++) {
    const ca = kidsA[i];
    const cb = kidsB[i];
    if (ca == null || cb == null) {
      diffs.push(`${here}: child count ${kidsA.length} vs ${kidsB.length}`);
      break;
    }
    compareNode(ca, cb, `${here}[${i}]`, diffs);
  }
}

function attrMap(e: Element): Map<string, string> {
  const out = new Map<string, string>();
  for (const attr of Array.from(e.attributes)) {
    out.set(attr.name, attr.value);
  }
  return out;
}

function significantChildren(e: Element): Node[] {
  const out: Node[] = [];
  for (const n of Array.from(e.childNodes)) {
    if (n.nodeType === Node.COMMENT_NODE) continue;
    if (n.nodeType === Node.TEXT_NODE) {
      if (normalizeWs(n.textContent ?? "") === "") continue;
      out.push(n);
    } else if (n.nodeType === Node.ELEMENT_NODE) {
      out.push(n);
    }
  }
  return out;
}

function normalizeWs(s: string): string {
  return s.replace(/\s+/g, "");
}

function normalizeStyle(s: string): string {
  return s.replace(/[\s;]/g, "");
}

/** Serialize the diagram root element. */
export function serializeDiagramHtml(root: Element): string {
  return root.outerHTML;
}
