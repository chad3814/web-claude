/**
 * Unit tests for SessionStore.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '../session-store.js';
import {
  SessionNotFoundError,
  SessionLimitExceededError,
  InvalidMessageError,
  Message,
} from '../types.js';

describe('SessionStore', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  afterEach(() => {
    store.stopCleanup();
  });

  describe('createSession', () => {
    it('should create a session with auto-generated ID', () => {
      const session = store.createSession();

      expect(session.id).toBeDefined();
      expect(typeof session.id).toBe('string');
      expect(session.messages).toEqual([]);
      expect(session.createdAt).toBeGreaterThan(0);
      expect(session.lastActivity).toBeGreaterThan(0);
      expect(session.metadata).toEqual({});
    });

    it('should create a session with provided ID', () => {
      const customId = 'custom-session-id';
      const session = store.createSession(customId);

      expect(session.id).toBe(customId);
      expect(session.messages).toEqual([]);
    });

    it('should create multiple unique sessions', () => {
      const session1 = store.createSession();
      const session2 = store.createSession();

      expect(session1.id).not.toBe(session2.id);
      expect(store.getSessionCount()).toBe(2);
    });

    it('should evict oldest session when limit reached', () => {
      const smallStore = new SessionStore({ maxSessions: 3 });

      const session1 = smallStore.createSession('session-1');
      const session2 = smallStore.createSession('session-2');
      const session3 = smallStore.createSession('session-3');

      // Session 4 should evict session 1 (oldest)
      const session4 = smallStore.createSession('session-4');

      expect(smallStore.getSessionCount()).toBe(3);
      expect(smallStore.getSession('session-1')).toBeNull();
      expect(smallStore.getSession('session-4')).not.toBeNull();
    });
  });

  describe('getSession', () => {
    it('should return session by ID', () => {
      const session = store.createSession('test-session');
      const retrieved = store.getSession('test-session');

      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('test-session');
    });

    it('should return null for non-existent session', () => {
      const retrieved = store.getSession('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('deleteSession', () => {
    it('should delete an existing session', () => {
      store.createSession('test-session');
      const deleted = store.deleteSession('test-session');

      expect(deleted).toBe(true);
      expect(store.getSession('test-session')).toBeNull();
      expect(store.getSessionCount()).toBe(0);
    });

    it('should return false when deleting non-existent session', () => {
      const deleted = store.deleteSession('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('addMessage', () => {
    it('should add a valid message to session', () => {
      const session = store.createSession('test-session');
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      store.addMessage('test-session', message);

      const messages = store.getMessages('test-session');
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual(message);
    });

    it('should throw SessionNotFoundError for non-existent session', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      expect(() => {
        store.addMessage('non-existent', message);
      }).toThrow(SessionNotFoundError);
    });

    it('should throw InvalidMessageError for invalid message', () => {
      store.createSession('test-session');

      const invalidMessage = {
        id: 'msg-1',
        role: 'invalid-role',
        content: 'Hello',
        timestamp: Date.now(),
      } as any;

      expect(() => {
        store.addMessage('test-session', invalidMessage);
      }).toThrow(InvalidMessageError);
    });

    it('should update lastActivity timestamp when adding message', () => {
      const session = store.createSession('test-session');
      const initialActivity = session.lastActivity;

      // Wait a bit to ensure timestamp difference
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      store.addMessage('test-session', message);

      const updated = store.getSession('test-session');
      expect(updated?.lastActivity).toBeGreaterThanOrEqual(initialActivity);
    });

    it('should maintain chronological order of messages', () => {
      store.createSession('test-session');

      const msg1: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'First',
        timestamp: 1000,
      };

      const msg2: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Second',
        timestamp: 2000,
      };

      const msg3: Message = {
        id: 'msg-3',
        role: 'user',
        content: 'Third',
        timestamp: 3000,
      };

      store.addMessage('test-session', msg1);
      store.addMessage('test-session', msg2);
      store.addMessage('test-session', msg3);

      const messages = store.getMessages('test-session');
      expect(messages[0].id).toBe('msg-1');
      expect(messages[1].id).toBe('msg-2');
      expect(messages[2].id).toBe('msg-3');
    });

    it('should remove oldest message when limit reached', () => {
      const smallStore = new SessionStore({ maxMessagesPerSession: 2 });
      smallStore.createSession('test-session');

      const msg1: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'First',
        timestamp: Date.now(),
      };

      const msg2: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Second',
        timestamp: Date.now(),
      };

      const msg3: Message = {
        id: 'msg-3',
        role: 'user',
        content: 'Third',
        timestamp: Date.now(),
      };

      smallStore.addMessage('test-session', msg1);
      smallStore.addMessage('test-session', msg2);
      smallStore.addMessage('test-session', msg3);

      const messages = smallStore.getMessages('test-session');
      expect(messages).toHaveLength(2);
      expect(messages[0].id).toBe('msg-2');
      expect(messages[1].id).toBe('msg-3');
    });
  });

  describe('getMessages', () => {
    it('should return all messages for a session', () => {
      store.createSession('test-session');

      const msg1: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      const msg2: Message = {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hi',
        timestamp: Date.now(),
      };

      store.addMessage('test-session', msg1);
      store.addMessage('test-session', msg2);

      const messages = store.getMessages('test-session');
      expect(messages).toHaveLength(2);
    });

    it('should return a copy of messages array', () => {
      store.createSession('test-session');

      const msg: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      };

      store.addMessage('test-session', msg);

      const messages1 = store.getMessages('test-session');
      const messages2 = store.getMessages('test-session');

      expect(messages1).not.toBe(messages2); // Different array instances
      expect(messages1).toEqual(messages2); // Same content
    });

    it('should throw SessionNotFoundError for non-existent session', () => {
      expect(() => {
        store.getMessages('non-existent');
      }).toThrow(SessionNotFoundError);
    });

    it('should return empty array for session with no messages', () => {
      store.createSession('test-session');
      const messages = store.getMessages('test-session');
      expect(messages).toEqual([]);
    });
  });

  describe('updateMetadata', () => {
    it('should update session metadata', () => {
      store.createSession('test-session');

      store.updateMetadata('test-session', { key1: 'value1' });

      const session = store.getSession('test-session');
      expect(session?.metadata).toEqual({ key1: 'value1' });
    });

    it('should merge new metadata with existing', () => {
      store.createSession('test-session');

      store.updateMetadata('test-session', { key1: 'value1' });
      store.updateMetadata('test-session', { key2: 'value2' });

      const session = store.getSession('test-session');
      expect(session?.metadata).toEqual({ key1: 'value1', key2: 'value2' });
    });

    it('should update lastActivity timestamp', () => {
      const session = store.createSession('test-session');
      const initialActivity = session.lastActivity;

      store.updateMetadata('test-session', { key: 'value' });

      const updated = store.getSession('test-session');
      expect(updated?.lastActivity).toBeGreaterThanOrEqual(initialActivity);
    });

    it('should throw SessionNotFoundError for non-existent session', () => {
      expect(() => {
        store.updateMetadata('non-existent', { key: 'value' });
      }).toThrow(SessionNotFoundError);
    });
  });

  describe('cleanupStaleSessions', () => {
    it('should remove sessions older than TTL', () => {
      const session1 = store.createSession('session-1');
      const session2 = store.createSession('session-2');

      // Manually set old timestamp for session 1
      session1.lastActivity = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago

      const removed = store.cleanupStaleSessions(60 * 60 * 1000); // 1 hour TTL

      expect(removed).toBe(1);
      expect(store.getSession('session-1')).toBeNull();
      expect(store.getSession('session-2')).not.toBeNull();
    });

    it('should not remove sessions within TTL', () => {
      store.createSession('session-1');
      store.createSession('session-2');

      const removed = store.cleanupStaleSessions(60 * 60 * 1000);

      expect(removed).toBe(0);
      expect(store.getSessionCount()).toBe(2);
    });

    it('should handle empty store', () => {
      const removed = store.cleanupStaleSessions(60 * 60 * 1000);
      expect(removed).toBe(0);
    });
  });

  describe('getSessionCount', () => {
    it('should return correct session count', () => {
      expect(store.getSessionCount()).toBe(0);

      store.createSession();
      expect(store.getSessionCount()).toBe(1);

      store.createSession();
      expect(store.getSessionCount()).toBe(2);

      store.deleteSession(store.getAllSessionIds()[0]);
      expect(store.getSessionCount()).toBe(1);
    });
  });

  describe('getAllSessionIds', () => {
    it('should return all session IDs', () => {
      store.createSession('session-1');
      store.createSession('session-2');
      store.createSession('session-3');

      const ids = store.getAllSessionIds();
      expect(ids).toHaveLength(3);
      expect(ids).toContain('session-1');
      expect(ids).toContain('session-2');
      expect(ids).toContain('session-3');
    });

    it('should return empty array for empty store', () => {
      const ids = store.getAllSessionIds();
      expect(ids).toEqual([]);
    });
  });

  describe('clear', () => {
    it('should remove all sessions', () => {
      store.createSession('session-1');
      store.createSession('session-2');
      store.createSession('session-3');

      expect(store.getSessionCount()).toBe(3);

      store.clear();

      expect(store.getSessionCount()).toBe(0);
      expect(store.getAllSessionIds()).toEqual([]);
    });
  });

  describe('startCleanup and stopCleanup', () => {
    it('should start periodic cleanup', () => {
      const store = new SessionStore({ cleanupInterval: 100 });
      store.startCleanup();

      // Cleanup timer should be set
      expect(store['cleanupTimer']).not.toBeNull();

      store.stopCleanup();
    });

    it('should not start cleanup twice', () => {
      const store = new SessionStore();
      store.startCleanup();
      const timer1 = store['cleanupTimer'];

      store.startCleanup();
      const timer2 = store['cleanupTimer'];

      expect(timer1).toBe(timer2);

      store.stopCleanup();
    });

    it('should stop cleanup', () => {
      store.startCleanup();
      expect(store['cleanupTimer']).not.toBeNull();

      store.stopCleanup();
      expect(store['cleanupTimer']).toBeNull();
    });
  });

  describe('message validation', () => {
    beforeEach(() => {
      store.createSession('test-session');
    });

    it('should reject message without ID', () => {
      const message = {
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
      } as any;

      expect(() => {
        store.addMessage('test-session', message);
      }).toThrow(InvalidMessageError);
    });

    it('should reject message with invalid role', () => {
      const message = {
        id: 'msg-1',
        role: 'system',
        content: 'Hello',
        timestamp: Date.now(),
      } as any;

      expect(() => {
        store.addMessage('test-session', message);
      }).toThrow(InvalidMessageError);
    });

    it('should reject message without content', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        timestamp: Date.now(),
      } as any;

      expect(() => {
        store.addMessage('test-session', message);
      }).toThrow(InvalidMessageError);
    });

    it('should reject message with invalid timestamp', () => {
      const message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: -1,
      } as any;

      expect(() => {
        store.addMessage('test-session', message);
      }).toThrow(InvalidMessageError);
    });

    it('should accept message with optional metadata', () => {
      const message: Message = {
        id: 'msg-1',
        role: 'user',
        content: 'Hello',
        timestamp: Date.now(),
        metadata: {
          model: 'claude-3-opus-20240229',
          tokens: {
            input: 10,
            output: 20,
          },
        },
      };

      expect(() => {
        store.addMessage('test-session', message);
      }).not.toThrow();

      const messages = store.getMessages('test-session');
      expect(messages[0].metadata).toEqual(message.metadata);
    });
  });

  describe('configuration', () => {
    it('should use default config when not provided', () => {
      const store = new SessionStore();
      expect(store['config'].maxSessions).toBe(1000);
      expect(store['config'].maxMessagesPerSession).toBe(1000);
      expect(store['config'].sessionTTL).toBe(24 * 60 * 60 * 1000);
      expect(store['config'].cleanupInterval).toBe(60 * 60 * 1000);
    });

    it('should override default config with provided values', () => {
      const store = new SessionStore({
        maxSessions: 500,
        maxMessagesPerSession: 100,
      });

      expect(store['config'].maxSessions).toBe(500);
      expect(store['config'].maxMessagesPerSession).toBe(100);
      expect(store['config'].sessionTTL).toBe(24 * 60 * 60 * 1000); // Default
    });
  });
});
