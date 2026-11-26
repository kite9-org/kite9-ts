# `@kite9/ui`

Shared UI foundation for diagram **behaviours**: the `Behaviour` / `BehaviourPack` contract, plus revised ports of legacy editor helpers (overlay, context menu, dragger, screen, api, events, css).

## Selection state

Selection always lives on the **light-DOM host** (`.selected` / `.lastSelected`). Hit-testing may start from shadow chrome or SVG link paths; resolve to the light-DOM element via `getKite9Target(node, root)` (requires `k9-ui` including `selectable`).

## Behaviour contract

```ts
import {
  applyBehaviourPack,
  type BehaviourPack,
} from "@kite9/ui";
import { LocalCommandContext } from "@kite9/command";

const root = document.querySelector("kite9-diagram")!;
const dispose = applyBehaviourPack(
  pack,
  root,
  new LocalCommandContext(root),
);
```

`applyBehaviourPack(pack, root, command, layout?, contextMenu?)` builds the shared `ContextMenu` when omitted. Pass optional `layout: { layout, apply }` with an `AdjustableLayout` so resize / margins can mutate tracks and re-paint.

## Modules

| Module | Role |
| --- | --- |
| `behaviour` | `Behaviour`, `BehaviourPack`, `applyBehaviourPack` |
| `adjustable-layout` | Edit-session wrapper over `LayoutData`.  Allows for diagram elements to be resized without a new layout being generated. (`resizeElement`, `setMargin`, …) |
| `layout-session` | `{ layout: AdjustableLayout, apply }` on `BehaviourContext` |
| `context-menu/` | Floating edit menu (`ContextMenu`) |
| `overlay/` | Sizing rects / arrows in diagram shadow (session-scoped) |
| `dragger/` | Pointer-drag state scoped to diagram root |
| `screen` | Coords / bboxes relative to diagram stage |
| `api` | `getKite9Target` / `isRectangular` via `k9-type`; `getAffordances` / `hasAffordance` via `k9-ui` |
| `events` | Named event listeners |
| `css` | Inline style parse / format |
| `types` | `Point`, `Area`, direction helpers |
