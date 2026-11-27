# `@kite9/routes`

Route connections over a placed grid (`arrangeGrid` → track graph → SSP) and return updated [`LayoutData`](../kite9-model/src/layout.ts) with inflated routing lanes, hubs, and `routes`.

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
