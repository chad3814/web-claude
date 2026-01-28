# State Management Module

A robust state management system for maintaining conversation state per WebSocket session with automatic cleanup and memory management.

## Features

- **Isolated Session State**: Each WebSocket session maintains its own conversation history
- **Automatic Cleanup**: Stale sessions are automatically removed based on configurable TTL
- **Memory Management**: Configurable limits for sessions and messages with LRU eviction
- **High Performance**: O(1) session lookups using Map-based storage
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Extensive Testing**: 86+ unit tests with excellent coverage

## Installation

This module is part of the `@web-claude/server` package and can be imported directly:

```typescript
import { getSessionStore, createMessage } from './services/state/index.js';
```

## Quick Start

### Using the Singleton Instance

The simplest way to use the state management system is through the singleton instance:

```typescript
import { getSessionStore, createMessage } from './services/state/index.js';

// Get the singleton instance (auto-configured from environment)
const store = getSessionStore();

// Create a new session
const session = store.createSession();
console.log(`Created session: ${session.id}`);

// Add messages to the session
const userMessage = createMessage('user', 'Hello, Claude!');
store.addMessage(session.id, userMessage);

const assistantMessage = createMessage('assistant', 'Hello! How can I help you today?', {
  model: 'claude-3-opus-20240229',
  tokens: { input: 10, output: 15 },
});
store.addMessage(session.id, assistantMessage);

// Retrieve conversation history
const messages = store.getMessages(session.id);
console.log(`Session has ${messages.length} messages`);
```

### Creating a Custom Instance

For more control, create your own SessionStore instance:

```typescript
import { SessionStore } from './services/state/index.js';

const store = new SessionStore({
  maxSessions: 500,
  maxMessagesPerSession: 100,
  sessionTTL: 12 * 60 * 60 * 1000, // 12 hours
  cleanupInterval: 30 * 60 * 1000,  // 30 minutes
});

// Start the periodic cleanup job
store.startCleanup();
```

## Configuration

### Environment Variables

The singleton instance can be configured via environment variables:

```bash
# Maximum number of sessions (default: 1000)
SESSION_STORE_MAX_SESSIONS=2000

# Maximum messages per session (default: 1000)
SESSION_STORE_MAX_MESSAGES_PER_SESSION=500

# Session TTL in hours (default: 24)
SESSION_STORE_TTL_HOURS=12

# Cleanup interval in minutes (default: 60)
SESSION_STORE_CLEANUP_INTERVAL_MINUTES=30
```

### Programmatic Configuration

```typescript
import { SessionStore, SessionStoreConfig } from './services/state/index.js';

const config: SessionStoreConfig = {
  maxSessions: 1000,           // Max concurrent sessions
  maxMessagesPerSession: 1000, // Max messages per session
  sessionTTL: 24 * 60 * 60 * 1000,  // 24 hours in ms
  cleanupInterval: 60 * 60 * 1000,   // 1 hour in ms
};

const store = new SessionStore(config);
```

## API Reference

### SessionStore

#### Constructor

```typescript
new SessionStore(config?: SessionStoreConfig)
```

Creates a new SessionStore instance with optional configuration.

#### Methods

##### createSession(sessionId?: string): Session

Creates a new session with an optional custom ID. If no ID is provided, a UUID v4 is generated.

```typescript
const session = store.createSession();
// or with custom ID
const session = store.createSession('custom-session-id');
```

##### getSession(sessionId: string): Session | null

Retrieves a session by ID. Returns null if the session doesn't exist.

```typescript
const session = store.getSession('session-id');
if (session) {
  console.log(`Session created at: ${new Date(session.createdAt)}`);
}
```

##### deleteSession(sessionId: string): boolean

Deletes a session. Returns true if the session was deleted, false if it didn't exist.

```typescript
const deleted = store.deleteSession('session-id');
```

##### addMessage(sessionId: string, message: Message): void

Adds a message to a session. Throws errors if the session doesn't exist or the message is invalid.

```typescript
const message = createMessage('user', 'Hello!');
store.addMessage('session-id', message);
```

##### getMessages(sessionId: string): Message[]

Retrieves all messages for a session in chronological order. Returns a copy to prevent external mutation.

```typescript
const messages = store.getMessages('session-id');
messages.forEach(msg => {
  console.log(`[${msg.role}]: ${msg.content}`);
});
```

##### updateMetadata(sessionId: string, metadata: Record<string, any>): void

Updates session metadata. New metadata is merged with existing metadata.

```typescript
store.updateMetadata('session-id', {
  userId: 'user-123',
  conversationType: 'support',
});
```

##### cleanupStaleSessions(ttlMs: number): number

