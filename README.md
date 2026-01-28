# Web Claude

A modern web-based interface for interacting with Claude AI, built as a monorepo with a Node.js server and web client.

## Architecture Overview

This project is structured as a monorepo containing two main packages:

- **`@web-claude/server`**: Node.js backend server that handles Anthropic API integration and WebSocket connections
- **`@web-claude/web`**: Web-based frontend client for the chat interface

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.15.0 or higher (recommended package manager)

## Installation

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd web-claude
   ```

2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Set up environment variables:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

## Development Workflow

### Run all packages in development mode
```bash
pnpm dev
```

### Build all packages
```bash
pnpm build
```

### Type check all packages
```bash
pnpm typecheck
```

### Clean build artifacts and node_modules
```bash
pnpm clean
```

### Run commands in a specific package
```bash
# Run dev in server package only
pnpm --filter @web-claude/server dev

# Run build in web package only
pnpm --filter @web-claude/web build
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start all packages in development mode (parallel) |
| `pnpm build` | Build all packages for production |
| `pnpm typecheck` | Run TypeScript type checking across all packages |
| `pnpm clean` | Remove node_modules and build artifacts from all packages |

## Environment Variables

The following environment variables are required:

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Node environment (development, production, test) | `development` |
| `PORT` | Server port number | `3000` |
| `ANTHROPIC_API_KEY` | Your Anthropic API key (get from https://console.anthropic.com/) | - |

See `.env.example` for a template configuration file.

## Project Structure

```
web-claude/
├── packages/
│   ├── server/              # Backend server package
│   │   ├── src/             # Server source code
│   │   ├── package.json     # Server dependencies and scripts
│   │   ├── tsconfig.json    # Server TypeScript config
│   │   └── README.md        # Server documentation
│   └── web/                 # Frontend web package
│       ├── src/             # Web source code
│       ├── package.json     # Web dependencies and scripts
│       ├── tsconfig.json    # Web TypeScript config
│       └── README.md        # Web documentation
├── .gitignore               # Git ignore patterns
├── .env.example             # Environment variable template
├── package.json             # Root workspace configuration
├── pnpm-workspace.yaml      # pnpm workspace definition
├── tsconfig.json            # Shared TypeScript configuration
├── LICENSE                  # MIT License
└── README.md                # This file
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style and conventions
- Write meaningful commit messages
- Add tests for new features
- Update documentation as needed
- Ensure all tests pass before submitting PR
- Run `pnpm typecheck` to verify TypeScript types
