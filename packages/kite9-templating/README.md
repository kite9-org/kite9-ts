# `@kite9/templating`

Builds `@kite9/model` instances from light DOM (`kite9-*` HTML hosts) and applies registered templates to shadow roots.

```ts
import { createDiagram, serializeDiagram } from "@kite9/templating";
import { testTemplatePack } from "@kite9/test-template";

const diagram = createDiagram(rootElement, testTemplatePack);
const json = serializeDiagram(diagram);
```

- `TemplatePack` — maps tag names → default type + optional `render` (`RenderChromeFn`)
- `RenderChromeFn` — common chrome contract: `(host, shadow) => void` (e.g. `renderContainerChrome`)
- `createDiagram` — paints chrome, reads `--kite9-type` via `@kite9/css`, builds adapters
- `serializeDiagram` — stable JSON tree for tests
- `paintHost` / `resolveHostElementType` — shadow paint + cascade type resolution
