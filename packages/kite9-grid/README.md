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

One physical `GridLayout` for the diagram, any nesting depth. Each container is laid out in local columns/rows (directional / grid), then **spliced** into its parent occupies span — nested sizes subdivide parent cells rather than inventing extra logical columns. Container CSS padding adds leading/trailing columns and rows **inside** the painted border so siblings that share the same logical cells (e.g. `bl` under a padded `row`) span pad+content together. `routes` is omitted.

**Margin outside / padding inside (CSS box model):** container margin adds empty columns/rows **outside** the container’s painted cells; padding adds columns/rows **inside** the border. Gap from the container border to a child is `padding + child facing margin`.

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
