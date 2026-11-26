/** Indent kite9 light-DOM fragments for readable source views. */

export function prettyDiagramHtml(fragment: string): string {
  const trimmed = fragment.trim();
  if (!trimmed) return "";

  const tokens = trimmed.match(/<[^>]+>|[^<]+/g) ?? [];
  let depth = 0;
  const lines: string[] = [];

  for (let i = 0; i < tokens.length; ) {
    const tok = tokens[i]!.trim();
    if (!tok) {
      i += 1;
      continue;
    }

    if (/^<\//.test(tok)) {
      depth = Math.max(0, depth - 1);
      lines.push(`${"  ".repeat(depth)}${tok}`);
      i += 1;
      continue;
    }

    if (tok.startsWith("<")) {
      const selfClose = /\/>$/.test(tok) || /^<!/.test(tok) || /^<\?/.test(tok);
      const tag = tok.match(/^<\/?([^\s>/]+)/)?.[1];
      const pad = "  ".repeat(depth);

      if (!selfClose && tag) {
        const next = tokens[i + 1]?.trim() ?? "";
        const next2 = tokens[i + 2]?.trim() ?? "";
        if (next === `</${tag}>`) {
          lines.push(`${pad}${tok}${next}`);
          i += 2;
          continue;
        }
        if (next && !next.startsWith("<") && next2 === `</${tag}>`) {
          lines.push(`${pad}${tok}${next}${next2}`);
          i += 3;
          continue;
        }
      }

      lines.push(`${pad}${tok}`);
      if (!selfClose) depth += 1;
      i += 1;
      continue;
    }

    lines.push(`${"  ".repeat(depth)}${tok}`);
    i += 1;
  }

  return lines.join("\n");
}
