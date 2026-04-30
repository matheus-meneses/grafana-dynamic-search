---
name: panel-plugin-agent
description: Develops the grafana-dynamic-search panel plugin
---


## Project knowledge

This repository is a **Grafana panel plugin** called **Dynamic Search**. Follow the base
[instructions](./.config/AGENTS/instructions.md) before making any changes.

Build, lint, test, and Docker dev-server commands are in the "Getting started" section of
[README.md](./README.md). Prefer the non-watch versions.

## Architecture

```
src/
├── module.ts                          # Plugin entry – registers panel, options, migration handler
├── types.ts                           # All shared types (SimpleOptions, QueryConfig, enums)
├── utils.ts                           # Pure functions: buildQuery, applyRegexTransform, deduplication
├── hooks/
│   └── useDynamicSearch.ts            # Core hook: debounce, parallel queries, filtering, variable sync
├── components/
│   ├── DynamicSearchPanel.tsx         # Main panel component (config validation, Combobox, footer)
│   ├── SearchResultsList.tsx          # Result count / "Searching..." status line
│   ├── FailedQueriesWarning.tsx       # Alert banner when queries fail
│   ├── ErrorBoundary.tsx              # React error boundary with retry button
│   ├── QueriesEditor.tsx              # Panel option editor for multiple query configs
│   ├── RegexEditor.tsx                # Panel option editor for regex with live preview
│   ├── DataSourcePickerEditor.tsx     # Panel option editor for Prometheus datasource
└── __mocks__/
    └── @openfeature/stub.js           # Jest stub – @openfeature/core version mismatch workaround
```

### Data flow

1. User types in the `Combobox` (Grafana UI).
2. `Combobox` calls `loadOptions(inputValue)` — an async callback, not static options.
3. `useDynamicSearch.loadOptions` debounces input (350 ms) via a `Promise`-based debounce pattern.
4. Valid `QueryConfig[]` entries are deduplicated and executed in parallel via `ds.metricFindQuery`.
5. Each query is wrapped in a `Promise.race` against a configurable timeout (`queryTimeout`, default 10s). The timeout `setTimeout` is cleared on both success and failure to avoid leaks.
6. Per-query regex or global regex is applied with `applyRegexTransform`. The global regex is compiled once via `useMemo` and accessed through a ref to avoid dependency array churn.
7. Results are merged, deduplicated by text, filtered by search mode (contains/starts_with/exact), and capped by `maxResults`.
8. On selection, `locationService.partial` updates the dashboard variable URL parameter.

### Key types

| Type | Location | Purpose |
|------|----------|---------|
| `SimpleOptions` | `types.ts` | Panel options stored in dashboard JSON |
| `QueryConfig` | `types.ts` | Single query definition (type, label, metric, regex, timeout) |
| `TransformedMetricFindValue` | `types.ts` | MetricFindValue extended with `__originalText` after regex transform |
| `QueryOptions` | `types.ts` | Subset of QueryConfig used by `buildQuery` |

### Migration handler

`module.ts` contains a `setMigrationHandler` that converts legacy single-query options
(`queryType`, `label`, `metric`, `queryTimeout`) into the current `queries[]` array format.
Any changes to `SimpleOptions` that remove or rename fields must include a migration.

## Testing

### Frameworks

- **Unit tests**: Jest 30 + @swc/jest + @testing-library/react
- **E2E tests**: Playwright + @grafana/plugin-e2e
- **Benchmarks**: Jest with `performance.now()` timing assertions

### Commands

| Command | Purpose |
|---------|---------|
| `npm run test:ci` | Run all unit tests (CI mode, 4 workers) |
| `npm run test:coverage` | Unit tests with coverage report |
| `npm run test:perf` | Performance benchmarks only (`*.bench.ts`) |
| `npm run e2e` | Playwright E2E tests (requires running Grafana via `npm run server`) |
| `npm run typecheck` | TypeScript compilation check |
| `npm run lint` | ESLint check |

### Test file naming

- Unit tests: `<name>.spec.ts` or `<name>.spec.tsx` next to the source file
- Benchmarks: `<name>.bench.ts` next to the source file
- E2E tests: `tests/` directory

### Mocking patterns

- `@grafana/runtime` is mocked in every component test via `jest.mock(...)`.
  **Do not** use `jest.requireActual('@grafana/runtime')` — the `@openfeature/*` transitive
  dependency has a CJS/version mismatch that causes `Class extends undefined`. Mock only what you need.
- `@grafana/ui` components (`Combobox`, `Icon`) are mocked with simplified DOM implementations.
- `useStyles2` is mocked in `HighlightedText.spec.tsx` with a minimal theme object.
- `@openfeature/*` is globally stubbed via `moduleNameMapper` in `jest.config.js`.

### Adding a new test

1. Create `<ComponentName>.spec.tsx` next to the component.
2. Mock `@grafana/runtime` — only the functions you need (`getDataSourceSrv`, `locationService`, `getTemplateSrv`).
3. Mock `@grafana/ui` if the test interacts with Grafana UI components.
4. Use `data-testid` attributes for element selection.

## Coding conventions

- **Styling**: Always use `useStyles2(getStyles)` with `@emotion/css` and theme tokens. Never hardcode colours, spacing, or font sizes. Never use inline `style` props.
- **Memoization**: Components are wrapped with `React.memo`. Use `useMemo` / `useCallback` for expensive computations and stable references.
- **Error handling**: Never use empty `catch` blocks. At minimum, `console.warn` with context.
- **Types**: Use explicit types from `types.ts`. Avoid `any`. The `TransformedMetricFindValue` type should be used wherever regex-transformed results flow.
- **No comments that narrate code**. Only explain non-obvious intent or constraints.

## Boundaries

Do **not**:
- Modify files inside `.config/` (scaffolded by @grafana/create-plugin)
- Change the plugin ID in `plugin.json`
- Add a backend (panel plugins are frontend-only)
- Remove or rename existing `SimpleOptions` fields without a migration handler
- Store, read, or handle credentials

## Dependencies note

`npm install` runs cleanly without special flags. The previously required `--legacy-peer-deps`
is no longer necessary after removing the unused `ts-jest` dependency (the project uses `@swc/jest`
for test transpilation). If peer dependency conflicts resurface when adding new packages, check
whether the conflicting package is actually used before resorting to `--legacy-peer-deps`.
