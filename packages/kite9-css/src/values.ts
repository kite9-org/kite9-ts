/**
 * Convert a SCREAMING_SNAKE enum member name (or value) to lowercase kebab-case CSS.
 * `CONNECTED_RECTANGULAR` → `connected-rectangular`
 */
export function toCssValue(value: string): string {
  return value.trim().toLowerCase().replace(/_/g, "-");
}

/**
 * Normalize a CSS enum token for lookup: trim, lowercase, unify separators to `_`
 * so it can match TypeScript enum values.
 */
export function normalizeCssToken(raw: string): string {
  return raw.trim().toLowerCase().replace(/-/g, "_");
}

/**
 * Parse a CSS enum token against a string-enum object.
 * Returns null for empty, `none`, or unknown values.
 */
export function fromCssValue<T extends string>(
  raw: string | null | undefined,
  enumObject: Record<string, T>,
): T | null {
  if (raw == null) return null;
  const token = normalizeCssToken(raw);
  if (!token || token === "none") return null;

  const upper = token.toUpperCase();
  if (upper in enumObject) {
    return enumObject[upper] as T;
  }

  for (const v of Object.values(enumObject)) {
    if (normalizeCssToken(v) === token) return v;
  }

  return null;
}

/** Build a Houdini-style syntax string from enum values: `a | b | c`. */
export function enumSyntax(
  enumObject: Record<string, string>,
  extra: string[] = [],
): string {
  const parts = [
    ...Object.values(enumObject).map(toCssValue),
    ...extra.map(toCssValue),
  ];
  return [...new Set(parts)].join(" | ");
}
