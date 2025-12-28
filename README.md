# Grafana Dynamic Search Panel

[![CI](https://github.com/matheus-meneses/grafana-dynamic-search/actions/workflows/ci.yml/badge.svg)](https://github.com/matheus-meneses/grafana-dynamic-search/actions/workflows/ci.yml)
[![Coverage](https://codecov.io/gh/matheus-meneses/grafana-dynamic-search/graph/badge.svg)](https://codecov.io/gh/matheus-meneses/grafana-dynamic-search)
[![License](https://img.shields.io/github/license/matheus-meneses/grafana-dynamic-search)](LICENSE)
[![Grafana](https://img.shields.io/badge/Grafana-11.6.0%2B-orange)](https://grafana.com)

**Grafana Dynamic Search** is a powerful panel plugin that brings real-time, dynamic search capabilities to your
dashboards. It allows users to query Prometheus directly from a search box, offering autocomplete suggestions for
labels, metrics, and values, and instantly updating dashboard variables based on the selection.

This plugin bridges the gap between static dropdowns and raw PromQL, giving your users a fluid, interactive way to
filter and explore data.

## Features

- **Real-time Autocomplete**: Get suggestions from Prometheus as you type.
- **Dynamic Variable Updates**: Instantly update dashboard variables without page reloads.
- **Multiple Query Modes**: Support for querying Label Values, Label Names, and Metrics.
- **Regex Transformation**: Powerful regex support to extract and format values on the fly.
- **Customizable**: Control search behavior with minimum characters and result limits.
- **Performance Focused**: Efficient querying to keep your dashboard responsive.

## See it in action

<!--
TODO: Add GIFs demonstrating the plugin here.
Suggested GIFs:
1. Basic search and variable update.
2. Using Regex to transform results.
-->

> **Example**: Searching for a `pod` name and automatically filtering all other panels on the dashboard.

## Installation

### Grafana CLI

```bash
grafana-cli plugins install matheusmenses-dynamicsearch-panel
```

### Manual

1. Download the latest release from
   the [GitHub Releases](https://github.com/matheus-meneses/grafana-dynamic-search/releases).
2. Extract the zip file into your Grafana plugins directory (usually `/var/lib/grafana/plugins`).
3. Restart Grafana.

## Configuration

### Step 1: Create a Dashboard Variable

The panel works by updating a standard Grafana variable.

1. Go to **Dashboard Settings** > **Variables**.
2. Click **Add variable**.
3. Select **Text box** as the type.
4. Name it (e.g., `my_search_filter`).
5. Save the variable.

### Step 2: Add the Panel

1. Add a new visualization to your dashboard.
2. Select **Dynamic Search** from the visualization list.

### Step 3: Configure Options

| Option              | Description                                                                  | Example                       | Default         | Required |
|---------------------|------------------------------------------------------------------------------|-------------------------------|-----------------|----------|
| **Datasource**      | The Prometheus datasource to query.                                          | `Prometheus`                  | -               | Yes      |
| **Query Type**      | What to search for. See [Query Types](#query-types) below.                   | `Label values`                | `Label values`  | Yes      |
| **Label**           | The specific label to query (required for Label Values).                     | `job` or `instance`           | -               | Yes*     |
| **Metric**          | The metric context for the label (optional but recommended for performance). | `up` or `http_requests_total` | -               | Yes      |
| **Target Variable** | The variable name from Step 1.                                               | `my_search_filter`            | -               | Yes      |
| **Regex**           | Optional regex pattern to clean up results.                                  | `^/api/(.*)`                  | -               | No       |
| **Min Characters**  | Minimum characters typed before triggering a search.                         | `3`                           | `3`             | No       |
| **Max Results**     | Maximum number of suggestions to display.                                    | `100`                         | `0` (Unlimited) | No       |

_* Required only for Label Values query type._

### Step 4: Link Other Panels

In your other panels (Time Series, Bar Gauge, etc.), use the variable in your PromQL queries:

```promql
http_requests_total{job=~"$my_search_filter"}
```

Now, when you select a value in the search box, `$my_search_filter` updates, and your charts refresh automatically!

## Query Types

| Type             | Description                                     | Use Case                                                   |
|------------------|-------------------------------------------------|------------------------------------------------------------|
| **Label Values** | Fetches values for a specific label.            | Searching for a specific `host`, `pod_name`, or `user_id`. |
| **Label Names**  | Fetches all available label names for a metric. | Exploring what dimensions are available on a metric.       |
| **Metrics**      | Fetches metric names matching the input.        | Discovering available metrics in the datasource.           |

## Regex Transformation

You can use standard Regex (Regular Expressions) to extract specific parts of the returned values. The plugin uses the *
*first capture group** `(.*)` as the display and value.

**Examples:**

| Regex Pattern   | Raw Input     | Result    |
|-----------------|---------------|-----------|
| `^/(.*)`        | `/metrics`    | `metrics` |
| `instance-(.*)` | `instance-01` | `01`      |
| `.*-(.*)-.*`    | `prod-api-v1` | `api`     |

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md) for instructions on how to set up the development environment.

## Feedback

Found a bug or have a feature request? Please open an issue:

- [Bug Report](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=bug_report.md)
- [Feature Request](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=feature_request.md)

## License

[Apache-2.0](LICENSE) © Matheus Meneses
