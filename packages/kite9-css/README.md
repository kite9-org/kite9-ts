# `@kite9/css`

CSS vocabulary and bridge for Kite9 diagrams. **No package dependencies** — `@kite9/model` imports style enums from here.

- Style enums (`DiagramElementType`, `ConnectionsSeparation`, `ContentTransform`, …)
- Custom property names (`--kite9-type`, `--kite9-layout`, …)
- Optional Houdini `CSS.registerProperty` registration (`registerKite9Properties`)
- Lowercase kebab-case enum wire format
- Type resolution via `getComputedStyle` (normal cascade — **no style copying**)

Light-DOM hosts use the **browser box model** for size and spacing. 

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

## Supported properties

### Houdini custom properties (`CSS.registerProperty`)

Registered by `kite9PropertyDefs()` / `registerKite9Properties()`. Soft-skipped when Houdini is unavailable (e.g. happy-dom).

| Property | Syntax | Initial | Inherits | Role |
| --- | --- | --- | --- | --- |
| `--kite9-type` | enum + `none` | `none` | no | Diagram element kind |
| `--kite9-usage` | enum | `regular` | no | Rectangular usage |
| `--kite9-layout` | enum + `none` | `none` | no | Container layout mode |
| `--kite9-transform` | enum | `normal` | no | Content transform |
| `--kite9-horizontal-sizing` | enum | `minimize` | no | |
| `--kite9-vertical-sizing` | enum | `minimize` | no | |
| `--kite9-occupies-x` | `<integer>+` | `0` | no | **Deprecated** — use `grid-column` |
| `--kite9-occupies-y` | `<integer>+` | `0` | no | **Deprecated** — use `grid-row` |
| `--kite9-grid-rows` | `<integer>` | `0` | no | **Deprecated** — use `grid-template-rows` |
| `--kite9-grid-columns` | `<integer>` | `0` | no | **Deprecated** — use `grid-template-columns` |
| `--kite9-traversal` | enum | `leaving` | no | Border traversal |
| `--kite9-traversal-top` | enum \| `none` | `none` | no | |
| `--kite9-traversal-right` | enum \| `none` | `none` | no | |
| `--kite9-traversal-bottom` | enum \| `none` | `none` | no | |
| `--kite9-traversal-left` | enum \| `none` | `none` | no | |
| `--kite9-connections` | enum | `same-side` | no | Connection separation |
| `--kite9-vertical-align` | enum | `center` | no | **Deprecated** — use `align-self` |
| `--kite9-horizontal-align` | enum | `center` | no | **Deprecated** — use `justify-self` |
| `--kite9-vertical-align-position` | `<length-percentage>` | `50%` | no | **Deprecated** — use `align-self` |
| `--kite9-horizontal-align-position` | `<length-percentage>` | `50%` | no | **Deprecated** — use `justify-self` |
| `--kite9-direction` | enum + `none` | `none` | yes | Port / flow direction |
| `--kite9-link-inset` | `<length>` | `0` | no | |
| `--kite9-link-minimum-length` | `<length>` | `0` | no | |
| `--kite9-link-gutter` | `<length>` | `0` | no | |
| `--kite9-link-corner-radius` | `<length>` | `0` | no | |
| `--kite9-link-from-xpath` | `*` | (from xpath) | yes | |
| `--kite9-link-to-xpath` | `*` | (to xpath) | yes | |
| `--kite9-link-end` | enum + `none` | `none` | no | |
| `--kite9-marker-reserve` | `<length>` | `0` | no | |
| `--kite9-min-size` | `<length>+` | `0 0` | no | Minimum content size |
| `--kite9-min-width` | `<length> \| none` | `none` | no | |
| `--kite9-min-height` | `<length> \| none` | `none` | no | |
| `--kite9-text-bounds-size` | `<length>+` | `10000px 10000px` | yes | |
| `--kite9-text-bounds-width` | `<length>` | `10000px` | yes | |
| `--kite9-text-bounds-height` | `<length>` | `10000px` | yes | |
| `--kite9-port-position` | `<length-percentage>` | `50%` | no | Position along edge |

Constants also name shorthand aliases (`--kite9-sizing`, `--kite9-grid-size`, `--kite9-occupies`) that are **not** Houdini-registered; prefer the longhands above.

### Standard CSS (browser box / grid model)

Used directly on light-DOM hosts — **not** registered as custom properties. Edited with `ReplaceStyle` from `@kite9/ui-behaviours` (resize, margins).

| Property | Role |
| --- | --- |
| `width` | Content box width (chrome resize) |
| `height` | Content box height (chrome resize) |
| `margin` | Shorthand spacing outside the content box |
| `margin-top` | Track occupancy + visual inset |
| `margin-right` | |
| `margin-bottom` | |
| `margin-left` | |
| `padding` | Shorthand spacing inside the content box |
| `padding-top` | Container inset for compaction / chrome |
| `padding-right` | |
| `padding-bottom` | |
| `padding-left` | |
| `justify-self` | Grid-cell alignment (`start` / `end` / `center`; preferred over `--kite9-horizontal-align*`) |
| `align-self` | Grid-cell alignment (`start` / `end` / `center`; preferred over `--kite9-vertical-align*`) |
| `grid-column` / `grid-row` | Cell placement / span (preferred over `--kite9-occupies*`) |
| `grid-template-columns` / `grid-template-rows` | Track counts / sizes (preferred over `--kite9-grid-columns` / `--kite9-grid-rows`) |
| `text-align` | Text alignment inside labels / bodies |

Occupancy in `AdjustableLayout` is content `width`/`height` plus `margin-*`. Templates and `applyLayout` do not invent a parallel margin/padding vocabulary.
