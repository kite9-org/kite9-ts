# Functional tests

Four Playwright projects (see `playwright.config.ts`):

- **display** — visual/layout fixtures with `expected/*.json` baselines (CI)
- **layout** — planarization/compaction constraint fixtures (CI; no baselines)
- **thorough** — HTML fixtures under `thorough/fixtures/*.html` (local)
- **performance** — sized generators + `metrics` in `result.json` (local)

Helpers live in `helpers/`. Prefer `checkLayout` (JSX) or `checkLayoutHtml` (HTML string).
`adl-xml-to-html.ts` remains available if another ADL XML dump needs converting.
