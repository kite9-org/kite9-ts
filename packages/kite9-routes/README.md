# `@kite9/routes`

Route connections over a placed grid (`arrangeGrid` → track graph → SSP) and return updated [`LayoutData`](../kite9-model/src/layout.ts) with inflated routing lanes, hubs, and `routes`.

## Terminology

| Term | Meaning |
|------|---------|
| **Track** | One axis-aligned routing channel at a fixed grid line (`after`). |
| **Seam** | A track on a content-cell boundary (between / outside cols or rows). `kind: "seam"`. |
| **Inner** | A track inside a container’s padding chrome. `kind: "inner"`. |
| **Stub** | Short spur from a hub on a content edge to the facing main track. `kind: "stub"`. |
| **Segment** | A continuous usable run along a track (`from`…`to` on the perpendicular content index). Breaks split a track into segments. |
| **Intersection** | Crossing of one H track and one V track (graph node for SSP). |
| **Hub** | Mid-edge (or port) terminal: a point on a rectangular’s content box, plus its stub and T-junction. |

A seam is a *kind of* track, not a section of one. Segments are the sections. Glyphs and containers live **inside** cells; they do not occupy seams.

## Algorithm

`routeConnections` / `routeConnectionsWithGraph`:

1. **Build track graph** — one vertical seam at each content-column boundary `after = 0…contentCols` (left of the grid, between columns, and right of the grid), and one horizontal seam at each content-row boundary `after = 0…contentRows`, each spanning the full opposite axis; add container inners; create H×V intersections; attach mid-edge hubs + stubs.
2. **Route each connection** — terminals (hubs / ports) → shortest path on the intersection graph (SSP) → mark travelled tracks + facing stubs used.
3. **Inflate** — insert a routing-lane column/row for each used seam; remap placements and emit `GridVertex` routes; keep all hubs for paint/compaction.

## API

```ts
import { routeConnections } from "@kite9/routes";
import { arrangeGrid, DomElementSizer } from "@kite9/grid";

const placed = arrangeGrid(diagram, new DomElementSizer());
const layout = routeConnections(diagram, placed);
```

## Tests

```bash
pnpm --filter @kite9/routes test
pnpm --filter @kite9/preview start   # http://127.0.0.1:5174/results/ — Routes tab + Accept
```
