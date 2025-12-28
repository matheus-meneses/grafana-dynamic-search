# Grafana Dynamic Search Panel

[![CI](https://github.com/matheus-meneses/grafana-dynamic-search/actions/workflows/ci.yml/badge.svg)](https://github.com/matheus-meneses/grafana-dynamic-search/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/matheus-meneses/grafana-dynamic-search/graph/badge.svg)](https://codecov.io/gh/matheus-meneses/grafana-dynamic-search)
[![License](https://img.shields.io/github/license/matheus-meneses/grafana-dynamic-search)](LICENSE)
[![Grafana](https://img.shields.io/badge/Grafana-11.6.0%2B-orange)](https://grafana.com)

A Grafana panel plugin that brings real-time, dynamic search capabilities to your dashboards. Query Prometheus directly from a search box with autocomplete suggestions and instantly update dashboard variables based on your selection.

![Dynamic Search Demo](resources/dynamic-search-demo.gif)

> Searching for an API path and automatically updating the `path` variable on the dashboard.

## Why Dynamic Search?

Standard Grafana dropdowns work well for small, static lists. But what happens when you have thousands of pods, endpoints, or users? Static dropdowns become unusable.

Dynamic Search solves this by letting users type and search through values in real-time, with results filtered as they type. No more scrolling through endless dropdown menus.

## Features

- **Real-time Autocomplete** - Get suggestions from Prometheus as you type
- **Dynamic Variable Updates** - Instantly update dashboard variables without page reloads
- **Multiple Query Modes** - Query Label Values, Label Names, or Metrics
- **Regex Transformation** - Extract and format values on the fly using capture groups
- **Configurable Thresholds** - Control minimum characters and result limits
- **Performance Focused** - Efficient querying to keep your dashboard responsive

## Requirements

- Grafana 11.6.0 or later
- A Prometheus-compatible datasource

## Installation

### Grafana CLI

```bash
grafana-cli plugins install matheusmenses-dynamicsearch-panel
```

### Manual Installation

1. Download the latest release from the [GitHub Releases](https://github.com/matheus-meneses/grafana-dynamic-search/releases) page
2. Extract the archive into your Grafana plugins directory (typically `/var/lib/grafana/plugins`)
3. Restart Grafana

## Configuration

### Step 1: Create a Dashboard Variable

The panel updates a standard Grafana text variable.

1. Go to **Dashboard Settings** > **Variables**
2. Click **Add variable**
3. Select **Text box** as the type
4. Name it (e.g., `path`)
5. Save the variable

### Step 2: Add the Panel

1. Add a new visualization to your dashboard
2. Select **Dynamic Search** from the visualization list

### Step 3: Configure Panel Options

| Option              | Description                                                       | Example               | Default        |
|---------------------|-------------------------------------------------------------------|-----------------------|----------------|
| **Datasource**      | The Prometheus datasource to query                                | `Prometheus`          | -              |
| **Query Type**      | What to search for (see [Query Types](#query-types))              | `Label values`        | `Label values` |
| **Label**           | The label to query (required for Label Values)                    | `path`                | -              |
| **Metric**          | Metric context for the label (recommended for performance)        | `http_requests_total` | -              |
| **Target Variable** | The dashboard variable to update                                  | `path`                | -              |
| **Regex**           | Pattern to transform results (see [Regex](#regex-transformation)) | `^/api/(.*)`          | -              |
| **Min Characters**  | Characters required before searching                              | `3`                   | `3`            |
| **Max Results**     | Maximum suggestions to display (0 = unlimited)                    | `100`                 | `0`            |

### Step 4: Use the Variable in Other Panels

Reference the variable in your PromQL queries:

```promql
http_requests_total{path=~"$path"}
```

When you select a value in the search panel, `$path` updates and all panels using it refresh automatically.

## Query Types

| Type             | Description                              | Use Case                                            |
|------------------|------------------------------------------|-----------------------------------------------------|
| **Label Values** | Fetches values for a specific label      | Search for a specific `path`, `pod`, or `instance`  |
| **Label Names**  | Fetches all label names for a metric     | Explore available dimensions on a metric            |
| **Metrics**      | Fetches metric names matching the input  | Discover available metrics in the datasource        |

## Regex Transformation

Use regular expressions to extract specific parts of returned values. The plugin uses the **first capture group** `(.*)` as the result.

| Pattern         | Input         | Result    |
|-----------------|---------------|-----------|
| `^/(.*)`        | `/metrics`    | `metrics` |
| `instance-(.*)` | `instance-01` | `01`      |
| `.*-(.*)-.*`    | `prod-api-v1` | `api`     |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on setting up the development environment.

## Feedback

Found a bug or have a feature request?

- [Report a Bug](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=bug_report.md)
- [Request a Feature](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=feature_request.md)

## License

[Apache-2.0](LICENSE) © Matheus Meneses
