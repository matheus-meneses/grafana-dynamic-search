# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-12-29

### Added

- Demo GIF now displayed in Grafana plugin catalog
- JSDoc documentation for public functions
- Accessibility improvements (ARIA labels, role attributes)

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
