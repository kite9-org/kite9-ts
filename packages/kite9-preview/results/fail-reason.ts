/** Classify functional-test failure messages for the results index. */

export type FailKind =
  | "constraint"
  | "mismatch"
  | "missing-expected"
  | "error";

export type ClassifiedFail = {
  kind: FailKind;
  summary: string;
  detail: string;
};

function primaryLine(raw: string): string {
  const withoutEval = raw.replace(/^page\.evaluate:\s*/i, "").trim();
  const line =
    withoutEval
      .split("\n")
      .map((l) => l.trim())
      .find((l) => l.length > 0 && !/^at\s/.test(l)) ?? withoutEval;
  return line.replace(/^LayoutCheckError:\s*/i, "").trim();
}

export function classifyTestError(
  raw: string | undefined,
): ClassifiedFail | undefined {
  if (!raw?.trim()) return undefined;
  const detail = primaryLine(raw);

  if (/No expected layout for/i.test(detail)) {
    return {
      kind: "missing-expected",
      summary: "No baseline",
      detail: "No expected layout yet — Accept to create a baseline",
    };
  }

  if (
    /LayoutCheckError/i.test(raw) ||
    /^(occlusion|placements overlap|connection |connected |contentCol|contentRow|placement |Diagram Elements)/i.test(
      detail,
    )
  ) {
    const head = detail.split(":")[0]?.trim() || "layout";
    return {
      kind: "constraint",
      summary: `Constraint · ${head}`,
      detail,
    };
  }

  if (
    /toEqual|toStrictEqual|deeply equal|Expected:|Received:|Snapshot/i.test(raw)
  ) {
    return {
      kind: "mismatch",
      summary: "Expected mismatch",
      detail: "Actual layout differs from expected JSON",
    };
  }

  // Engine threw before layout checks finished (LogicException, TypeError, …).
  if (/LogicException|TypeError|ReferenceError|RangeError/i.test(raw)) {
    const msg = detail
      .replace(/^(LogicException|TypeError|ReferenceError|RangeError):\s*/i, "")
      .trim();
    const short = msg.length > 56 ? `${msg.slice(0, 53)}…` : msg;
    return {
      kind: "error",
      summary: `Engine · ${short}`,
      detail: msg,
    };
  }

  return {
    kind: "error",
    summary: detail.length > 72 ? `${detail.slice(0, 69)}…` : detail,
    detail,
  };
}
