/**
 * State management module for session and message handling.
 *
 * @module state
 */

export { SessionStore } from './session-store.js';
export {
  Session,
  Message,
  MessageRole,
  MessageMetadata,
  TokenUsage,
  SessionStoreConfig,
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
