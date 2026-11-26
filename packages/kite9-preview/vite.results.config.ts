import {
  readdirSync,
  readFileSync,
  existsSync,
  statSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";
import { classifyTestError } from "./results/fail-reason.js";
import {
  renderResultsIndex,
  renderSourceText,
  renderSourceView,
} from "./results/pages.js";

const previewRoot = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(previewRoot, "..");
/** Functional outputs live in `@kite9/layout`; this server browses them with edit/resize. */
const layoutPkg = path.resolve(packages, "kite9-layout");
const outputsRoot = path.join(layoutPkg, "outputs");
const expectedRoot = path.join(layoutPkg, "test/functional/expected");

const KINDS = ["display", "layout", "thorough", "performance"] as const;
type FunctionalKind = (typeof KINDS)[number];

function isKind(s: string): s is FunctionalKind {
  return (KINDS as readonly string[]).includes(s);
}

type ResultRow = {
  kind: FunctionalKind;
  suite: string;
  name: string;
  status: string;
  at: string;
  error?: string;
  failKind?: string;
  failSummary?: string;
  failDetail?: string;
  viewUrl: string;
  previewUrl?: string;
  positionsUrl?: string;
  compactionUrl?: string;
  sourceUrl?: string;
  canAccept: boolean;
  metrics?: {
    totalMs?: number;
    connecteds?: number;
    connections?: number;
  };
};

function isSafeSegment(s: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(s);
}

function actualLayoutPath(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  return path.join(outputsRoot, kind, suite, name, `${name}-layout.json`);
}

function expectedLayoutPath(name: string): string {
  return path.join(expectedRoot, `${name}.json`);
}

/** Display baselines only — Accept promotes actual → expected. */
function canAcceptLayout(
  kind: FunctionalKind,
  suite: string,
  name: string,
): boolean {
  if (kind !== "display") return false;
  const actualPath = actualLayoutPath(kind, suite, name);
  if (!existsSync(actualPath)) return false;
  const expectedPath = expectedLayoutPath(name);
  if (!existsSync(expectedPath)) return true;
  try {
    const actual = JSON.parse(readFileSync(actualPath, "utf8"));
    const expected = JSON.parse(readFileSync(expectedPath, "utf8"));
    return JSON.stringify(actual) !== JSON.stringify(expected);
  } catch {
    return true;
  }
}

function scanKindSuite(
  kind: FunctionalKind,
  suite: string,
  suiteDir: string,
  rows: ResultRow[],
): void {
  for (const name of readdirSync(suiteDir)) {
    const dir = path.join(suiteDir, name);
    if (!statSync(dir).isDirectory()) continue;
    const html = path.join(dir, `${name}.html`);
    const metaFile = path.join(dir, "result.json");
    if (!existsSync(html) && !existsSync(metaFile)) continue;

    let status = "unknown";
    let at = existsSync(html)
      ? statSync(html).mtime.toISOString()
      : statSync(metaFile).mtime.toISOString();
    let error: string | undefined;
    let metrics: ResultRow["metrics"];
    if (existsSync(metaFile)) {
      try {
        const meta = JSON.parse(readFileSync(metaFile, "utf8")) as {
          status?: string;
          at?: string;
          error?: string;
          metrics?: ResultRow["metrics"];
        };
        status = meta.status ?? status;
        at = meta.at ?? at;
        error = meta.error;
        metrics = meta.metrics;
      } catch {
        /* ignore corrupt meta */
      }
    }

    const base = `/outputs/${kind}/${suite}/${name}/${name}`;
    const png = path.join(dir, `${name}.png`);
    const positions = path.join(dir, `${name}-positions.png`);
    const compaction = path.join(dir, `${name}-compaction.png`);
    const inputHtml = path.join(dir, `${name}-input.html`);
    const classified =
      status === "failed" ? classifyTestError(error) : undefined;
    rows.push({
      kind,
      suite,
      name,
      status,
      at,
      error,
      failKind: classified?.kind,
      failSummary: classified?.summary,
      failDetail: classified?.detail,
      viewUrl: existsSync(html) ? `${base}.html` : "",
      previewUrl: existsSync(png) ? `${base}.png` : undefined,
      positionsUrl: existsSync(positions) ? `${base}-positions.png` : undefined,
      compactionUrl: existsSync(compaction)
        ? `${base}-compaction.png`
        : undefined,
      sourceUrl: existsSync(inputHtml)
        ? `/source/${kind}/${suite}/${name}`
        : undefined,
      canAccept: canAcceptLayout(kind, suite, name),
      metrics,
    });
  }
}

function scanResults(): ResultRow[] {
  if (!existsSync(outputsRoot)) return [];
  const rows: ResultRow[] = [];

  for (const kindName of readdirSync(outputsRoot)) {
    const kindDir = path.join(outputsRoot, kindName);
    if (!statSync(kindDir).isDirectory() || kindName.startsWith(".")) continue;
    if (!isKind(kindName)) continue;

    for (const suite of readdirSync(kindDir)) {
      const suiteDir = path.join(kindDir, suite);
      if (!statSync(suiteDir).isDirectory() || suite.startsWith(".")) continue;
      scanKindSuite(kindName, suite, suiteDir, rows);
    }
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return rows;
}

function readJsonBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c: Buffer) => chunks.push(c));
    req.on("end", () => {
      try {
        const raw = Buffer.concat(chunks).toString("utf8");
        resolve(raw ? JSON.parse(raw) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

function acceptLayout(
  kind: FunctionalKind,
  suite: string,
  name: string,
): { ok: true } | { error: string } {
  if (kind !== "display") {
    return { error: "Accept is only for display baselines" };
  }
  if (!isSafeSegment(suite) || !isSafeSegment(name)) {
    return { error: "Invalid suite or name" };
  }
  const actualPath = actualLayoutPath(kind, suite, name);
  if (!existsSync(actualPath)) {
    return { error: `Actual layout missing: ${kind}/${suite}/${name}` };
  }
  let layout: unknown;
  try {
    layout = JSON.parse(readFileSync(actualPath, "utf8"));
  } catch {
    return { error: "Actual layout is not valid JSON" };
  }

  mkdirSync(expectedRoot, { recursive: true });
  writeFileSync(
    expectedLayoutPath(name),
    `${JSON.stringify(layout, null, 2)}\n`,
    "utf8",
  );

  const metaFile = path.join(
    outputsRoot,
    kind,
    suite,
    name,
    "result.json",
  );
  if (existsSync(metaFile)) {
    try {
      const meta = JSON.parse(readFileSync(metaFile, "utf8")) as Record<
        string,
        unknown
      >;
      meta.status = "passed";
      delete meta.error;
      meta.at = new Date().toISOString();
      writeFileSync(metaFile, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    } catch {
      /* leave meta alone */
    }
  }

  return { ok: true };
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(body));
}

function resultsIndexPlugin(): Plugin {
  return {
    name: "kite9-preview-results-index",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const rawUrl = req.url ?? "";
        const url = rawUrl.split("?")[0];
        const qs = new URL(rawUrl, "http://local").searchParams;

        const sourceMatch = url?.match(
          /^\/source\/([^/]+)\/([^/]+)\/([^/]+)\/?$/,
        );
        if (sourceMatch) {
          const kind = decodeURIComponent(sourceMatch[1]!);
          const suite = decodeURIComponent(sourceMatch[2]!);
          const name = decodeURIComponent(sourceMatch[3]!);
          if (
            !isKind(kind) ||
            !isSafeSegment(suite) ||
            !isSafeSegment(name)
          ) {
            res.statusCode = 400;
            res.end("Invalid kind, suite, or name");
            return;
          }
          const inputPath = path.join(
            outputsRoot,
            kind,
            suite,
            name,
            `${name}-input.html`,
          );
          if (!existsSync(inputPath)) {
            res.statusCode = 404;
            res.end("Input HTML missing");
            return;
          }
          const fragment = readFileSync(inputPath, "utf8");
          if (qs.get("format") === "text") {
            res.setHeader("Content-Type", "text/plain; charset=utf-8");
            res.end(renderSourceText(fragment));
            return;
          }
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(renderSourceView(suite, name, fragment));
          return;
        }

        if (url === "/api/accept" && req.method === "POST") {
          void readJsonBody(req)
            .then((body) => {
              const { kind, suite, name } = (body ?? {}) as {
                kind?: string;
                suite?: string;
                name?: string;
              };
              if (!kind || !suite || !name || !isKind(kind)) {
                sendJson(res, 400, {
                  error: "kind, suite and name required",
                });
                return;
              }
              const result = acceptLayout(kind, suite, name);
              if ("error" in result) {
                sendJson(res, 400, result);
                return;
              }
              sendJson(res, 200, result);
            })
            .catch((e) => {
              sendJson(res, 400, {
                error: e instanceof Error ? e.message : String(e),
              });
            });
          return;
        }

        if (url === "/api/results") {
          sendJson(res, 200, scanResults());
          return;
        }
        if (url === "/" || url === "/index.html") {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(renderResultsIndex(scanResults()));
          return;
        }
        next();
      });
    },
  };
}

/** Serve `@kite9/layout` functional `outputs/` + pass/fail index (edit/resize via bootScene). */
export default defineConfig({
  root: layoutPkg,
  publicDir: false,
  appType: "mpa",
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "preact",
  },
  server: {
    host: "127.0.0.1",
    port: 5175,
    strictPort: true,
    open: "/",
    fs: { allow: [packages] },
  },
  plugins: [resultsIndexPlugin()],
  resolve: {
    alias: [
      {
        find: "@kite9/preview",
        replacement: path.resolve(previewRoot, "src/index.ts"),
      },
      {
        find: "@kite9/test-template",
        replacement: path.resolve(packages, "kite9-test-template/src/index.ts"),
      },
      {
        find: "@kite9/templating",
        replacement: path.resolve(packages, "kite9-templating/src/index.ts"),
      },
      {
        find: "@kite9/model",
        replacement: path.resolve(packages, "kite9-model/src/index.ts"),
      },
      {
        find: "@kite9/css",
        replacement: path.resolve(packages, "kite9-css/src/index.ts"),
      },
      {
        find: "@kite9/ui",
        replacement: path.resolve(packages, "kite9-ui/src/index.ts"),
      },
      {
        find: "@kite9/command",
        replacement: path.resolve(packages, "kite9-command/src/index.ts"),
      },
      {
        find: "@kite9/ui-behaviours/selectable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/selectable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/actionable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/actionable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/styleable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/styleable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours/resizable",
        replacement: path.resolve(
          packages,
          "kite9-ui-behaviours/src/resizable/index.ts",
        ),
      },
      {
        find: "@kite9/ui-behaviours",
        replacement: path.resolve(packages, "kite9-ui-behaviours/src/index.ts"),
      },
      {
        find: "@kite9/layout",
        replacement: path.resolve(layoutPkg, "src/index.ts"),
      },
    ],
  },
});
