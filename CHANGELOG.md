# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
