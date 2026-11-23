# `@kite9/test-template`

**Preview harness for Kite9 light-DOM scenes** — authorable HTML fixtures that Vite serves so you can paint template chrome, apply layout, and inspect shadow DOM.

## Preview (primary)

```bash
pnpm --filter @kite9/test-template start
# same as: pnpm --filter @kite9/test-template dev
```

Opens **http://127.0.0.1:5174/preview/index.html** (scene index). Each fixture is a standalone page:

| Scene | URL |
| --- | --- |
| empty | http://127.0.0.1:5174/fixtures/html/empty.html |
| card | http://127.0.0.1:5174/fixtures/html/card.html |

On each page:

1. Light DOM lives in the HTML (`kite9-*` hosts)
2. `bootScene` runs `createDiagram` + this pack’s Preact chrome into shadow roots
3. Applies the matching `fixtures/grid/*.json` layout
4. Shows `serializeDiagram` JSON beside the diagram — open DevTools → Elements to inspect shadow roots

## What’s in the package

| Path | Role |
| --- | --- |
| `preview/index.html` | Link index for scenes |
| `fixtures/html/` | Standalone Vite-renderable scene pages |
| `fixtures/scene-boot.ts` | Shared `bootScene` (createDiagram + applyLayout) |
| `fixtures/grid/` | Placeholder layout (tracks, placements, routes) |
| `fixtures/json/` | Expected `serializeDiagram` snapshots |
| `src/templates/` | Per-tag chrome (`index.tsx` + `styles.css`) |
| `src/pack.ts` | `testTemplatePack` — tag → type + `RenderChromeFn` |
| `src/apply-layout.ts` | `applyLayout` — paint grid + routes onto a scene |
| `test/model-from-html.test.ts` | HTML light DOM → model JSON |
| `test/shadow-layout.test.ts` | HTML + grid → shadow chrome + layout |

Tag coverage (`card`): `kite9-diagram`, `kite9-glyph`, `kite9-container`, `kite9-arrow`, `kite9-key`, `kite9-link`, `kite9-from-label` / `kite9-to-label`, `kite9-port` / `kite9-socket`. Host `label` attributes are chrome-only, not model `Label`s.

## Library use / tests

```ts
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { testTemplatePack } from "@kite9/test-template";

// Tests extract <kite9-diagram> from the full fixture HTML via mountScene.
const diagram = createDiagram(document.querySelector("kite9-diagram")!, testTemplatePack);
expect(serializeDiagram(diagram)).toEqual(/* fixtures/json/card.json */);
```

```bash
pnpm --filter @kite9/test-template test
pnpm --filter @kite9/test-template build
```
