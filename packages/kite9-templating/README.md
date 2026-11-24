# `@kite9/templating`

Builds `@kite9/model` instances from light DOM (`kite9-*` HTML hosts) and applies registered templates to shadow roots.

```ts
import {
  applyHostCapabilities,
  createDiagram,
  serializeDiagram,
} from "@kite9/templating";
import { DiagramElementType } from "@kite9/css";
import { testTemplatePack } from "@kite9/test-template";

const diagram = createDiagram(rootElement, testTemplatePack);
const json = serializeDiagram(diagram);
```

## API surface

- `TemplatePack` — maps tag names → default type + painters by destination
- `RenderHtmlFn` — HTML scene (host shadow): `(host, shadow) => void`
- `RenderSvgFn` — SVG scene under a link `<g>` (path / hit-boxes)
- `RenderDefsFn` — SVG `<defs>` (terminator markers, etc.)
- `RenderSvgLabelFn` — label `foreignObject` into the SVG scene
- `createDiagram` — paints chrome, reads `--kite9-type` via `@kite9/css`, builds adapters
- `serializeDiagram` — stable JSON tree for tests
- `paintHost` / `resolveHostElementType` — shadow paint + cascade type resolution
- `applyHostCapabilities` / `hostTitle` / `hostText` — host metadata helpers for templates

## View templates vs behaviours

Templates describe **how the diagram looks** and **what an element is allowed to participate in**. They must not create edit gadgets.

| Responsibility | Where |
| --- | --- |
| Shadow chrome for viewing (card, stage, ports, …) | `RenderHtmlFn` / SVG painters in a pack |
| Element kind | `k9-type` attribute (+ optional `:host { --kite9-type }` for cascade) |
| Edit affordances | `k9-ui` space-separated tokens (e.g. `selectable size`) |
| Selection, resize handles, overlays, commands | Behaviours (`@kite9/ui-behaviours`) reading `k9-type` / `k9-ui` |

**Do not** use `k9-contains` — that legacy containment hint did not pan out.

### Declaring capabilities in `renderHtml`

```ts
import { DiagramElementType } from "@kite9/css";
import {
  applyHostCapabilities,
  hostTitle,
  type RenderHtmlFn,
} from "@kite9/templating";

export const renderGlyphChrome: RenderHtmlFn = (host, shadow) => {
  applyHostCapabilities(host, {
    type: DiagramElementType.CONNECTED_RECTANGULAR,
    ui: "selectable size",
  });
  // paint view chrome into `shadow` only — no resize handles here
};
```

Common `k9-ui` tokens: `selectable` (click select), `size` (chrome resize handles + Styles → Margins), and later ones such as `drag`, `connect`, `delete` when those behaviours exist.

`@kite9/ui` resolves type via `k9-type` first, then computed `--kite9-type`, and reads affordances from `k9-ui`.
