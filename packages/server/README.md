# @web-claude/server

Backend server package for Web Claude built with Fastify and TypeScript.

## Overview

This package contains the Node.js server that handles:
- Anthropic API integration (to be implemented)
- WebSocket connections for real-time communication (to be implemented)
- State management (to be implemented)
- Request routing and validation

## Setup

### Prerequisites

- Node.js 20.x or higher
- npm 10.x or higher

### Installation

From the monorepo root:

```bash
npm install
```

### Environment Variables

Create a `.env` file in `packages/server/` based on `.env.example`:

```bash
# Server Configuration
PORT=3000              # Port the server will listen on
HOST=0.0.0.0          # Host address (0.0.0.0 for all interfaces)
NODE_ENV=development  # Environment: development or production
```

## Available Scripts

### Development Mode

Run the server with hot reload (automatically restarts on file changes):

```bash
npm run dev
```

The server will start on the configured port (default: 3000) with pretty-printed logs.

### Production Build

Compile TypeScript to JavaScript:

```bash
npm run build
```

Output will be in the `dist/` directory.

### Production Mode

Run the compiled production build:

```bash
npm run start
```

### Type Checking

Validate TypeScript types without emitting files:

```bash
npm run typecheck
```

## API Endpoints

### Health Check

**GET /health**

Returns the server health status.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-01-28T01:54:29.618Z",
  "uptime": 123.45,
  "environment": "development"
}
```

**Status Code:** 200 OK

## Development Workflow

1. Create a `.env` file with your configuration
2. Run `npm run dev` to start the development server
3. The server will automatically restart when you modify files
4. Check `http://localhost:3000/health` to verify the server is running

## Architecture

### Directory Structure

```
packages/server/
├── src/
│   ├── index.ts        # Server entry point
│   ├── config/         # Configuration files (future)
│   ├── routes/         # Route handlers (future)
│   └── types/          # TypeScript type definitions (future)
├── dist/               # Compiled output (gitignored)
├── package.json
├── tsconfig.json
└── README.md
```

### Features

- **Fastify Framework**: High-performance web framework with schema validation
- **TypeScript**: Full type safety with strict mode enabled
- **CORS Support**: Configured for local development (localhost origins)
- **Environment Variables**: dotenv for configuration management
- **Logging**: Fastify's built-in Pino logger with pretty printing in development
- **Error Handling**: Centralized error handler with appropriate status codes
- **Graceful Shutdown**: Proper cleanup on SIGTERM/SIGINT signals
- **Hot Reload**: nodemon + tsx for fast development iteration

## Technical Details

### TypeScript Configuration

- Target: ES2022 (modern Node.js LTS)
- Module: ESNext with bundler resolution
- Strict mode: enabled for type safety
- Source maps: enabled for debugging

### Server Configuration

- Logger: Pino with pretty printing in development, JSON in production
- Trust proxy: enabled for deployment behind reverse proxies
- Request timeout: 30 seconds

### CORS Configuration

In development, CORS allows requests from:
- http://localhost:3000
- http://localhost:5173
- http://127.0.0.1:3000
- http://127.0.0.1:5173

In production, CORS is disabled by default.

## Future Features

The following features will be added in subsequent specs:
- Anthropic API integration
- WebSocket server for real-time communication
- State management system
- Request routing and validation
- Authentication and authorization
