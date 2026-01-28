/**
 * State management type definitions for session and message handling.
 */

/**
 * Message role - either user or assistant.
 */
export type MessageRole = 'user' | 'assistant';

/**
 * Token usage metadata for a message.
 */
export interface TokenUsage {
  input: number;
  output: number;
}

/**
 * Message metadata including model and token information.
 */
export interface MessageMetadata {
  model?: string;
  tokens?: TokenUsage;
}

/**
 * Individual message in a conversation.
 */
export interface Message {
  /** Unique message identifier */
  id: string;
  /** Message role (user or assistant) */
  role: MessageRole;
  /** Message content */
  content: string;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Optional metadata */
  metadata?: MessageMetadata;
}

/**
 * Session representing a conversation context.
 */
export interface Session {
  /** Unique session identifier (UUID v4) */
  id: string;
  /** Array of messages in chronological order */
  messages: Message[];
  /** Session creation timestamp (Unix ms) */
  createdAt: number;
  /** Last activity timestamp (Unix ms) */
  lastActivity: number;
  /** Optional extensibility metadata */
  metadata: Record<string, any>;
}

/**
 * Configuration options for SessionStore.
 */
export interface SessionStoreConfig {
  /** Maximum number of sessions to maintain (default: 1000) */
  maxSessions?: number;
  /** Maximum messages per session (default: 1000) */
  maxMessagesPerSession?: number;
  /** Session time-to-live in milliseconds (default: 24 hours) */
  sessionTTL?: number;
  /** Cleanup interval in milliseconds (default: 1 hour) */
  cleanupInterval?: number;
}

/**
 * Error types for SessionStore operations.
 */
export class SessionNotFoundError extends Error {
  constructor(sessionId: string) {
    super(`Session not found: ${sessionId}`);
    this.name = 'SessionNotFoundError';
  }
}

export class SessionLimitExceededError extends Error {
  constructor(limit: number) {
    super(`Session limit exceeded: ${limit}`);
    this.name = 'SessionLimitExceededError';
  }
}

export class MessageLimitExceededError extends Error {
  constructor(sessionId: string, limit: number) {
    super(`Message limit exceeded for session ${sessionId}: ${limit}`);
    this.name = 'MessageLimitExceededError';
  }
}

export class InvalidMessageError extends Error {
  constructor(reason: string) {
    super(`Invalid message: ${reason}`);
    this.name = 'InvalidMessageError';
  }
}
