# `@kite9/layout`

Layout pipeline: RHD planarization + compaction → [`LayoutData`](../kite9-model/src/layout.ts).

Leaf sizes come from measured light-DOM hosts (`ElementSizer`), not the legacy `CompleteDisplayer`. Functional layout runs in Chromium (Playwright) so text metrics are real.

```ts
import { layout, DomElementSizer, type LayoutResult } from "@kite9/layout";

const result: LayoutResult = layout(diagram, new DomElementSizer());
// result.layout — serializable LayoutData
```

```bash
pnpm playwright:install                               # once (workspace Chromium for Playwright 1.65)
pnpm --filter @kite9/layout test                      # unit (vitest) + functional (Playwright)
pnpm --filter @kite9/layout test:unit                 # vitest only
pnpm --filter @kite9/layout test:functional           # Chromium layout + expected JSON
pnpm --filter @kite9/layout test:results              # browse outputs/
```

Functional specs (`*.spec.tsx`) call `checkLayout(name, jsx)` which runs layout in Chromium, applies `LayoutChecks` (Java `TestingEngine` / `AbstractLayoutFunctionalTest` defaults), then compares against `expected/<name>.json`. Override flags via `checkLayout(name, jsx, { checks: { … } })`. Changing the diagram or label will fail until you update that expected file (copy from `outputs/.../*-layout.json`). Artifacts land under `outputs/`; each `*.html` viewer applies the sibling `*-layout.json`.