Manually triggers cleanup of sessions older than the specified TTL. Returns the number of sessions removed.

```typescript
const removed = store.cleanupStaleSessions(24 * 60 * 60 * 1000); // 24 hours
console.log(`Removed ${removed} stale sessions`);
```

##### startCleanup(): void

Starts the periodic cleanup job. Called automatically by the singleton instance.

```typescript
store.startCleanup();
```

##### stopCleanup(): void

Stops the periodic cleanup job. Should be called when shutting down the application.

```typescript
store.stopCleanup();
```

##### getSessionCount(): number

Returns the current number of active sessions.

```typescript
console.log(`Active sessions: ${store.getSessionCount()}`);
```

##### getAllSessionIds(): string[]

Returns an array of all session IDs.

```typescript
const sessionIds = store.getAllSessionIds();
```

##### clear(): void

Removes all sessions. Useful for testing or manual cleanup.

```typescript
store.clear();
```

### Utility Functions

#### generateMessageId(): string

Generates a unique message ID (UUID v4).

```typescript
import { generateMessageId } from './services/state/index.js';

const id = generateMessageId();
```

#### generateSessionId(): string

Generates a unique session ID (UUID v4).

```typescript
import { generateSessionId } from './services/state/index.js';

const id = generateSessionId();
```

#### createMessage(role, content, metadata?): Message

Creates a complete message object with auto-generated ID and timestamp.

```typescript
import { createMessage } from './services/state/index.js';

const message = createMessage('user', 'Hello, world!', {
  model: 'claude-3-opus-20240229',
  tokens: { input: 10, output: 0 },
});
```

#### filterMessagesByRole(messages, role): Message[]

Filters messages by role (user or assistant).

```typescript
import { filterMessagesByRole } from './services/state/index.js';

const userMessages = filterMessagesByRole(messages, 'user');
const assistantMessages = filterMessagesByRole(messages, 'assistant');
```

#### filterMessagesByTimeRange(messages, startTime, endTime): Message[]

Filters messages within a time range (inclusive).

```typescript
import { filterMessagesByTimeRange } from './services/state/index.js';

const now = Date.now();
const oneHourAgo = now - 60 * 60 * 1000;
const recentMessages = filterMessagesByTimeRange(messages, oneHourAgo, now);
```

#### getRecentMessages(messages, count): Message[]

Gets the most recent N messages.

```typescript
import { getRecentMessages } from './services/state/index.js';

const lastFive = getRecentMessages(messages, 5);
```

#### messageExists(messages, messageId): boolean

Checks if a message ID exists in an array (for deduplication).

```typescript
import { messageExists } from './services/state/index.js';

if (!messageExists(messages, newMessage.id)) {
  messages.push(newMessage);
}
```

#### calculateTotalTokens(messages): { input: number, output: number }

Calculates total token usage across messages.

```typescript
import { calculateTotalTokens } from './services/state/index.js';

const totals = calculateTotalTokens(messages);
console.log(`Total tokens - Input: ${totals.input}, Output: ${totals.output}`);
```

## Types

### Message

```typescript
interface Message {
  id: string;              // Unique message ID (UUID v4)
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;       // Unix timestamp in milliseconds
  metadata?: MessageMetadata;
}
```

### Session

```typescript
interface Session {
  id: string;              // Unique session ID (UUID v4)
  messages: Message[];     // Messages in chronological order
  createdAt: number;       // Session creation timestamp
  lastActivity: number;    // Last activity timestamp
  metadata: Record<string, any>;  // Extensible metadata
}
```

### MessageMetadata

```typescript
interface MessageMetadata {
  model?: string;          // Claude model used
  tokens?: {
    input: number;         // Input tokens
    output: number;        // Output tokens
  };
}
```

### SessionStoreConfig

```typescript
interface SessionStoreConfig {
  maxSessions?: number;            // Default: 1000
  maxMessagesPerSession?: number;  // Default: 1000
  sessionTTL?: number;             // Default: 24 hours (in ms)
  cleanupInterval?: number;        // Default: 1 hour (in ms)
}
```

## Error Handling

The module provides custom error types for clear error handling:

### SessionNotFoundError

Thrown when attempting to access a non-existent session.

```typescript
try {
  store.addMessage('invalid-session-id', message);
} catch (error) {
  if (error instanceof SessionNotFoundError) {
    console.error('Session not found:', error.message);
  }
}
```

### InvalidMessageError

Thrown when attempting to add an invalid message.

```typescript
try {
  store.addMessage('session-id', invalidMessage);
} catch (error) {
  if (error instanceof InvalidMessageError) {
    console.error('Invalid message:', error.message);
  }
}
```

### SessionLimitExceededError

Thrown when session limit is reached and eviction fails.

