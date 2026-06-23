# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.6.0]

### Added

- CodeQL static analysis (SAST) workflow for automated security scanning ([#147](https://github.com/matheus-meneses/grafana-dynamic-search/pull/147))

### Security

- Pinned all GitHub Actions to immutable commit SHAs to harden the CI supply chain ([#146](https://github.com/matheus-meneses/grafana-dynamic-search/pull/146))
- Enabled Dependabot vulnerability alerts and automated security updates

### Fixed

- Restored Grafana 13.1 e2e compatibility by scoping the data source combobox locator, fixing the multi-minute e2e hang on Grafana 13.1 and nightly ([#148](https://github.com/matheus-meneses/grafana-dynamic-search/pull/148))
- Reverted `grafana/plugin-actions/e2e-version` to v2.0.0 after v3.0.0 crashed the e2e version resolution
- Regenerated `package-lock.json` to resolve `npm ci` sync failures in CI
- Removed unused `ts-jest` dependency that caused a peer dependency conflict during `npm ci`
- Fixed Grafana nightly e2e test failures and several broken test suite assertions

### Dependencies

- Bump `@grafana/*` packages to 13.0.1
- Bump `typescript` to 6.0.3
- Bump `sass` to 1.101.0 and `sass-loader` to 17.0.0 ([#149](https://github.com/matheus-meneses/grafana-dynamic-search/pull/149))
- Bump `actions/checkout` to v7.0.0 ([#141](https://github.com/matheus-meneses/grafana-dynamic-search/pull/141))
- Bump `codecov/codecov-action` to v7
- Bump `@grafana/plugin-e2e`, `@playwright/test`, `@swc/core`, `@types/node`, `prettier`, `copy-webpack-plugin`, `terser-webpack-plugin`, `webpack-cli`, `eslint-plugin-jsdoc`, `@typescript-eslint/*`, and the eslint group

## [1.5.0]

### Added

- [#94](https://github.com/matheus-meneses/grafana-dynamic-search/issues/94): Multi-query support
- Parallel query execution for better performance when using multiple queries
- Warning banner for partially failed queries

### Changed

- **Major Refactoring**: Modernized the codebase using React Hooks and modular component architecture
- Replaced deprecated `Select` component with modern `Combobox` in the panel and editor
- Extracted core search logic into a reusable `useDynamicSearch` custom hook
- Improved maintainability by breaking down `DynamicSearchPanel` into smaller, focused sub-components
- Enhanced regex transformation logic to preserve original values for robust search filtering
- Improved type safety and resolved several TypeScript/Linting issues

### Fixed

- Fixed missing e2e test assertions
- Fixed regression where regex-transformed results could not be filtered by their original text
- Fixed memory leaks in debounced operations by ensuring proper cleanup in the custom hook

### Dependencies

- Bump @grafana/plugin-e2e from 3.3.2 to 3.4.0
- Bump the eslint group with 6 updates
- Bump @types/node from 25.2.3 to 25.3.0
- Bump sass from 1.97.2 to 1.97.3
- Bump sass-loader from 16.0.6 to 16.0.7
- Bump glob from 13.0.3 to 13.0.6
- Bump @swc/helpers from 0.5.18 to 0.5.19
- Bump actions/setup-node from 6.2.0 to 6.3.0
- Bump grafana/plugin-actions/is-compatible from v1.0.2 to v1.0.3
- Bump grafana/plugin-actions/build-plugin from v1.0.2 to v1.2.0
- Bump actions/upload-artifact from 6 to 7
- Bump actions/download-artifact from 7 to 8

## [1.4.1] - 2026-02-16

### Fixed

- [#77](https://github.com/matheus-meneses/grafana-dynamic-search/issues/77): Filter datasource variables to only show Prometheus-type variables

## [1.4.0] - 2026-02-16

### Added

- [#21](https://github.com/matheus-meneses/grafana-dynamic-search/issues/21): Match highlighting in dropdown results
- [#75](https://github.com/matheus-meneses/grafana-dynamic-search/issues/75): Support dashboard variables for datasource selection

### Dependencies

- Bump @swc/core from 1.15.8 to 1.15.10
- Bump @playwright/test from 1.57.0 to 1.58.0
- Bump @types/node from 25.0.3 to 25.0.10
- Bump @testing-library/react from 16.3.1 to 16.3.2
- Bump prettier from 3.7.4 to 3.8.0
- Bump swc-loader from 0.2.6 to 0.2.7
- Bump @grafana/plugin-e2e from 3.1.1 to 3.1.4
- Bump sass from 1.97.1 to 1.97.2
- Bump the eslint group with 5 updates
- Bump actions/setup-node from 6.1.0 to 6.2.0
- Bump grafana/plugin-actions/e2e-version from v1.1.2 to v1.2.1

## [1.3.0] - 2026-01-11

### Added

- [#24](https://github.com/matheus-meneses/grafana-dynamic-search/issues/24): Configurable placeholder text for the search input
- [#29](https://github.com/matheus-meneses/grafana-dynamic-search/issues/29): Search mode selection (contains, starts with, exact match)

### Fixed

- [#30](https://github.com/matheus-meneses/grafana-dynamic-search/issues/30): Fixed variable not being cleared when selection is removed
- [#52](https://github.com/matheus-meneses/grafana-dynamic-search/issues/52): Fixed backspace clearing not updating dashboard variable
- [#53](https://github.com/matheus-meneses/grafana-dynamic-search/issues/53): Panel now syncs with variable value from URL query parameters on load

### Changed

- Refactored query type and search mode strings to constants for better maintainability

### Dependencies

- Bump @emotion/css from 11.10.6 to 11.13.5
- Bump @grafana/plugin-e2e from 3.1.0 to 3.1.1
- Bump glob from 10.5.0 to 13.0.0
- Bump prettier from 2.8.8 to 3.7.4
- Bump sass-loader from 13.3.1 to 16.0.6
- Bump sass from 1.63.2 to 1.97.1
- Bump copy-webpack-plugin from 11.0.0 to 13.0.1
- Bump webpack-cli from 5.1.4 to 6.0.1
- Bump @types/node from 20.19.27 to 25.0.3
- Bump @stylistic/eslint-plugin in the eslint group
- Bump actions/upload-artifact from 5 to 6

## [1.2.0] - 2026-01-01

### Added

- Regex transformation with live preview in the editor
- Visual feedback for regex validation (valid/invalid indicators)
- Support for capture groups (first group used as output)
- Graceful fallback to original value when regex doesn't match
- Variable existence validation with warning banner when target variable not found
- Error boundary for graceful error handling and recovery
- Query preview in panel options showing the built PromQL query
- Panel options organized into categories (Data Source, Query, Variable, Display, Transform)
- Placeholder examples for Label, Metric, and Target Variable inputs
- Comprehensive test coverage for maxResults, selected badge, cleanup, and variable validation

### Fixed

- Fixed debounce promise memory leak by properly resolving pending promises on cancel
- Fixed description field not being preserved through regex transformation

### Changed

- Improved panel edit UI with grouped options and better discoverability
- Enhanced code quality with error boundaries and proper cleanup

## [1.1.0] - 2025-12-29

### Added

- Demo GIF now displayed in Grafana plugin catalog
- JSDoc documentation for public functions
- Accessibility improvements (ARIA labels, role attributes)
- Implemented performance tests.

### Changed

- Improved search debounce (350ms) to reduce unnecessary API calls
- Enhanced plugin description for better discoverability
- Expanded keywords for improved catalog search (autocomplete, typeahead, combobox, etc.)
- Improved type safety with dedicated QueryOptions interface

### Fixed

- Fixed memory cleanup for debounce operations on component unmount
- Fixed type assertions in buildQuery calls
- Made minChars and maxResults optional in type definitions (matching runtime defaults)

### Performance

- Added AbortController for canceling in-flight requests
- Improved request deduplication with requestId tracking
- Optimized regex validation to avoid duplicate computations

## [1.0.0] - 2025-12-28

Initial release of Grafana Dynamic Search Panel.

### Added

- Real-time autocomplete search powered by Prometheus API
- Dynamic dashboard variable updates on selection
- Three query modes: Label Values, Label Names, and Metrics
- Regex transformation support with capture group extraction
- Configurable minimum character threshold before search triggers
- Configurable maximum results limit
- Prometheus-compatible datasource picker
- Grafana 11.6.0+ compatibility

### Dependencies

- Updated actions/checkout to v6
- Updated actions/setup-node to v6.1.0
- Updated codecov/codecov-action to v5
- Updated actions/download-artifact to v7
- Updated grafana/plugin-actions/bundle-size to v1.1.0
- Updated eslint and related packages
- Updated fork-ts-checker-webpack-plugin to v9.1.0
- Updated css-loader to v7.1.2
- Updated style-loader to v4.0.0
