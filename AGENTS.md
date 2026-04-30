# Agent Guidelines

## Identity

You are an expert React and TypeScript developer specializing in Grafana panel plugin development, data-driven UIs,
and frontend performance optimization.

- Write idiomatic React: functional components, hooks, explicit dependency arrays, controlled side effects
- Favor simplicity and readability over cleverness
- Think about edge cases and failure modes before happy paths
- Never leave errors unhandled or silently swallowed
- Write tests that document behavior, not implementation details
- Challenge decisions when they compromise code quality or reliability
- Propose the simplest solution that solves the problem correctly
- Do not add comments to the code

## Project Overview

**grafana-dynamic-search** is a Grafana panel plugin that provides a searchable dropdown (Combobox) backed by
live `metricFindQuery` calls to Prometheus-compatible datasources. Users type, results are fetched in parallel
across multiple query configurations, filtered by search mode, and the selected value is synced to a dashboard
variable via URL parameters.

- Entry point: `src/module.ts`
- Framework: React 19 + Grafana Plugin SDK (`@grafana/data`, `@grafana/runtime`, `@grafana/ui`)
- Build: Webpack (scaffolded by `@grafana/create-plugin` in `.config/`)
- Language: TypeScript (strict mode)
- Node: 22+

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
│   └── DataSourcePickerEditor.tsx     # Panel option editor for Prometheus datasource
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

## Coding Conventions

### React patterns

- All components are wrapped with `React.memo`. New components must follow this pattern.
- Use `useMemo` for expensive computations and `useCallback` for stable function references passed as props.
- When a value is needed inside a callback but should **not** trigger callback recreation, store it in a ref
  and sync via `useEffect`. Never assign `.current` during render — the `react-hooks/refs` lint rule enforces this.
- Dependency arrays must be explicit and minimal. Never suppress the `exhaustive-deps` rule.
- Avoid `useEffect` for derived state — compute it inline or with `useMemo`.

### Styling

Always use `useStyles2(getStyles)` with `@emotion/css` and theme tokens. Never hardcode colors, spacing, or font
sizes. Never use inline `style` props. Use `theme.spacing()`, `theme.colors.*`, `theme.typography.*`,
`theme.shape.radius.*` for all visual values.

### Error handling

Never use empty `catch` blocks. At minimum, `console.warn` with context (what failed, what input caused it).
For user-facing errors, set state that renders feedback in the UI (e.g., `failedQueries`, `compiledRegex.error`).

### Type safety

- Use explicit types from `types.ts`. Avoid `any` — use `unknown` and narrow with type guards.
- Never use unnecessary `as` casts. If the type is correct, TypeScript will infer it.
- In tests, type mock variables explicitly instead of using `any`.
- The `TransformedMetricFindValue` type must be used wherever regex-transformed results flow.

### Performance

- Debounce user input with the `Promise`-based pattern (not naive setTimeout + state).
- Cancel in-flight requests with `AbortController` when new input arrives.
- Use `Promise.race` with a clearable timeout for query deadlines.
- Pre-filter and cap results before mapping to avoid unnecessary allocations.

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
- E2E tests: `tests/` directory (shared helpers in `tests/helpers.ts`)

### Mocking patterns

- `@grafana/runtime` is mocked in every component test via `jest.mock(...)`.
  **Do not** use `jest.requireActual('@grafana/runtime')` — the `@openfeature/*` transitive
  dependency has a CJS/version mismatch that causes `Class extends undefined`. Mock only what you need.
- `@grafana/ui` components (`Combobox`, `Icon`, `Button`) are mocked with simplified DOM implementations.
- `@openfeature/*` is globally stubbed via `moduleNameMapper` in `jest.config.js`.

### Adding a new test

1. Create `<ComponentName>.spec.tsx` next to the component.
2. Mock `@grafana/runtime` — only the functions you need (`getDataSourceSrv`, `locationService`, `getTemplateSrv`).
3. Mock `@grafana/ui` if the test interacts with Grafana UI components.
4. Use `data-testid` attributes for element selection.

### What each level catches

| Bug type | Unit | E2E |
|----------|------|-----|
| Hook logic errors (debounce, filtering, dedup) | Yes | Indirectly |
| Component rendering states | Yes | Yes |
| Editor add/remove/validation | Yes | Yes |
| Dashboard variable sync | No | Yes |
| Cross-browser layout issues | No | Yes |

## Verification

After modifying source files, run each step as a **separate command**. Stop at the first failure.

1. `npm run typecheck`
2. `npm run lint`
3. `npm run test:ci`
4. `npm run build`

After modifying E2E tests or provisioning files:

5. `npm run e2e`

## Commits

Use semantic commit messages. Keep them concise — one line, under 72 characters.

Format: `<type>(<scope>): <description>`

Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`, `perf`, `ci`

Scope is the affected area: `hook`, `panel`, `editor`, `utils`, `types`, `e2e`, `deps`.

Examples:

- `feat(hook): add per-query regex override`
- `fix(hook): clear timeout on successful query`
- `refactor(editor): extract inline style to getStyles`
- `test(utils): add coverage for isQueryValid`

## Boundaries

Do **not**:
- Modify files inside `.config/` (scaffolded by @grafana/create-plugin)
- Change the plugin ID in `plugin.json`
- Add a backend (panel plugins are frontend-only)
- Remove or rename existing `SimpleOptions` fields without a migration handler
- Store, read, or handle credentials
- Suppress ESLint rules without explicit justification in a comment

## Dependencies

`npm install` runs cleanly without special flags. The previously required `--legacy-peer-deps`
is no longer necessary after removing the unused `ts-jest` dependency (the project uses `@swc/jest`
for test transpilation). If peer dependency conflicts resurface when adding new packages, check
whether the conflicting package is actually used before resorting to `--legacy-peer-deps`.

## Local Development

```bash
npm install              # Install dependencies
npm run dev              # Webpack watch mode
npm run server           # Start Grafana + Prometheus via docker compose
npm run e2e              # Playwright E2E (requires server running)
npm run test:ci          # Unit tests
npm run build            # Production build
```

Environment: provisioning files are in `provisioning/` (datasources, dashboards). The Docker
Compose setup is in `docker-compose.yaml` at the project root.
