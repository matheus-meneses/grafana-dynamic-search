# Grafana Dynamic Search Panel

A Grafana panel that provides a search box for querying Prometheus and updating dashboard variables in real-time.

## What it does

This panel allows you to:

1. Type in a search box
2. Get autocomplete suggestions from Prometheus (label values, label names, or metrics)
3. Select a value to update a dashboard variable
4. Other panels automatically refresh based on the selected value

## Installation

Copy the plugin folder to your Grafana plugins directory and restart Grafana.

## Usage

### Step 1: Create a dashboard variable

1. Open Dashboard Settings > Variables > Add variable
2. Set Type to **Text box**
3. Set Name to something like `myfilter`
4. Save the dashboard

### Step 2: Add the Dynamic Search panel

1. Add a new visualization and select **Dynamic Search**
2. Configure the panel options:

| Option | What to enter |
|--------|---------------|
| Datasource | Your Prometheus datasource |
| Query type | `Label values` (most common) |
| Label | The label to search, e.g. `handler` or `job` |
| Metric | The metric to query, e.g. `prometheus_http_requests_total` |
| Target Variable | The variable name from Step 1, e.g. `myfilter` |
| Regex | Optional: pattern to transform results |

### Step 3: Use the variable in other panels

In your other panels, reference the variable:

```promql
prometheus_http_requests_total{handler=~"$myfilter"}
```

When you select a value in the Dynamic Search panel, all panels using `$myfilter` will update.

## Query Types

| Type | Use case |
|------|----------|
| **Label values** | Get all values for a specific label (e.g., all `handler` values) |
| **Label names** | Get all label names available on a metric |
| **Metrics** | Get metric names matching a pattern |

## Regex Transformation

Use regex to extract parts of values. The first capture group `(.*)` becomes the result.

Examples:

| Regex | Input | Output |
|-------|-------|--------|
| `^/(.*)` | `/metrics` | `metrics` |
| `/api/(.*)` | `/api/v1/query` | `v1/query` |

## Requirements

- Grafana 11.6.0 or higher
- Prometheus datasource

## Author

Matheus Meneses
