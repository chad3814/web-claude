# WebSocket Client

A robust WebSocket client for real-time communication with automatic reconnection, message queuing, and heartbeat monitoring.

## Features

- **Automatic Reconnection**: Exponential backoff strategy with configurable retry limits
- **Message Queuing**: Queues messages when offline and sends them on reconnection
- **Heartbeat Monitoring**: Application-level ping/pong to detect connection health
- **Event-Based API**: Clean event emitter pattern for lifecycle management
- **Tab Visibility Handling**: Pauses heartbeat when tab is hidden, reconnects when visible
- **TypeScript Support**: Full type safety with comprehensive interfaces
- **Browser-Native**: Uses native WebSocket API, no external dependencies

## Installation

The WebSocket client is part of the web package:

```typescript
import { WebSocketClient } from './lib';
```

## Basic Usage

```typescript
import { WebSocketClient } from './lib';

// Create a client instance
const client = new WebSocketClient('ws://localhost:3000/ws');

// Listen for events
client.on('open', () => {
  console.log('Connected!');
});

client.on('message', (message) => {
  console.log('Received:', message);
});

client.on('error', (error) => {
  console.error('Error:', error);
});

// Connect to server
await client.connect();

// Send a message
client.send({
  type: 'user_message',
  data: { text: 'Hello, server!' },
  timestamp: Date.now(),
});

// Disconnect when done
client.disconnect();
```

## Configuration Options

```typescript
const client = new WebSocketClient('ws://localhost:3000/ws', {
  reconnect: true,                // Enable automatic reconnection
  reconnectInterval: 1000,        // Initial reconnect delay (ms)
  reconnectDecay: 2,              // Exponential backoff multiplier
  maxReconnectAttempts: 10,       // Max reconnection attempts
  maxReconnectInterval: 30000,    // Max delay between reconnects (ms)
  timeout: 5000,                  // Connection timeout (ms)
});
```

## Events

The client emits the following events:

### `open`
Fired when connection is established.

```typescript
client.on('open', () => {
  console.log('Connection established');
});
```

### `close`
Fired when connection is closed.

```typescript
client.on('close', (data) => {
  console.log('Connection closed:', data.code, data.reason);
});
```

### `error`
Fired when an error occurs.

```typescript
client.on('error', (error) => {
  console.error('Error:', error);
});
```

### `message`
Fired when a message is received (excludes ping/pong).

```typescript
client.on('message', (message) => {
  console.log('Message:', message);
});
```

### `reconnecting`
Fired when attempting to reconnect.

```typescript
client.on('reconnecting', (data) => {
  console.log(`Reconnecting (attempt ${data.attempt}, delay ${data.delay}ms)`);
});
```

### `reconnected`
Fired when successfully reconnected after a disconnect.

```typescript
client.on('reconnected', () => {
  console.log('Successfully reconnected');
});
```

## Message Format

All messages follow this structure:

```typescript
interface WebSocketMessage {
  type: 'user_message' | 'assistant_message' | 'stream_chunk' | 'error' | 'system' | 'ping' | 'pong';
  data: unknown;
  timestamp: number;
}
```

### Stream Chunks

For streaming responses, use the `StreamChunk` format:

```typescript
interface StreamChunk {
  conversationId: string;
  messageId: string;
  content: string;
  isComplete: boolean;
}
```

Example:

```typescript
client.on('message', (message) => {
  if (message.type === 'stream_chunk') {
    const chunk = message.data as StreamChunk;
    console.log(chunk.content);

    if (chunk.isComplete) {
      console.log('Stream complete');
    }
  }
});
```

## Advanced Usage

### URL Auto-Detection

The client automatically detects the protocol based on the page URL:

```typescript
// On http://example.com
const client = new WebSocketClient('/ws');  // → ws://example.com/ws

// On https://example.com
const client = new WebSocketClient('/ws');  // → wss://example.com/ws

// Explicit URL
const client = new WebSocketClient('wss://api.example.com/ws');
```

### Message Queuing

Messages sent while disconnected are automatically queued (max 50):

```typescript
// Send even when disconnected
client.send({
  type: 'user_message',
  data: { text: 'This will be queued' },
  timestamp: Date.now(),
});

// Messages are sent in order when reconnected
```

### Heartbeat Monitoring

The client automatically sends ping messages every 30 seconds and expects a pong within 5 seconds. If no pong is received, it triggers a reconnection.

```typescript
// Server should respond to ping messages:
{
  type: 'ping',
  data: null,
  timestamp: 1234567890
}

// With a pong:
{
  type: 'pong',
  data: null,
  timestamp: 1234567890
}
```

### Tab Visibility Handling

The client automatically handles browser tab visibility:

- **Tab hidden**: Stops heartbeat to save resources
- **Tab visible**: Resumes heartbeat and checks connection health
- **Tab visible + disconnected**: Attempts to reconnect

### Cleanup

Always call `destroy()` when you're done with the client:

```typescript
// Clean up resources
client.destroy();
```

This clears all event listeners, timeouts, and closes the connection.

## Connection States

The client maintains the following states:

- `connecting`: Establishing connection
- `connected`: Connection active
- `disconnected`: No connection
- `reconnecting`: Attempting to reconnect

Check the current state:

```typescript
const state = client.getState();
const isConnected = client.isConnected();
```

## Error Handling

The client handles various error scenarios:

1. **Connection Timeout**: No response from server within timeout period
2. **Invalid Messages**: JSON parsing errors are caught and emitted as errors
3. **WebSocket Not Supported**: Throws error if browser doesn't support WebSocket
4. **Max Reconnect Attempts**: Stops reconnecting after max attempts reached
5. **Heartbeat Failure**: Triggers reconnection if pong not received

## React Example

```typescript
import { useEffect, useState } from 'react';
import { WebSocketClient, type WebSocketMessage } from './lib';

function ChatComponent() {
  const [client, setClient] = useState<WebSocketClient | null>(null);
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);

  useEffect(() => {
    const ws = new WebSocketClient('ws://localhost:3000/ws');

    ws.on('message', (message) => {
      setMessages((prev) => [...prev, message as WebSocketMessage]);
    });

    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
    });

    ws.connect();
    setClient(ws);

    return () => {
      ws.destroy();
    };
  }, []);

  const sendMessage = (text: string) => {
    client?.send({
      type: 'user_message',
      data: { text },
      timestamp: Date.now(),
    });
  };

  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{JSON.stringify(msg)}</div>
      ))}
      <button onClick={() => sendMessage('Hello!')}>Send</button>
    </div>
  );
}
```

## Browser Compatibility

The client uses the native WebSocket API, which is supported in all modern browsers:

- Chrome 16+
- Firefox 11+
- Safari 7+
- Edge 12+
- Opera 12.1+

## License

Part of the web-claude monorepo project.
