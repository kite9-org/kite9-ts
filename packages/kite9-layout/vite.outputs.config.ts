import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const packages = path.resolve(rootDir, "..");
const outputsRoot = path.join(rootDir, "outputs");

type ResultRow = {
  suite: string;
  name: string;
  status: string;
  at: string;
  error?: string;
  viewUrl: string;
};

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
      if (!existsSync(html)) continue;

      let status = "unknown";
      let at = statSync(html).mtime.toISOString();
      let error: string | undefined;
      const metaFile = path.join(dir, "result.json");
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

      rows.push({
        suite,
        name,
        status,
        at,
        error,
        viewUrl: `/outputs/${suite}/${name}/${name}.html`,
      });
    }
  }

  rows.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
  return rows;
}

function resultsIndexHtml(rows: ResultRow[]): string {
  const items = rows
    .map((r) => {
      const when = new Date(r.at).toLocaleString();
      const err = r.error
        ? `<div class="err">${escapeHtml(r.error)}</div>`
        : "";
      return `<li class="row ${escapeHtml(r.status)}">
  <a href="${escapeHtml(r.viewUrl)}"><strong>${escapeHtml(r.name)}</strong></a>
  <span class="suite">${escapeHtml(r.suite)}</span>
  <span class="status">${escapeHtml(r.status)}</span>
  <time datetime="${escapeHtml(r.at)}">${escapeHtml(when)}</time>
  ${err}
</li>`;
    })
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>@kite9/layout test results</title>
    <style>
      :root { color-scheme: light; font-family: system-ui, sans-serif; color: #0f172a; }
      body { margin: 0; padding: 1.5rem; background: #f8fafc; }
      h1 { margin: 0 0 0.35rem; font-size: 1.25rem; font-weight: 600; }
      p.lead { margin: 0 0 1.25rem; color: #64748b; font-size: 0.95rem; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.5rem; }
      .row {
        display: grid;
        grid-template-columns: minmax(10rem, 1.4fr) minmax(8rem, 1fr) 5.5rem minmax(10rem, 1fr);
        gap: 0.5rem 1rem; align-items: baseline;
        padding: 0.75rem 1rem; background: #fff;
        border: 1px solid #e2e8f0; border-radius: 8px;
      }
      .row a { color: #1d4ed8; text-decoration: none; }
      .row a:hover { text-decoration: underline; }
      .suite { color: #64748b; font-size: 0.9rem; }
      .status { font-weight: 600; text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.04em; }
      .passed .status { color: #15803d; }
      .failed .status { color: #b91c1c; }
      .unknown .status { color: #a16207; }
      time { color: #475569; font-size: 0.9rem; }
      .err { grid-column: 1 / -1; color: #b91c1c; font-size: 0.85rem; white-space: pre-wrap; }
      .empty { color: #64748b; }
    </style>
  </head>
  <body>
    <h1>Layout test results</h1>
    <p class="lead">Functional outputs under <code>outputs/</code>. Open a run to view the diagram with saved layout JSON.</p>
    ${
      rows.length === 0
        ? `<p class="empty">No outputs yet. Run <code>pnpm test</code> first.</p>`
        : `<ul>${items}</ul>`
    }
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function resultsIndexPlugin(): Plugin {
  return {
    name: "kite9-layout-results-index",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = req.url?.split("?")[0];
        if (url === "/api/results") {
          res.setHeader("Content-Type", "application/json; charset=utf-8");
          res.end(JSON.stringify(scanResults(), null, 2));
          return;
        }
        if (url === "/" || url === "/index.html") {
          res.setHeader("Content-Type", "text/html; charset=utf-8");
          res.end(resultsIndexHtml(scanResults()));
          return;
        }
        next();
      });
    },
  };
}

/** Serve functional-test `outputs/` + a pass/fail results index. */
export default defineConfig({
  root: rootDir,
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
  },
  plugins: [resultsIndexPlugin()],
  resolve: {
    alias: [
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
        find: "@kite9/layout",
        replacement: path.resolve(rootDir, "src/index.ts"),
      },
    ],
  },
});
