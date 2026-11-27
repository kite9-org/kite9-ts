/**
 * Vite middleware: functional test results index, Accept API, and
 * `/outputs` / `/grid-outputs` / `/routes-outputs` artifact serving.
 */

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
import type { Plugin, ViteDevServer } from "vite";
import { classifyTestError } from "./fail-reason.js";
import {
  renderResultsIndex,
  renderSourceText,
  renderSourceView,
} from "./pages.js";

const previewRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const packages = path.resolve(previewRoot, "..");
const layoutPkg = path.resolve(packages, "kite9-layout");
const layoutOutputsRoot = path.join(layoutPkg, "outputs");
const layoutExpectedRoot = path.join(layoutPkg, "test/functional/expected");
const gridPkg = path.resolve(packages, "kite9-grid");
const gridOutputsRoot = path.join(gridPkg, "outputs");
const gridExpectedRoot = path.join(gridPkg, "test/functional/expected");
const routesPkg = path.resolve(packages, "kite9-routes");
const routesOutputsRoot = path.join(routesPkg, "outputs");
const routesExpectedRoot = path.join(routesPkg, "test/functional/expected");

const KINDS = [
  "display",
  "layout",
  "thorough",
  "performance",
  "grid",
  "routes",
] as const;
type FunctionalKind = (typeof KINDS)[number];

function isKind(s: string): s is FunctionalKind {
  return (KINDS as readonly string[]).includes(s);
}

function expectedRootFor(kind: FunctionalKind): string {
  if (kind === "grid") return gridExpectedRoot;
  if (kind === "routes") return routesExpectedRoot;
  return layoutExpectedRoot;
}

function resultDir(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  if (kind === "grid") return path.join(gridOutputsRoot, suite, name);
  if (kind === "routes") return path.join(routesOutputsRoot, suite, name);
  return path.join(layoutOutputsRoot, kind, suite, name);
}

function publicBase(
  kind: FunctionalKind,
  suite: string,
  name: string,
): string {
  if (kind === "grid") return `/grid-outputs/${suite}/${name}/${name}`;
  if (kind === "routes") return `/routes-outputs/${suite}/${name}/${name}`;
  return `/outputs/${kind}/${suite}/${name}/${name}`;
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

function canAcceptLayout(
  kind: FunctionalKind,
  suite: string,
  name: string,
): boolean {
  if (kind !== "display" && kind !== "grid" && kind !== "routes") return false;
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

  if (existsSync(routesOutputsRoot)) {
    for (const suite of readdirSync(routesOutputsRoot)) {
      const suiteDir = path.join(routesOutputsRoot, suite);
      if (!statSync(suiteDir).isDirectory() || suite.startsWith(".")) continue;
      scanKindSuite("routes", suite, suiteDir, rows);
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
  if (kind !== "display" && kind !== "grid" && kind !== "routes") {
    return { error: "Accept is only for display, grid, and routes baselines" };
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

function mountOutputsTree(
  server: ViteDevServer,
  urlPrefix: string,
  outputsRoot: string,
): void {
  const base = urlPrefix.endsWith("/") ? urlPrefix.slice(0, -1) : urlPrefix;
  server.middlewares.use(async (req, res, next) => {
    const raw = req.url ?? "";
    const q = raw.indexOf("?");
    const pathname = q >= 0 ? raw.slice(0, q) : raw;
    const search = q >= 0 ? raw.slice(q) : "";
    if (!pathname.startsWith(`${base}/`)) {
      next();
      return;
    }
    const rel = decodeURIComponent(pathname.slice(base.length + 1));
    if (rel.includes("..")) {
      res.statusCode = 400;
      res.end("Bad path");
      return;
    }
    const filePath = path.join(outputsRoot, rel);
    if (!existsSync(filePath) || !statSync(filePath).isFile()) {
      res.statusCode = 404;
      res.end("Not found");
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    if (ext === ".html") {
      try {
        const html = readFileSync(filePath, "utf8");
        const transformed = await server.transformIndexHtml(pathname, html);
        res.setHeader("Content-Type", "text/html; charset=utf-8");
        res.end(transformed);
      } catch (e) {
        res.statusCode = 500;
        res.end(e instanceof Error ? e.message : String(e));
      }
      return;
    }
    req.url = `/@fs${filePath}${search}`;
    next();
  });
}

/** Results index (`/results`), Accept API, source views, artifact trees. */
export function kite9ResultsPlugin(): Plugin {
  return {
    name: "kite9-preview-results",
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
        if (
          url === "/results" ||
          url === "/results/" ||
          url === "/results/index.html"
        ) {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(renderResultsIndex(scanResults()));
          return;
        }
        next();
      });

      mountOutputsTree(server, "/outputs", layoutOutputsRoot);
      mountOutputsTree(server, "/grid-outputs", gridOutputsRoot);
      mountOutputsTree(server, "/routes-outputs", routesOutputsRoot);
    },
  };
}

export { packages as previewPackagesRoot, previewRoot };
