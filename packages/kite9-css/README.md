# `@kite9/css`

CSS vocabulary and bridge for Kite9 diagrams. **No package dependencies** — `@kite9/model` imports style enums from here.

- Style enums (`DiagramElementType`, `ConnectionsSeparation`, `ContentTransform`, …)
- Property names (`--kite9-type`, `--kite9-layout`, …)
- Optional Houdini `CSS.registerProperty` registration
- Lowercase kebab-case enum wire format
- Type resolution via `getComputedStyle` (normal cascade — **no style copying**)

## Type resolution

Templates set defaults on `:host`:

```css
:host {
  --kite9-type: connected-rectangular;
}
```

Author/light styles on the **same host** override those defaults through the cascade. After paint:

```ts
import { resolveDiagramElementType } from "@kite9/css";

const type = resolveDiagramElementType(host); // DiagramElementType | null
```

| Model | CSS `--kite9-type` |
| --- | --- |
| `DIAGRAM` | `diagram` |
| `CONNECTED_RECTANGULAR` | `connected-rectangular` |
| `PORT` | `port` |
| `CONNECTION` | `connection` |
| `TERMINATOR` | `terminator` |
| `LABEL` | `label` |
| *(skip)* | `none` |

## Cascade precedence

Light/author styles on the host beat template `:host` defaults. 
