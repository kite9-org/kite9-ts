# `@kite9/layout`

Layout pipeline: RHD planarization + compaction → [`LayoutData`](../kite9-model/src/layout.ts).

Leaf sizes come from measured light-DOM hosts (`ElementSizer`), not the legacy `CompleteDisplayer`. Functional layout runs in Chromium (Playwright) so text metrics are real.

```ts
import { layout, DomElementSizer, type LayoutResult } from "@kite9/layout";

const result: LayoutResult = layout(diagram, new DomElementSizer());
// result.layout — serializable LayoutData
```

## Functional suites

| Suite | Path | CI / `pnpm test` | Notes |
| --- | --- | --- | --- |
| **display** | `test/functional/display/` | yes | Constraints + expected JSON baselines |
| **layout** | `test/functional/layout/` | yes | Constraints only (no baselines) |
| **thorough** | `test/functional/thorough/` | local | ADL XML fixtures → HTML |
| **performance** | `test/functional/performance/` | local | Timed generators + metrics in `result.json` |

```bash
pnpm playwright:install                               # once (workspace Chromium)
pnpm --filter @kite9/layout test                      # unit + display + layout
pnpm --filter @kite9/layout test:unit                 # vitest only
pnpm --filter @kite9/layout test:functional           # display + layout
pnpm --filter @kite9/layout test:display
pnpm --filter @kite9/layout test:layout
pnpm --filter @kite9/layout test:thorough             # local
pnpm --filter @kite9/layout test:performance          # local
pnpm --filter @kite9/layout test:functional:all       # all four projects
pnpm --filter @kite9/layout test:results              # browse outputs/ (tabs per suite)
```

Artifacts: `outputs/{display|layout|thorough|performance}/{suite}/{name}/`. The results UI has four tabs matching those suites; **Accept** only applies on Display baselines.
