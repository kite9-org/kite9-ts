/** Client script for the functional results index page. */

type ResultRow = {
  suite: string;
  name: string;
  status: string;
  at: string;
  error?: string;
  viewUrl: string;
  previewUrl?: string;
  positionsUrl?: string;
  compactionUrl?: string;
  sourceUrl?: string;
  canAccept: boolean;
};

const STORAGE_KEY = "kite9-layout-results-sort";
const allowed = new Set(["name", "status", "at"]);

const ICON_DIAGRAM =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="3" width="5" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="9" width="5" height="4" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M7 5h3v5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
const ICON_POSITIONS =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="5" height="12" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><rect x="9" y="2" width="5" height="7" rx="1" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M4.5 5h0M4.5 8h0M11.5 5h0" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>';
const ICON_COMPACTION =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 4h12M2 8h12M2 12h12M5 2v12M11 2v12" fill="none" stroke="currentColor" stroke-width="1.3"/><path d="M5 8l2-2 2 2 2-2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_SOURCE =
  '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3L1 8l4 5M11 3l4 5-4 5M9 2L7 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const dataEl = document.getElementById("results-data");
const rows = JSON.parse(dataEl?.textContent ?? "[]") as ResultRow[];
const list = document.getElementById("results")!;
const emptyEl = document.getElementById("empty")!;
const tableWrap = document.getElementById("table-wrap")!;
const buttons = [...document.querySelectorAll<HTMLButtonElement>("[data-sort]")];
const preview = document.getElementById("preview")!;
const previewImg = preview.querySelector("img")!;
const previewCode = preview.querySelector<HTMLPreElement>(".preview-code")!;
let previewSeq = 0;

function loadSort(): { sortKey: string; sortDir: number } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sortKey: "at", sortDir: -1 };
    const parsed = JSON.parse(raw) as { sortKey?: string; sortDir?: number };
    const sortKey = allowed.has(parsed.sortKey ?? "") ? parsed.sortKey! : "at";
    const sortDir =
      parsed.sortDir === 1 || parsed.sortDir === -1 ? parsed.sortDir : -1;
    return { sortKey, sortDir };
  } catch {
    return { sortKey: "at", sortDir: -1 };
  }
}

function saveSort(): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ sortKey, sortDir }));
}

let { sortKey, sortDir } = loadSort();

function esc(s: string): string {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function cmp(a: ResultRow, b: ResultRow): number {
  const key = sortKey as keyof ResultRow;
  const av = (a[key] as string | undefined) ?? "";
  const bv = (b[key] as string | undefined) ?? "";
  if (av < bv) return -1 * sortDir;
  if (av > bv) return 1 * sortDir;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

function placePreview(clientX: number, clientY: number): void {
  const pad = 14;
  const rect = preview.getBoundingClientRect();
  let left = clientX + pad;
  let top = clientY + pad;
  if (left + rect.width > window.innerWidth - 8) {
    left = clientX - rect.width - pad;
  }
  if (top + rect.height > window.innerHeight - 8) {
    top = clientY - rect.height - pad;
  }
  preview.style.left = `${Math.max(8, left)}px`;
  preview.style.top = `${Math.max(8, top)}px`;
}

function hidePreview(): void {
  previewSeq += 1;
  preview.style.display = "none";
  previewImg.hidden = true;
  previewImg.removeAttribute("src");
  previewCode.hidden = true;
  previewCode.textContent = "";
}

function showImagePreview(url: string, clientX: number, clientY: number): void {
  const seq = ++previewSeq;
  previewCode.hidden = true;
  previewCode.textContent = "";
  previewImg.hidden = true;
  previewImg.onload = () => {
    if (seq !== previewSeq) return;
    previewImg.hidden = false;
    preview.style.display = "block";
    placePreview(clientX, clientY);
  };
  previewImg.onerror = () => {
    if (seq === previewSeq) hidePreview();
  };
  previewImg.src = url;
}

async function showCodePreview(
  url: string,
  clientX: number,
  clientY: number,
): Promise<void> {
  const seq = ++previewSeq;
  previewImg.hidden = true;
  previewImg.removeAttribute("src");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.statusText);
    const text = await res.text();
    if (seq !== previewSeq) return;
    previewCode.textContent = text;
    previewCode.hidden = false;
    preview.style.display = "block";
    placePreview(clientX, clientY);
  } catch {
    if (seq === previewSeq) hidePreview();
  }
}

