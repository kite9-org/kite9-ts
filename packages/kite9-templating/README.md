# `@kite9/templating`

Builds `@kite9/model` instances from light DOM (`kite9-*` HTML hosts) and applies registered templates to shadow roots.

```ts
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { testTemplatePack } from "@kite9/test-template";

const diagram = createDiagram(rootElement, testTemplatePack);
const json = serializeDiagram(diagram);
```

- `TemplatePack` — maps tag names → default type + painters by destination
- `RenderHtmlFn` — HTML scene (host shadow): `(host, shadow) => void`
- `RenderSvgFn` — SVG scene under a link `<g>` (path / hit-boxes)
- `RenderDefsFn` — SVG `<defs>` (terminator markers, etc.)
- `RenderSvgLabelFn` — label `foreignObject` into the SVG scene
- `createDiagram` — paints chrome, reads `--kite9-type` via `@kite9/css`, builds adapters
- `serializeDiagram` — stable JSON tree for tests
- `paintHost` / `resolveHostElementType` — shadow paint + cascade type resolution
