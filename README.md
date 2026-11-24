# kite9-ts

Pure TypeScript monorepo port of [kite9-a-different-approach](../kite9-a-different-approach).

## Packages

| Package | Name | Role |
| --- | --- | --- |
| `packages/kite9-css` | `@kite9/css` | Style enums, `--kite9-*` properties, cascade readers (no deps) |
| `packages/kite9-model` | `@kite9/model` | Diagram model interfaces (depends on `@kite9/css`) |
| `packages/kite9-templating` | `@kite9/templating` | Light DOM → model + shadow paint |
| `packages/kite9-test-template` | `@kite9/test-template` | Scene preview harness (HTML fixtures + chrome + grid layout) |

## Commands

```bash
pnpm install
pnpm build
pnpm test
pnpm test:coverage   # text + HTML reports under packages/*/coverage/

# View laid-out fixture scenes (chrome + grid + model JSON)
pnpm --filter @kite9/test-template start
```

CI (`.github/workflows/ci.yml`) runs build, typecheck, and `test:coverage` on push/PR, uploads LCOV to [Codecov](https://codecov.io) (report-only; see `codecov.yml`), and attaches HTML coverage as an artifact.

Add a repo secret `CODECOV_TOKEN` from the Codecov project settings after connecting the GitHub repo.
