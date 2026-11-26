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

type ResultRow = {
  suite: string;
  name: string;
  status: string;
  at: string;
  error?: string;
  /** Classified failure: constraint | mismatch | missing-expected | error */
  failKind?: string;
  /** Short failure label for the table. */
  failSummary?: string;
  /** Single-line failure detail. */
  failDetail?: string;
  viewUrl: string;
  /** Screenshot of the rendered diagram (SVG/HTML view), when present. */
  previewUrl?: string;
  /** RHD positions debug PNG, when present. */
  positionsUrl?: string;
  /** Compaction slideables debug PNG, when present. */
  compactionUrl?: string;
  /** Original light-DOM input (`kite9-diagram` fragment), when present. */
  sourceUrl?: string;
  /** Actual layout differs from (or is missing) expected — can accept. */
  canAccept: boolean;
};

function isSafeSegment(s: string): boolean {
  return /^[A-Za-z0-9_.-]+$/.test(s);
}

function actualLayoutPath(suite: string, name: string): string {
  return path.join(outputsRoot, suite, name, `${name}-layout.json`);
}

function expectedLayoutPath(name: string): string {
  return path.join(expectedRoot, `${name}.json`);
}

/** True when actual exists and expected is missing or JSON-unequal. */
function canAcceptLayout(suite: string, name: string): boolean {
  const actualPath = actualLayoutPath(suite, name);
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

function scanResults(): ResultRow[] {
  if (!existsSync(outputsRoot)) return [];
  const rows: ResultRow[] = [];

  for (const suite of readdirSync(outputsRoot)) {
    const suiteDir = path.join(outputsRoot, suite);
    if (!statSync(suiteDir).isDirectory() || suite.startsWith(".")) continue;

    for (const name of readdirSync(suiteDir)) {
      const dir = path.join(suiteDir, name);
      if (!statSync(dir).isDirectory()) continue;
      const html = path.join(dir, `${name}.html`);
      const metaFile = path.join(dir, "result.json");
      // Include runs that failed before artifacts (result.json only), e.g. layout constraints.
      if (!existsSync(html) && !existsSync(metaFile)) continue;

      let status = "unknown";
      let at = existsSync(html)
        ? statSync(html).mtime.toISOString()
        : statSync(metaFile).mtime.toISOString();
      let error: string | undefined;
      if (existsSync(metaFile)) {
        try {
          const meta = JSON.parse(readFileSync(metaFile, "utf8")) as {
            status?: string;
            at?: string;
            error?: string;
          };
          status = meta.status ?? status;
          at = meta.at ?? at;
          error = meta.error;
        } catch {
          /* ignore corrupt meta */
        }
      }

      const base = `/outputs/${suite}/${name}/${name}`;
      const png = path.join(dir, `${name}.png`);
      const positions = path.join(dir, `${name}-positions.png`);
      const compaction = path.join(dir, `${name}-compaction.png`);
      const inputHtml = path.join(dir, `${name}-input.html`);
      const classified =
        status === "failed" ? classifyTestError(error) : undefined;
      rows.push({
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
          ? `/source/${suite}/${name}`
          : undefined,
        canAccept: canAcceptLayout(suite, name),
      });
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

function acceptLayout(suite: string, name: string): { ok: true } | { error: string } {
  if (!isSafeSegment(suite) || !isSafeSegment(name)) {
    return { error: "Invalid suite or name" };
  }
  const actualPath = actualLayoutPath(suite, name);
  if (!existsSync(actualPath)) {
    return { error: `Actual layout missing: ${suite}/${name}` };
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

  const metaFile = path.join(outputsRoot, suite, name, "result.json");
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

        const sourceMatch = url?.match(/^\/source\/([^/]+)\/([^/]+)\/?$/);
        if (sourceMatch) {
          const suite = decodeURIComponent(sourceMatch[1]!);
          const name = decodeURIComponent(sourceMatch[2]!);
          if (!isSafeSegment(suite) || !isSafeSegment(name)) {
            res.statusCode = 400;
            res.end("Invalid suite or name");
            return;
          }
          const inputPath = path.join(
            outputsRoot,
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
              const { suite, name } = (body ?? {}) as {
                suite?: string;
                name?: string;
              };
              if (!suite || !name) {
                sendJson(res, 400, { error: "suite and name required" });
                return;
              }
              const result = acceptLayout(suite, name);
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
