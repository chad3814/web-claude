/**
 * Represents the current state of the WebSocket connection.
 */
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

/**
 * Configuration options for the WebSocket client.
 */
export interface WebSocketOptions {
  /** Enable automatic reconnection on disconnect (default: true) */
  reconnect?: boolean;
  /** Initial delay before first reconnect attempt in ms (default: 1000) */
  reconnectInterval?: number;
  /** Exponential backoff multiplier (default: 2) */
  reconnectDecay?: number;
  /** Maximum number of reconnection attempts (default: 10) */
  maxReconnectAttempts?: number;
  /** Maximum delay between reconnect attempts in ms (default: 30000) */
  maxReconnectInterval?: number;
  /** Connection timeout in ms (default: 5000) */
  timeout?: number;
}

/**
 * Standard WebSocket message format.
 */
export interface WebSocketMessage {
  /** The type of message */
  type: 'user_message' | 'assistant_message' | 'stream_chunk' | 'error' | 'system' | 'ping' | 'pong';
  /** The message payload */
  data: unknown;
  /** Unix timestamp in milliseconds */
  timestamp: number;
}

/**
 * Format for streaming response chunks.
 */
export interface StreamChunk {
  /** Unique identifier for the conversation */
  conversationId: string;
  /** Unique identifier for the message */
  messageId: string;
  /** The content chunk */
  content: string;
  /** Whether this is the final chunk in the stream */
  isComplete: boolean;
}

/**
 * WebSocket client event types.
 */
export type EventType = 'open' | 'close' | 'error' | 'message' | 'reconnecting' | 'reconnected';

/**
 * Event callback function type.
 */
export type EventCallback = (data?: unknown) => void;
