/** Replace with StylePropertyMap when Houdini matures. */
export type Styles = { [key: string]: string };

export function parseStyle(raw: string): Styles {
  const source = raw || "";
  const obj: Styles = {};

  getKeyValueChunks(source)
    .map((s) => s.trim())
    .filter(Boolean)
    .forEach((item) => {
      const pos = item.indexOf(":");
      if (pos < 0) return;
      const key = item.substring(0, pos).trim();
      const val = item.substring(pos + 1).trim();
      obj[key] = val;
    });

  return obj;
}

function getKeyValueChunks(raw: string): string[] {
  const chunks: string[] = [];
  let offset = 0;
  const sep = ";";
  const hasUnclosedUrl = /url\([^)]+$/;
  let chunk = "";
  let nextSplit: number;
  while (offset < raw.length) {
    nextSplit = raw.indexOf(sep, offset);
    if (nextSplit === -1) {
      nextSplit = raw.length;
    }

    chunk += raw.substring(offset, nextSplit);

    if (hasUnclosedUrl.test(chunk)) {
      chunk += ";";
      offset = nextSplit + 1;
      continue;
    }

    chunks.push(chunk);
    chunk = "";
    offset = nextSplit + 1;
  }

  return chunks;
}

export function formatStyle(map: Styles): string {
  return Object.keys(map)
    .map((k) => `${k}: ${map[k]};`)
    .join(" ");
}
