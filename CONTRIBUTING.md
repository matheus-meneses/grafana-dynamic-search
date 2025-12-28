# Contributing

Thank you for your interest in contributing to the Grafana Dynamic Search Panel.

## Development Setup

### Prerequisites

- Node.js 18 or higher
- npm 9 or higher
- Docker (for running local Grafana)

### Getting Started

1. Clone the repository:
   ```bash
   git clone git@github.com:matheus-meneses/grafana-dynamic-search.git
   cd grafana-dynamic-search
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start development mode (watches for changes):
   ```bash
   npm run dev
   ```

4. Start Grafana with the plugin:
   ```bash
   npm run server
   ```

5. Access Grafana at http://localhost:3000 (default credentials: admin/admin)

## Available Commands

| Command            | Description               |
|--------------------|---------------------------|
| `npm run dev`      | Build in watch mode       |
| `npm run build`    | Production build          |
| `npm run server`   | Start Grafana with Docker |
| `npm run test`     | Run tests                 |
| `npm run test:ci`  | Run tests (CI mode)       |
| `npm run lint`     | Run linter                |
| `npm run lint:fix` | Fix lint errors           |

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

## Making Changes

1. Create a feature branch from `develop`:
   ```bash
   git checkout develop
   git checkout -b feature/your-feature-name
   ```

2. Make your changes

3. Run tests and linting:
   ```bash
   npm run lint
   npm run test:ci
   ```

4. Commit your changes following conventional commits:
   ```bash
   git commit -m "feat: add new feature"
   git commit -m "fix: resolve issue with X"
   ```

5. Push and create a pull request to `develop`

## Commit Message Format

Use conventional commits:

- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, no logic change)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Code Style

- Follow existing code patterns
- Use TypeScript types
- Keep components focused and small
- Use Grafana UI components from `@grafana/ui`
