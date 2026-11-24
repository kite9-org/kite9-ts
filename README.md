# kite9-ts

Pure TypeScript monorepo port of [kite9-a-different-approach](../kite9-a-different-approach).

## Packages

| Package | Name | Role |
| --- | --- | --- |
| `packages/kite9-css` | `@kite9/css` | Style enums, `--kite9-*` properties, cascade readers (no deps) |
| `packages/kite9-model` | `@kite9/model` | Diagram model interfaces (depends on `@kite9/css`) |
| `packages/kite9-command` | `@kite9/command` | OT-oriented commands for collaborative HTML light-DOM editing |
| `packages/kite9-ui` | `@kite9/ui` | Behaviour contract + shared UI (overlay, dragger, screen, api) |
| `packages/kite9-templating` | `@kite9/templating` | Light DOM → model + shadow paint |
| `packages/kite9-test-template` | `@kite9/test-template` | Templates, chrome, grid layout, fixture data (no behaviours) |
| `packages/kite9-preview` | `@kite9/preview` | Compose TemplatePack + editable BehaviourPack; Vite scene demos |
| `packages/kite9-ui-behaviours` | `@kite9/ui-behaviours` | Select, context menu, Styles/Margins, resize (subpaths per behaviour) |

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm test:coverage   # text + HTML reports under packages/*/coverage/

# Scene demos with edit behaviours (mode=edit)
pnpm --filter @kite9/preview start

# Behaviour Playwright (after pnpm --filter @kite9/ui-behaviours test:e2e:install)
pnpm --filter @kite9/ui-behaviours test:e2e
```

CI (`.github/workflows/ci.yml`) runs build, typecheck, `test:coverage`, and behaviour Playwright on push/PR, uploads LCOV to [Codecov](https://codecov.io) (report-only; see `codecov.yml`), and attaches HTML coverage as an artifact.

Add a repo secret `CODECOV_TOKEN` from the Codecov project settings after connecting the GitHub repo.
