# @web-claude/server

Backend server package for Web Claude built with Fastify and TypeScript.

## Overview

This package contains the Node.js server that handles:
- Anthropic API integration with streaming support
- Conversation management and message history
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

# Anthropic API Configuration
ANTHROPIC_API_KEY=your_api_key_here  # Required: Get from https://console.anthropic.com/
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional: Claude model to use
ANTHROPIC_MAX_TOKENS=4096  # Optional: Max tokens per response
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

### Testing

Run unit and integration tests:

```bash
npm run test       # Run tests in watch mode
npm run test:run   # Run tests once
npm run test:ui    # Run tests with UI
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

### Chat Endpoints

#### Stream Chat Message

**POST /api/chat/stream**

Send a message to Claude and receive a streaming response using Server-Sent Events (SSE).

**Request Body:**
```json
{
  "conversationId": "optional-conversation-id",
  "message": "Your message to Claude"
}
```

**Response:** Server-Sent Events stream with the following event types:

```
data: {"type":"conversation_id","conversationId":"uuid"}
data: {"type":"start"}
data: {"type":"delta","text":"Hello"}
data: {"type":"delta","text":" there"}
data: {"type":"stop"}
```

**Status Codes:**
- `200 OK` - Successful streaming response
- `400 Bad Request` - Empty or invalid message
- `404 Not Found` - Conversation ID not found
- `429 Too Many Requests` - Rate limit exceeded
- `502 Bad Gateway` - Anthropic API error

**Example with curl:**
```bash
curl -N -X POST http://localhost:3000/api/chat/stream \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello, Claude!"}'
```

#### Get Conversation History

**GET /api/conversations/:id**

Retrieve the complete message history for a conversation.

**URL Parameters:**
- `id` - Conversation UUID

**Response:**
```json
{
  "id": "conversation-uuid",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    },
    {
      "role": "assistant",
      "content": "Hello! How can I help you today?"
    }
  ],
  "createdAt": "2026-01-28T01:54:29.618Z",
  "updatedAt": "2026-01-28T01:54:35.123Z"
}
```

**Status Codes:**
- `200 OK` - Conversation found
- `404 Not Found` - Conversation does not exist

**Example with curl:**
```bash
curl http://localhost:3000/api/conversations/your-conversation-id
```

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
│   ├── index.ts               # Server entry point
│   ├── routes/
│   │   └── chat.ts           # Chat API endpoints
│   ├── services/
│   │   ├── claude.ts         # Anthropic API integration
│   │   ├── conversation.ts   # Conversation management
│   │   └── __tests__/        # Service unit tests
│   └── __tests__/
│       └── integration.test.ts  # API integration tests
├── dist/                      # Compiled output (gitignored)
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

## Services

### ClaudeService

Handles all interactions with the Anthropic API:
- Streaming message responses with real-time text deltas
- Non-streaming message responses for testing
- Comprehensive error handling for rate limits, authentication, and API errors
- Automatic retry logic for transient failures

### ConversationManager

Manages conversation state and message history:
- In-memory storage using Map for fast access
- CRUD operations for conversations
- Message validation and error handling
- Thread-safe access to conversation data

## Testing

The package includes comprehensive test coverage:
- **Unit Tests**: 34 tests covering ClaudeService and ConversationManager
- **Integration Tests**: 9 tests covering API endpoints and request/response flows
- **Total Coverage**: 43 tests ensuring reliability

Run tests with `npm run test:run` to verify all functionality.

## Error Handling

The API uses standard HTTP status codes and returns consistent error responses:

```json
{
  "error": {
    "message": "Error description",
    "statusCode": 400
  }
}
```

Common error scenarios:
- `400` - Invalid request (empty message, invalid format)
- `404` - Resource not found (conversation doesn't exist)
- `429` - Rate limit exceeded (Anthropic API)
- `500` - Internal server error
- `502` - Anthropic API error

## Future Features

The following features will be added in subsequent specs:
- WebSocket server for real-time bi-directional communication
- State management system with persistence
- Authentication and authorization
- Database persistence for conversations
- Conversation TTL and cleanup
- Advanced Claude features (system prompts, tool use)
