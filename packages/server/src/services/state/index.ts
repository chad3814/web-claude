/**
 * State management module for session and message handling.
 *
 * @module state
 */

export { SessionStore } from './session-store.js';
export type {
  Session,
  Message,
  MessageRole,
  MessageMetadata,
  TokenUsage,
  SessionStoreConfig,
} from './types.js';
export {
  SessionNotFoundError,
  SessionLimitExceededError,
  MessageLimitExceededError,
  InvalidMessageError,
} from './types.js';
export {
  generateMessageId,
  generateSessionId,
  createMessage,
  filterMessagesByRole,
  filterMessagesByTimeRange,
  getRecentMessages,
  messageExists,
  calculateTotalTokens,
} from './utils.js';
export { getSessionStore, resetSessionStore, hasSessionStore } from './singleton.js';
export { loadConfig, DEFAULT_CONFIG } from './config.js';
