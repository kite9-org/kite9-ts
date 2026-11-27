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
/** Layout functional outputs (`display` / `layout` / …). */
const layoutPkg = path.resolve(packages, "kite9-layout");
const layoutOutputsRoot = path.join(layoutPkg, "outputs");
const layoutExpectedRoot = path.join(layoutPkg, "test/functional/expected");
/** Grid functional outputs (flat `outputs/{suite}/{name}/`). */
const gridPkg = path.resolve(packages, "kite9-grid");
const gridOutputsRoot = path.join(gridPkg, "outputs");
const gridExpectedRoot = path.join(gridPkg, "test/functional/expected");

const KINDS = ["display", "layout", "thorough", "performance", "grid"] as const;
type FunctionalKind = (typeof KINDS)[number];

function isKind(s: string): s is FunctionalKind {
  return (KINDS as readonly string[]).includes(s);
}

function expectedRootFor(kind: FunctionalKind): string {
  return kind === "grid" ? gridExpectedRoot : layoutExpectedRoot;
}

/** Absolute dir for a result: layout nests kind; grid does not. */
function resultDir(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  return kind === "grid"
    ? path.join(gridOutputsRoot, suite, name)
    : path.join(layoutOutputsRoot, kind, suite, name);
}

/** Public URL prefix for artifacts. */
function publicBase(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  return kind === "grid"
    ? `/grid-outputs/${suite}/${name}/${name}`
    : `/outputs/${kind}/${suite}/${name}/${name}`;
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
  return path.join(resultDir(kind, suite, name), `${name}-layout.json`);
}

function expectedLayoutPath(kind: FunctionalKind, name: string): string {
  return path.join(expectedRootFor(kind), `${name}.json`);
}

/** Display + Grid baselines — Accept promotes actual → expected. */
function canAcceptLayout(
  kind: FunctionalKind,
  suite: string,
  name: string,
): boolean {
  if (kind !== "display" && kind !== "grid") return false;
  const actualPath = actualLayoutPath(kind, suite, name);
  if (!existsSync(actualPath)) return false;
  const expectedPath = expectedLayoutPath(kind, name);
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

    const base = publicBase(kind, suite, name);
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
  const rows: ResultRow[] = [];

  if (existsSync(layoutOutputsRoot)) {
    for (const kindName of readdirSync(layoutOutputsRoot)) {
      const kindDir = path.join(layoutOutputsRoot, kindName);
      if (!statSync(kindDir).isDirectory() || kindName.startsWith(".")) continue;
      if (!isKind(kindName) || kindName === "grid") continue;
      for (const suite of readdirSync(kindDir)) {
        const suiteDir = path.join(kindDir, suite);
        if (!statSync(suiteDir).isDirectory() || suite.startsWith(".")) continue;
        scanKindSuite(kindName, suite, suiteDir, rows);
      }
    }
  }

  if (existsSync(gridOutputsRoot)) {
    for (const suite of readdirSync(gridOutputsRoot)) {
      const suiteDir = path.join(gridOutputsRoot, suite);
      if (!statSync(suiteDir).isDirectory() || suite.startsWith(".")) continue;
      scanKindSuite("grid", suite, suiteDir, rows);
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
  if (kind !== "display" && kind !== "grid") {
    return { error: "Accept is only for display and grid baselines" };
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

  const expectedRoot = expectedRootFor(kind);
  mkdirSync(expectedRoot, { recursive: true });
  writeFileSync(
    expectedLayoutPath(kind, name),
    `${JSON.stringify(layout, null, 2)}\n`,
    "utf8",
  );

  const metaFile = path.join(resultDir(kind, suite, name), "result.json");
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
            resultDir(kind, suite, name),
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

/** Serve layout + grid functional `outputs/` + pass/fail index (edit/resize via bootScene). */
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
  plugins: [
    resultsIndexPlugin(),
    {
      /**
       * Serve `@kite9/grid` outputs at `/grid-outputs/...`.
       * HTML goes through `transformIndexHtml` so `bootScene` / JSON imports
       * resolve (same as layout views under Vite root `/outputs/`).
       * Other assets rewrite to `/@fs/...` for module graph + static files.
       */
      name: "kite9-grid-outputs",
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          const raw = req.url ?? "";
          const q = raw.indexOf("?");
          const pathname = q >= 0 ? raw.slice(0, q) : raw;
          const search = q >= 0 ? raw.slice(q) : "";
          if (!pathname.startsWith("/grid-outputs/")) {
            next();
            return;
          }
          const rel = decodeURIComponent(pathname.slice("/grid-outputs/".length));
          if (rel.includes("..")) {
            res.statusCode = 400;
            res.end("Bad path");
            return;
          }
          const filePath = path.join(gridOutputsRoot, rel);
          if (!existsSync(filePath) || !statSync(filePath).isFile()) {
            res.statusCode = 404;
            res.end("Not found");
            return;
          }
          const ext = path.extname(filePath).toLowerCase();
          if (ext === ".html") {
            try {
              const html = readFileSync(filePath, "utf8");
              const transformed = await server.transformIndexHtml(
                pathname,
                html,
              );
              res.setHeader("Content-Type", "text/html; charset=utf-8");
              res.end(transformed);
            } catch (e) {
              res.statusCode = 500;
              res.end(e instanceof Error ? e.message : String(e));
            }
            return;
          }
          // JSON/PNG/etc. — let Vite serve via /@fs (JSON imports need this).
          req.url = `/@fs${filePath}${search}`;
          next();
        });
      },
    },
  ],
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