### MessageLimitExceededError

Informational (logged, not thrown) when message limit is reached for a session.

## Memory Management

The SessionStore implements several strategies for memory management:

### Session Limits

When the maximum number of sessions is reached, the oldest session (by last activity) is automatically evicted using an LRU strategy.

```typescript
const store = new SessionStore({ maxSessions: 100 });
// Session 101 will evict the least recently used session
```

### Message Limits

When a session reaches its message limit, the oldest message is automatically removed to make room for new ones.

```typescript
const store = new SessionStore({ maxMessagesPerSession: 100 });
// Message 101 will remove the oldest message
```

### Automatic Cleanup

Stale sessions (inactive beyond TTL) are automatically removed by the periodic cleanup job.

```typescript
// Sessions inactive for more than 24 hours are removed hourly
const store = new SessionStore({
  sessionTTL: 24 * 60 * 60 * 1000,
  cleanupInterval: 60 * 60 * 1000,
});
store.startCleanup();
```

## Usage Examples

### WebSocket Integration

```typescript
import { getSessionStore, createMessage } from './services/state/index.js';
import { WebSocket } from 'ws';

const store = getSessionStore();

wss.on('connection', (ws: WebSocket) => {
  // Create session on connection
  const session = store.createSession();
  const sessionId = session.id;

  ws.on('message', async (data: string) => {
    // Parse user message
    const userMessage = createMessage('user', data);
    store.addMessage(sessionId, userMessage);

    // Get conversation history
    const messages = store.getMessages(sessionId);

    // Call Claude API with history
    const response = await callClaude(messages);

    // Store assistant response
    const assistantMessage = createMessage('assistant', response.content, {
      model: response.model,
      tokens: response.usage,
    });
    store.addMessage(sessionId, assistantMessage);

    // Send response to client
    ws.send(response.content);
  });

  ws.on('close', () => {
    // Optionally delete session on disconnect
    // or let it be cleaned up by TTL
    store.deleteSession(sessionId);
  });
});
```

### Session Metadata Tracking

```typescript
// Track additional session information
store.updateMetadata(sessionId, {
  userId: 'user-123',
  clientIp: req.ip,
  userAgent: req.headers['user-agent'],
  conversationType: 'support',
  startTime: Date.now(),
});

// Later, retrieve and use metadata
const session = store.getSession(sessionId);
if (session?.metadata.userId) {
  console.log(`Session belongs to user: ${session.metadata.userId}`);
}
```

### Token Usage Monitoring

```typescript
import { calculateTotalTokens, getSessionStore } from './services/state/index.js';

const store = getSessionStore();

// Monitor token usage for a session
const messages = store.getMessages(sessionId);
const totals = calculateTotalTokens(messages);

console.log(`Session token usage:
  Input tokens: ${totals.input}
  Output tokens: ${totals.output}
  Total: ${totals.input + totals.output}
`);

// Optionally store in session metadata
store.updateMetadata(sessionId, { totalTokens: totals });
```

## Testing

The module includes comprehensive test coverage (86+ tests):

```bash
# Run all state management tests
npm test -- src/services/state/

# Run specific test files
npm test -- session-store.test.ts
npm test -- utils.test.ts
npm test -- cleanup.test.ts
```

### Test Coverage

- Core data structures: 39 tests
- Message management utilities: 23 tests
- Cleanup and memory management: 24 tests

## Performance Characteristics

- **Session Lookup**: O(1) using Map
- **Message Retrieval**: O(1) for session lookup + O(n) for message array copy
- **Session Creation**: O(1) or O(n) if eviction needed
- **Cleanup**: O(n) where n is the number of sessions
- **Memory**: Bounded by `maxSessions * maxMessagesPerSession`

## Best Practices

1. **Use the Singleton**: For most applications, use `getSessionStore()` to ensure consistent state across your application.

2. **Configure via Environment**: Use environment variables for production configuration to avoid hardcoding values.

3. **Handle Errors**: Always wrap session operations in try-catch blocks to handle potential errors gracefully.

4. **Clean Up**: Call `stopCleanup()` when shutting down your application to prevent memory leaks.

5. **Monitor Memory**: Regularly check session counts in production to ensure limits are appropriate.

6. **Session IDs**: Let the system generate UUIDs rather than creating custom IDs unless you have a specific need.

7. **Metadata**: Use session metadata for extensibility rather than modifying the Session interface.

## Future Enhancements

Potential improvements for future versions:

- Database persistence for message history
- Redis-based session storage for multi-instance deployments
- Session export/import functionality
- Message search and filtering capabilities
- Session analytics and metrics
- Rate limiting per session
- Message compression for long conversations

## License

Part of the `@web-claude/server` package.
