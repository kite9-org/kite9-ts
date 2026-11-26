# Functional tests

Four Playwright projects (see `playwright.config.ts`):

- **display** — visual/layout fixtures with `expected/*.json` baselines (CI)
- **layout** — planarization/compaction constraint fixtures (CI; no baselines)
- **thorough** — legacy ADL XML under `thorough/fixtures/xml` (local)
- **performance** — sized generators + `metrics` in `result.json` (local)

Helpers live in `helpers/`. Prefer `checkLayout` (JSX) or `checkLayoutHtml` (string / converted XML).
