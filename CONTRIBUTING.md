# Contributing

Thank you for your interest in contributing to the Grafana Dynamic Search Panel!

## Development Setup

### Prerequisites

- Node.js 22 or higher
- npm 9 or higher
- Docker (for running local Grafana)

### Getting Started

1. **Fork** the repository on GitHub.

2. **Clone** your fork:
   ```bash
   git clone git@github.com:YOUR_USERNAME/grafana-dynamic-search.git
   cd grafana-dynamic-search
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start development mode (watches for changes):
   ```bash
   npm run dev
   ```

5. Start Grafana and Prometheus with the plugin:
   ```bash
   npm run server
   ```
   > **Note**: This command runs `docker compose up --build`. It automatically spins up:
   > - **Grafana** (with the plugin installed) at [http://localhost:3000](http://localhost:3000)
   > - **Prometheus** (configured as a datasource) at [http://localhost:9090](http://localhost:9090)
   >
   > Prometheus is pre-configured to scrape itself, generating sample metrics like `prometheus_http_requests_total` so you can test the search panel immediately.
   > A sample dashboard is also provisioned to get you started quickly.

6. Access Grafana at [http://localhost:3000](http://localhost:3000) (default credentials: `admin`/`admin`).

## Making Changes

1. **Fork** the repository on GitHub (if you haven't already).

2. Create a feature branch from `main`:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. Make your changes.

4. **Verify** your changes:
   ```bash
   npm run lint
   npm run test:coverage
   ```

5. **Commit** your changes following [Conventional Commits](https://www.conventionalcommits.org/):
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue with search logic"
   ```

6. **Push** to your fork and create a **Pull Request** to the `main` branch of the original repository.

## Reporting Issues

If you find a bug or have a feature request, please open an issue using one of our templates:

- [Bug Report](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=bug_report.md)
- [Feature Request](https://github.com/matheus-meneses/grafana-dynamic-search/issues/new?template=feature_request.md)

## Project Structure

```
src/
├── components/
│   ├── DynamicSearchPanel.tsx     # Main panel component
│   ├── DataSourcePickerEditor.tsx # Datasource selector for options
│   └── RegexEditor.tsx           # Regex input with validation
├── module.ts                     # Plugin registration and options
├── types.ts                      # TypeScript interfaces
└── plugin.json                   # Plugin metadata
```

## Code Style

- Use **TypeScript** for everything.
- Prefer **Functional Components** with React Hooks.
- Use **Grafana UI** components (`@grafana/ui`) whenever possible.
- Ensure all tests pass (`npm run test:coverage`).
- Ensure no lint errors (`npm run lint`).
