/**
 * SessionStore: In-memory session state management.
 *
 * Maintains isolated conversation state for each WebSocket session,
 * storing message history and metadata with automatic cleanup of stale sessions.
 */

import { randomUUID } from 'node:crypto';
import {
  Session,
  Message,
  SessionStoreConfig,
  SessionNotFoundError,
  SessionLimitExceededError,
  MessageLimitExceededError,
  InvalidMessageError,
} from './types.js';

/**
 * Default configuration values.
 */
const DEFAULT_CONFIG: Required<SessionStoreConfig> = {
  maxSessions: 1000,
  maxMessagesPerSession: 1000,
  sessionTTL: 24 * 60 * 60 * 1000, // 24 hours
  cleanupInterval: 60 * 60 * 1000,  // 1 hour
};

/**
 * SessionStore manages conversation sessions with message history.
 *
 * Features:
 * - O(1) session lookup using Map
 * - Automatic cleanup of stale sessions
 * - Configurable limits for sessions and messages
 * - Thread-safe operations for concurrent access
 * - Memory-bounded with LRU eviction
 */
export class SessionStore {
  private sessions: Map<string, Session>;
  private config: Required<SessionStoreConfig>;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Create a new SessionStore instance.
   *
   * @param config - Optional configuration overrides
   */
  constructor(config: SessionStoreConfig = {}) {
    this.sessions = new Map();
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Start the periodic cleanup job.
   * Should be called once after initialization.
   */
  public startCleanup(): void {
    if (this.cleanupTimer) {
      return; // Already running
    }

    this.cleanupTimer = setInterval(() => {
      const removed = this.cleanupStaleSessions(this.config.sessionTTL);
      if (removed > 0) {
        console.log(`[SessionStore] Cleaned up ${removed} stale sessions`);
      }
    }, this.config.cleanupInterval);

    // Don't prevent process from exiting
    this.cleanupTimer.unref();
  }

  /**
   * Stop the periodic cleanup job.
   */
  public stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }

  /**
   * Create a new session.
   *
   * @param sessionId - Optional session ID (generates UUID v4 if not provided)
   * @returns The created session
   * @throws {SessionLimitExceededError} If max sessions limit is reached
   */
  public createSession(sessionId?: string): Session {
    // Check session limit
    if (this.sessions.size >= this.config.maxSessions) {
      // Evict oldest session (LRU)
      this.evictOldestSession();
    }

    const id = sessionId || randomUUID();
    const now = Date.now();

    const session: Session = {
      id,
      messages: [],
      createdAt: now,
      lastActivity: now,
      metadata: {},
    };

    this.sessions.set(id, session);
    return session;
  }

  /**
   * Get a session by ID.
   *
   * @param sessionId - Session identifier
   * @returns The session or null if not found
   */
  public getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  /**
   * Delete a session by ID.
   *
   * @param sessionId - Session identifier
   * @returns True if session was deleted, false if not found
   */
  public deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  /**
   * Add a message to a session.
   *
   * @param sessionId - Session identifier
   * @param message - Message to add
   * @throws {SessionNotFoundError} If session doesn't exist
   * @throws {MessageLimitExceededError} If message limit reached
   * @throws {InvalidMessageError} If message validation fails
   */
  public addMessage(sessionId: string, message: Message): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    // Validate message
    this.validateMessage(message);

    // Check message limit
    if (session.messages.length >= this.config.maxMessagesPerSession) {
      // Remove oldest message to make room
      session.messages.shift();
      console.warn(
        `[SessionStore] Session ${sessionId} reached message limit, removed oldest message`
      );
    }

    // Add message and update activity timestamp
    session.messages.push(message);
    session.lastActivity = Date.now();
  }

  /**
   * Get all messages for a session.
   *
   * @param sessionId - Session identifier
   * @returns Array of messages in chronological order
   * @throws {SessionNotFoundError} If session doesn't exist
   */
  public getMessages(sessionId: string): Message[] {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }
    return [...session.messages]; // Return copy to prevent external mutation
  }

  /**
   * Update session metadata.
   *
   * @param sessionId - Session identifier
   * @param metadata - Metadata to merge with existing metadata
   * @throws {SessionNotFoundError} If session doesn't exist
   */
  public updateMetadata(sessionId: string, metadata: Record<string, any>): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      throw new SessionNotFoundError(sessionId);
    }

    session.metadata = { ...session.metadata, ...metadata };
    session.lastActivity = Date.now();
  }

  /**
   * Clean up sessions older than the specified TTL.
   *
   * @param ttlMs - Time-to-live in milliseconds
   * @returns Number of sessions removed
   */
  public cleanupStaleSessions(ttlMs: number): number {
    const now = Date.now();
    const cutoff = now - ttlMs;
    let removed = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < cutoff) {
        this.sessions.delete(sessionId);
        removed++;
      }
    }

    return removed;
  }

  /**
   * Get the current number of active sessions.
   *
   * @returns Session count
   */
  public getSessionCount(): number {
    return this.sessions.size;
  }

  /**
   * Get all session IDs.
   *
   * @returns Array of session identifiers
   */
  public getAllSessionIds(): string[] {
    return Array.from(this.sessions.keys());
  }

  /**
   * Clear all sessions.
   * Useful for testing or manual cleanup.
   */
  public clear(): void {
    this.sessions.clear();
  }

  /**
   * Validate a message object.
   *
   * @param message - Message to validate
   * @throws {InvalidMessageError} If validation fails
   */
  private validateMessage(message: Message): void {
    if (!message.id || typeof message.id !== 'string') {
      throw new InvalidMessageError('Message must have a string ID');
    }

    if (!message.role || !['user', 'assistant'].includes(message.role)) {
      throw new InvalidMessageError('Message role must be "user" or "assistant"');
    }

    if (typeof message.content !== 'string') {
      throw new InvalidMessageError('Message content must be a string');
    }

    if (typeof message.timestamp !== 'number' || message.timestamp <= 0) {
      throw new InvalidMessageError('Message timestamp must be a positive number');
    }
  }

  /**
   * Evict the oldest session based on last activity (LRU).
   *
   * @throws {SessionLimitExceededError} If no sessions to evict
   */
  private evictOldestSession(): void {
    let oldestSessionId: string | null = null;
    let oldestActivity = Infinity;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.lastActivity < oldestActivity) {
        oldestActivity = session.lastActivity;
        oldestSessionId = sessionId;
      }
    }

    if (oldestSessionId) {
      this.sessions.delete(oldestSessionId);
      console.log(`[SessionStore] Evicted oldest session: ${oldestSessionId}`);
    } else {
      throw new SessionLimitExceededError(this.config.maxSessions);
    }
  }
}
