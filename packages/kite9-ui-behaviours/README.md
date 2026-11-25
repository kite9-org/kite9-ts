# `@kite9/ui-behaviours`

Edit behaviours for Kite9 light/shadow diagrams.

```ts
import {
  createActionableBehaviour,
  createResizableBehaviour,
  createSelectableBehaviour,
  createStyleableBehaviour,
} from "@kite9/ui-behaviours";
import { applyBehaviourPack, type BehaviourPack } from "@kite9/ui";

const pack: BehaviourPack = {
  id: "editable",
  behaviours: [
    createSelectableBehaviour(),
    createActionableBehaviour(),
    createStyleableBehaviour(),
    createResizableBehaviour(),
  ],
};
```

Subpath imports: `./selectable`, `./actionable`, `./styleable`, `./resizable`.

| Behaviour | Role |
| --- | --- |
| **selectable** | Click selection on hosts with `k9-ui` including `selectable` |
| **actionable** | Click opens the shared context menu next to the selection |
| **styleable** | Context menu **Styles** → **Margins** (overlay sizing session + OK/Cancel) |
| **resizable** | Chrome corner resize handles on hosts with `k9-ui` including `size` |

`size` enables chrome handles and Styles → Margins. Margin overlay arrows appear only after choosing Margins — not on select.

Chrome resize updates `AdjustableLayout` live, then commits `width`/`height` via `ReplaceStyle` on pointer up. Styles → Margins updates `AdjustableLayout` live while dragging (track preview); `ReplaceStyle` for `margin-*` / `justify-self` / `align-self` runs only on OK. Cancel restores the prior layout margins.
