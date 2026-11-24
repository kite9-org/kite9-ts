import { parseHtmlDocument } from "./abstract-command-context.js";
import { LocalCommandContext } from "./local-command-context.js";

/**
 * Test CommandContext: resolves {@link parseDocument} from an in-memory
 * URI → HTML map (no HTTP).
 */
export class TestLocalCommandContext extends LocalCommandContext {
  private readonly documents: Record<string, string>;

  constructor(
    root: Element,
    uri: string,
    /** Map of absolute/relative URI string → HTML source for foreign loads. */
    documents: Record<string, string> = {},
  ) {
    super(root, uri);
    this.documents = documents;
  }

  override parseDocument(source: string | URL): Document {
    const key = typeof source === "string" ? source : source.href;
    const resolved =
      this.documents[key] ??
      this.documents[normalizeUri(key, this.getUri())] ??
      null;
    if (resolved == null) {
      throw new Error(`Unknown document URI: ${key}`);
    }
    return parseHtmlDocument(resolved);
  }
}

function normalizeUri(key: string, base?: string): string {
  if (!base) return key;
  try {
    return new URL(key, base).href;
  } catch {
    return key;
  }
}
