export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'reconnecting';

export interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  reconnectDecay?: number;
  maxReconnectAttempts?: number;
  maxReconnectInterval?: number;
  timeout?: number;
}

export interface WebSocketMessage {
  type: 'user_message' | 'assistant_message' | 'stream_chunk' | 'error' | 'system' | 'ping' | 'pong';
  data: unknown;
  timestamp: number;
}

export interface StreamChunk {
  conversationId: string;
  messageId: string;
  content: string;
  isComplete: boolean;
}

export type EventType = 'open' | 'close' | 'error' | 'message' | 'reconnecting' | 'reconnected';

export type EventCallback = (data?: unknown) => void;
