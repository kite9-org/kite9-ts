# `@kite9/grid`

Direct placer for directional and CSS-grid layouts → flattened [`LayoutData`](../kite9-model/src/layout.ts) (**no** RHD / compaction / connection routing).

## Supported layouts

| `--kite9-layout` / `layout=` | Placement |
| --- | --- |
| `left` / `right` | Single row (DOM order; `left` reverses) |
| `up` / `down` | Single column (`up` reverses) |
| `grid` | Explicit cells via CSS `grid-column` / `grid-row` and track counts via `grid-template-columns` / `grid-template-rows` |

Unsupported (`null`, `horizontal`, `vertical`): throws — use `@kite9/layout` (RHD) later.

## Nested flatten

One physical `GridLayout` for the diagram, any nesting depth. Each container is laid out in local tracks (directional / grid), then **spliced** into its parent occupies span — nested tracks subdivide parent cells rather than inventing extra logical columns. Container CSS padding becomes leading/trailing tracks so siblings that share the same logical cells (e.g. `bl` under a padded `row`) span pad+content together. `routes` is omitted.

## API

```ts
import { arrangeGrid, DomElementSizer } from "@kite9/grid";

const layout = arrangeGrid(diagram, new DomElementSizer());
```

## Tests

```bash
pnpm --filter @kite9/grid test
pnpm --filter @kite9/preview start   # http://127.0.0.1:5174/results/ — Grid tab + Accept
```
