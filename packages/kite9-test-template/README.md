# `@kite9/test-template`

A simple test template and fixture data for Kite9 diagram display.  Designed to allow for testing of ui behaviours using Playwright.

```bash
pnpm --filter @kite9/preview start
```

## What’s in the package

| Path | Role |
| --- | --- |
| `fixtures/grid/` | Placeholder layout (tracks, placements, routes) |
| `fixtures/json/` | Expected `serializeDiagram` snapshots for unit tests |
| `fixtures/e2e/` | Playwright helpers + shared Vite e2e config factory |
| `src/fixtures/card-diagram.tsx` | Canonical card light-DOM markup (`mountCardDiagram`) |
| `src/fixtures/empty-diagram.tsx` | Canonical empty light-DOM markup (`mountEmptyDiagram`) |
| `src/fixtures/boot-card-edit.ts` | Card + behaviours boot for e2e |
| `src/templates/` | Per-tag chrome (`index.tsx` + `styles.css`) |
| `src/pack.ts` | `testTemplatePack` — tag → type + HTML / SVG / defs painters |
| `src/apply-layout.ts` | `applyLayout` — paint grid + routes onto a scene |
| `test/model-from-html.test.ts` | HTML light DOM → model JSON |
| `test/shadow-layout.test.ts` | HTML + grid → shadow chrome + layout |

Tag coverage (`card`): `kite9-diagram`, `kite9-glyph`, `kite9-container`, `kite9-arrow`, `kite9-key`, `kite9-link`, `kite9-from-label` / `kite9-to-label`, `kite9-socket`. Host `label` attributes are chrome-only, not model `Label`s.

### Behaviour Playwright e2e

Shared harness (no HTML files in behaviour packages):

1. `bootCardEditScene` + `markCardEditReady` — mount card, paint, layout, apply behaviours
2. `@kite9/test-template/e2e` — `openCardEdit` (optional `query`, e.g. `behaviours=…`)
3. `@kite9/test-template/e2e/vite` — `createBehaviourE2eViteConfig` serves virtual `/e2e`

## Library use / tests

```ts
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { createCardDiagram, testTemplatePack } from "@kite9/test-template";

const diagram = createDiagram(createCardDiagram(), testTemplatePack);
expect(serializeDiagram(diagram)).toEqual(/* fixtures/json/card.json */);
```

```bash
pnpm --filter @kite9/test-template test
pnpm --filter @kite9/test-template test:coverage
pnpm --filter @kite9/test-template build
```