function bindPreview(): void {
  for (const a of list.querySelectorAll("[data-preview]")) {
    a.addEventListener("mouseenter", (e) => {
      const url = a.getAttribute("data-preview");
      if (!url) return;
      const me = e as MouseEvent;
      const kind = a.getAttribute("data-preview-kind") ?? "image";
      if (kind === "code") {
        void showCodePreview(url, me.clientX, me.clientY);
      } else {
        showImagePreview(url, me.clientX, me.clientY);
      }
    });
    a.addEventListener("mousemove", (e) => {
      if (preview.style.display === "block") {
        placePreview((e as MouseEvent).clientX, (e as MouseEvent).clientY);
      }
    });
    a.addEventListener("mouseleave", hidePreview);
  }
}

async function acceptRow(row: ResultRow, btn: HTMLButtonElement): Promise<void> {
  btn.disabled = true;
  try {
    const res = await fetch("/api/accept", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suite: row.suite, name: row.name }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok || body.error) {
      throw new Error(body.error || res.statusText || "Accept failed");
    }
    row.canAccept = false;
    row.status = "passed";
    delete row.error;
    row.at = new Date().toISOString();
    render();
  } catch (e) {
    btn.disabled = false;
    alert(e instanceof Error ? e.message : String(e));
  }
}

function bindAccept(): void {
  for (const btn of list.querySelectorAll<HTMLButtonElement>("button.accept")) {
    btn.addEventListener("click", () => {
      const suite = btn.getAttribute("data-suite");
      const name = btn.getAttribute("data-name");
      const row = rows.find((r) => r.suite === suite && r.name === name);
      if (row) void acceptRow(row, btn);
    });
  }
}

function viewIcon(
  href: string | undefined,
  previewUrl: string | undefined,
  title: string,
  icon: string,
  previewKind: "image" | "code" = "image",
): string {
  if (!href) {
    return `<span class="view-icon" aria-disabled="true" title="${esc(title)} (missing)">${icon}</span>`;
  }
  const previewAttr = previewUrl
    ? ` data-preview="${esc(previewUrl)}" data-preview-kind="${previewKind}"`
    : "";
  return `<a class="view-icon" href="${esc(href)}" title="${esc(title)}" aria-label="${esc(title)}"${previewAttr}>${icon}</a>`;
}

function render(): void {
  if (rows.length === 0) {
    emptyEl.hidden = false;
    tableWrap.hidden = true;
    return;
  }
  emptyEl.hidden = true;
  tableWrap.hidden = false;

  const sorted = [...rows].sort(cmp);
  list.innerHTML = sorted
    .map((r) => {
      const when = new Date(r.at).toLocaleString();
      const err = r.error ? `<div class="err">${esc(r.error)}</div>` : "";
      const action = r.canAccept
        ? `<button type="button" class="accept" data-suite="${esc(r.suite)}" data-name="${esc(r.name)}">Accept</button>`
        : `<span class="accept-slot"></span>`;
      const sourcePreview = r.sourceUrl
        ? `${r.sourceUrl}?format=text`
        : undefined;
      const views = `<span class="views">
  ${viewIcon(r.viewUrl, r.previewUrl, "Diagram", ICON_DIAGRAM)}
  ${viewIcon(r.positionsUrl, r.positionsUrl, "Positions", ICON_POSITIONS)}
  ${viewIcon(r.compactionUrl, r.compactionUrl, "Compaction", ICON_COMPACTION)}
  ${viewIcon(r.sourceUrl, sourcePreview, "Source HTML", ICON_SOURCE, "code")}
</span>`;
      return `<li class="row cols ${esc(r.status)}">
  <div class="name-cell">
    <a class="name" href="${esc(r.viewUrl)}"><strong>${esc(r.name)}</strong></a>
    ${views}
  </div>
  <span class="status">${esc(r.status)}</span>
  <time datetime="${esc(r.at)}">${esc(when)}</time>
  ${action}
  ${err}
</li>`;
    })
    .join("\n");

  for (const btn of buttons) {
    const active = btn.dataset.sort === sortKey;
    btn.classList.toggle("active", active);
    const dir = btn.querySelector(".dir");
    if (dir) dir.textContent = active ? (sortDir > 0 ? "↑" : "↓") : "";
  }
  hidePreview();
  bindPreview();
  bindAccept();
}

for (const btn of buttons) {
  btn.addEventListener("click", () => {
    const key = btn.dataset.sort;
    if (!key || !allowed.has(key)) return;
    if (sortKey === key) sortDir *= -1;
    else {
      sortKey = key;
      sortDir = key === "at" ? -1 : 1;
    }
    saveSort();
    render();
  });
}

render();
