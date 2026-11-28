# `@kite9/preview`

Scene demos + functional test results in one Vite app. Also owns `applyLayout` (paint `LayoutData` onto a diagram) and `bootCardEditScene` for behaviour e2e.

```bash
pnpm --filter @kite9/preview start
# same as: pnpm --filter @kite9/preview preview
```

Opens **http://127.0.0.1:5174/preview/index.html**.

| Page | URL |
| --- | --- |
| Scenes | http://127.0.0.1:5174/preview/index.html |
| Test results | http://127.0.0.1:5174/results/ |
| empty | http://127.0.0.1:5174/fixtures/html/empty.html |
| simple | http://127.0.0.1:5174/fixtures/html/simple.html |
| card | http://127.0.0.1:5174/fixtures/html/card.html |

When `<kite9-diagram mode="edit">`, `bootScene` applies the local `editablePack` (selectable, actionable, styleable, resizable). Click a selected element for the context menu; **Styles → Margins** opens overlay sizing.

### Functional test results

Same server — open **http://127.0.0.1:5174/results/** (or `pnpm --filter @kite9/preview test:results` to open that path). Accept baselines from the Display / Grid / Routes tabs when actual differs from expected.
