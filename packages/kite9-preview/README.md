# `@kite9/preview`

Scene demos: `@kite9/test-template` chrome + selectable/resizable behaviours.

```bash
pnpm --filter @kite9/preview start
# same as: pnpm --filter @kite9/preview dev
```

Opens **http://127.0.0.1:5174/preview/index.html**.

| Scene | URL |
| --- | --- |
| empty | http://127.0.0.1:5174/fixtures/html/empty.html |
| simple | http://127.0.0.1:5174/fixtures/html/simple.html |
| card | http://127.0.0.1:5174/fixtures/html/card.html |

When `<kite9-diagram mode="edit">`, `bootScene` applies the local `editablePack` (selectable, actionable, styleable, resizable). Click a selected element for the context menu; **Styles → Margins** opens overlay sizing.

### Functional test results

```bash
pnpm --filter @kite9/preview test:results
# or: pnpm --filter @kite9/layout test:results
```

Opens **http://127.0.0.1:5175/** — browses test results.
