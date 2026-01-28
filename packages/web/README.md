# @web-claude/web

Web-based chat interface for Web Claude, built with React, TypeScript, and Vite.

## Overview

This package provides the frontend web client for interacting with Claude via WebSocket connection to the server. It features a modern React-based UI with real-time updates and a responsive design.

## Tech Stack

- **React 18+** - UI framework with concurrent features
- **TypeScript** - Type-safe development
- **Vite** - Fast build tool with HMR
- **CSS** - Custom styling (no framework dependencies yet)

## Getting Started

### Prerequisites

- Node.js 18+ recommended
- npm or pnpm package manager

### Development

Run the development server with hot module replacement:

```bash
# From the web package directory
npm run dev

# Or from the monorepo root
npm run web:dev
```

The dev server will start on http://localhost:5173

### Production Build

Build the optimized production bundle:

```bash
# From the web package directory
npm run build

# Or from the monorepo root
npm run web:build
```

The build output will be in the `dist/` directory.

### Preview Production Build

Preview the production build locally:

```bash
# From the web package directory
npm run preview

# Or from the monorepo root
npm run web:preview
```

### Type Checking

Run TypeScript type checking without emitting files:

```bash
npm run typecheck
```

## Project Structure

```
packages/web/
├── index.html           # HTML entry point
├── package.json         # Package configuration
├── tsconfig.json        # TypeScript config for app code
├── tsconfig.node.json   # TypeScript config for Vite config
├── vite.config.ts       # Vite configuration
├── README.md            # This file
├── public/              # Static assets (served as-is)
└── src/                 # Source code
    ├── main.tsx         # Application entry point
    ├── App.tsx          # Root React component
    ├── App.css          # App-specific styles
    └── index.css        # Global styles and CSS reset
```

## Current Features

- Minimal chat interface placeholder
- WebSocket connection status indicator (UI only, not functional yet)
- Responsive layout
- Dark theme styling

## Upcoming Features

The following features will be implemented in future specs:

- WebSocket connection implementation
- Chat message handling
- Message history display
- Real-time message updates
- User input processing

## Development Notes

- HMR (Hot Module Replacement) is enabled - changes to React components will update instantly
- TypeScript strict mode is enabled for better type safety
- Source maps are generated in production builds for debugging
- The app uses React 18's automatic JSX runtime (no need to import React in every file)

## Configuration

### Vite Configuration

The Vite config (`vite.config.ts`) includes:
- React plugin for JSX transformation and Fast Refresh
- Dev server on port 5173
- Source map generation for production builds

### TypeScript Configuration

The TypeScript config (`tsconfig.json`) extends the root monorepo config and adds:
- React JSX support with `react-jsx` transform
- DOM type definitions
- ES2020 target for modern JavaScript features
- Bundler module resolution for Vite compatibility

## Troubleshooting

### Port Already in Use

If port 5173 is already in use, Vite will automatically try the next available port.

### Build Errors

Make sure all dependencies are installed:

```bash
npm install
```

### TypeScript Errors

Run type checking to see detailed error messages:

```bash
npm run typecheck
```

## Contributing

When adding new features:

1. Follow the existing code structure
2. Use TypeScript for type safety
3. Keep components small and focused
4. Add appropriate error handling
5. Test in both development and production builds

## License

See the root LICENSE file.
