import type { WebSocket } from 'ws';

/**
 * Client -> Server message types
 */
export interface ClientMessage {
  type: 'user_message';
  content: string;
  sessionId: string;
}

/**
 * Server -> Client message types
 */
export type ServerMessageType = 'stream_start' | 'stream_chunk' | 'stream_end' | 'error' | 'connection_established';

export interface ServerMessage {
  type: ServerMessageType;
  content?: string;
  error?: string;
  sessionId: string;
}

/**
 * Connection info stored for each active WebSocket connection
 */
export interface ConnectionInfo {
  sessionId: string;
  socket: WebSocket;
  connectedAt: Date;
}
