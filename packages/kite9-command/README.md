# `@kite9/command`

Serializable **commands** that mutate an HTML **light-DOM** diagram template.

## Purpose

Commands are the unit of change for collaborative editing (operational-transform style, à la Google Docs): multiple editors — possibly on different machines — apply the same command stream against a shared light-DOM tree. Optimistic preconditions (`from` / content checks) detect concurrent mismatch so undo/replay stays safe.

The edit surface is a **root Element** (e.g. `<kite9-diagram>`) accessed via `getRootElement()` — not a whole `Document`. Networking, transform composition, and multi-peer sync are out of scope here.

## Usage

```ts
import {
  LocalCommandContext,
  diagramRootFromHtml,
  ReplaceAttr,
} from "@kite9/command";

const root = diagramRootFromHtml(htmlString);
// or: const root = document.querySelector("kite9-diagram")!;
const ctx = new LocalCommandContext(root);
const cmd = new ReplaceAttr();
cmd.fragmentId = "two";
cmd.name = "name";
cmd.to = "value";
const mismatch = cmd.apply(ctx); // null = success
ctx.getRootElement(); // current diagram root
```

## Commands

Insert: `InsertHtml`, `InsertUrl`, `InsertUrlWithChanges`, `Delete`  
Replace: `ReplaceAttr`, `ReplaceStyle`, `ReplaceText`, `ReplaceHtml`, `ReplaceTag`, `ReplaceTagUrl`  
Move: `Move`, `AdlMoveCells`

Fixtures use `kite9-link` / `kite9-table` instead of HTML-void/`table` tags so light-DOM structure survives `text/html` parsing.
