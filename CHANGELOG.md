# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Next release]

### Added

- [#24](https://github.com/matheus-meneses/grafana-dynamic-search/issues/24): Configurable placeholder text for the search input
- [#29](https://github.com/matheus-meneses/grafana-dynamic-search/issues/29): Search mode selection (contains, starts with, exact match)

### Fixed

- [#30](https://github.com/matheus-meneses/grafana-dynamic-search/issues/30): Fixed variable not being cleared when selection is removed

### Changed

- Refactored query type and search mode strings to constants for better maintainability

### Dependencies

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
