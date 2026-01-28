/**
 * Unit tests for cleanup and memory management.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStore } from '../session-store.js';
import { Message } from '../types.js';

describe('Cleanup and Memory Management', () => {
  let store: SessionStore;

  beforeEach(() => {
    store = new SessionStore();
  });

  afterEach(() => {
    store.stopCleanup();
  });

  describe('Session Limits', () => {
    it('should enforce max sessions limit', () => {
      const smallStore = new SessionStore({ maxSessions: 5 });

      for (let i = 1; i <= 10; i++) {
        smallStore.createSession(`session-${i}`);
      }

      expect(smallStore.getSessionCount()).toBe(5);
    });

    it('should evict oldest sessions using LRU', () => {
      const smallStore = new SessionStore({ maxSessions: 3 });

      const s1 = smallStore.createSession('session-1');
      const s2 = smallStore.createSession('session-2');
      const s3 = smallStore.createSession('session-3');

      // Update s2's activity to make it newer
      smallStore.updateMetadata('session-2', { updated: true });

      // Create s4, should evict s1 (oldest activity)
      smallStore.createSession('session-4');

      expect(smallStore.getSession('session-1')).toBeNull();
      expect(smallStore.getSession('session-2')).not.toBeNull();
      expect(smallStore.getSession('session-3')).not.toBeNull();
      expect(smallStore.getSession('session-4')).not.toBeNull();
    });

    it('should handle rapid session creation under limit', () => {
      const store = new SessionStore({ maxSessions: 100 });

      for (let i = 0; i < 50; i++) {
        store.createSession();
      }

      expect(store.getSessionCount()).toBe(50);
    });
  });

  describe('Message Limits', () => {
    it('should enforce max messages per session', () => {
      const smallStore = new SessionStore({ maxMessagesPerSession: 5 });
      smallStore.createSession('test-session');

      for (let i = 1; i <= 10; i++) {
        const msg: Message = {
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'assistant' : 'user',
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        };
        smallStore.addMessage('test-session', msg);
      }

      const messages = smallStore.getMessages('test-session');
      expect(messages).toHaveLength(5);
      expect(messages[0].id).toBe('msg-6'); // Oldest messages removed
      expect(messages[4].id).toBe('msg-10');
    });

    it('should maintain chronological order after pruning', () => {
      const smallStore = new SessionStore({ maxMessagesPerSession: 3 });
      smallStore.createSession('test-session');

      for (let i = 1; i <= 5; i++) {
        const msg: Message = {
          id: `msg-${i}`,
          role: 'user',
          content: `Message ${i}`,
          timestamp: 1000 + i * 100,
        };
        smallStore.addMessage('test-session', msg);
      }

      const messages = smallStore.getMessages('test-session');
      expect(messages).toHaveLength(3);
      expect(messages[0].timestamp).toBeLessThan(messages[1].timestamp);
      expect(messages[1].timestamp).toBeLessThan(messages[2].timestamp);
    });
  });

  describe('Stale Session Cleanup', () => {
    it('should remove sessions older than TTL', () => {
      const session1 = store.createSession('session-1');
      const session2 = store.createSession('session-2');
      const session3 = store.createSession('session-3');

      // Make session-1 and session-2 stale
      session1.lastActivity = Date.now() - 2 * 60 * 60 * 1000; // 2 hours ago
      session2.lastActivity = Date.now() - 3 * 60 * 60 * 1000; // 3 hours ago

      const removed = store.cleanupStaleSessions(60 * 60 * 1000); // 1 hour TTL

      expect(removed).toBe(2);
      expect(store.getSessionCount()).toBe(1);
      expect(store.getSession('session-3')).not.toBeNull();
    });

    it('should not remove active sessions', () => {
      store.createSession('session-1');
      store.createSession('session-2');

      const removed = store.cleanupStaleSessions(60 * 60 * 1000);

      expect(removed).toBe(0);
      expect(store.getSessionCount()).toBe(2);
    });

    it('should handle cleanup of empty store', () => {
      const removed = store.cleanupStaleSessions(60 * 60 * 1000);
      expect(removed).toBe(0);
    });

    it('should cleanup all sessions if all are stale', () => {
      const s1 = store.createSession('session-1');
      const s2 = store.createSession('session-2');
      const s3 = store.createSession('session-3');

      // Make all sessions stale
      s1.lastActivity = Date.now() - 10 * 60 * 60 * 1000;
      s2.lastActivity = Date.now() - 10 * 60 * 60 * 1000;
      s3.lastActivity = Date.now() - 10 * 60 * 60 * 1000;

      const removed = store.cleanupStaleSessions(60 * 60 * 1000);

      expect(removed).toBe(3);
      expect(store.getSessionCount()).toBe(0);
    });
  });

  describe('Periodic Cleanup', () => {
    it('should start periodic cleanup', () => {
      const store = new SessionStore({ cleanupInterval: 1000 });
      store.startCleanup();

      expect(store['cleanupTimer']).not.toBeNull();
      store.stopCleanup();
    });

    it('should not start cleanup twice', () => {
      const store = new SessionStore({ cleanupInterval: 1000 });
      store.startCleanup();
      const timer1 = store['cleanupTimer'];

      store.startCleanup();
      const timer2 = store['cleanupTimer'];

      expect(timer1).toBe(timer2);
      store.stopCleanup();
    });

    it('should stop periodic cleanup', () => {
      const store = new SessionStore({ cleanupInterval: 1000 });
      store.startCleanup();
      expect(store['cleanupTimer']).not.toBeNull();

      store.stopCleanup();
      expect(store['cleanupTimer']).toBeNull();
    });

    it('should cleanup stale sessions periodically', async () => {
      const store = new SessionStore({
        cleanupInterval: 50,
        sessionTTL: 100,
      });

      const session = store.createSession('test-session');
      session.lastActivity = Date.now() - 200; // Stale

      store.startCleanup();

      // Wait for cleanup to run
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(store.getSession('test-session')).toBeNull();
      store.stopCleanup();
    });
  });

  describe('Memory Monitoring', () => {
    it('should track session count accurately', () => {
      expect(store.getSessionCount()).toBe(0);

      store.createSession('s1');
      expect(store.getSessionCount()).toBe(1);

      store.createSession('s2');
      expect(store.getSessionCount()).toBe(2);

      store.deleteSession('s1');
      expect(store.getSessionCount()).toBe(1);

      store.clear();
      expect(store.getSessionCount()).toBe(0);
    });

    it('should handle large number of sessions', () => {
      const store = new SessionStore({ maxSessions: 500 });

      for (let i = 0; i < 300; i++) {
        store.createSession(`session-${i}`);
      }

      expect(store.getSessionCount()).toBe(300);
      expect(store.getAllSessionIds()).toHaveLength(300);
    });

    it('should handle sessions with many messages', () => {
      const store = new SessionStore({ maxMessagesPerSession: 500 });
      store.createSession('test-session');

      for (let i = 0; i < 300; i++) {
        const msg: Message = {
          id: `msg-${i}`,
          role: i % 2 === 0 ? 'user' : 'assistant',
          content: `Message ${i}`,
          timestamp: Date.now() + i,
        };
        store.addMessage('test-session', msg);
      }

      const messages = store.getMessages('test-session');
      expect(messages).toHaveLength(300);
    });
  });

  describe('Configuration', () => {
    it('should use custom session limit', () => {
      const store = new SessionStore({ maxSessions: 10 });
      expect(store['config'].maxSessions).toBe(10);
    });

    it('should use custom message limit', () => {
      const store = new SessionStore({ maxMessagesPerSession: 50 });
      expect(store['config'].maxMessagesPerSession).toBe(50);
    });

    it('should use custom TTL', () => {
      const store = new SessionStore({ sessionTTL: 12 * 60 * 60 * 1000 });
      expect(store['config'].sessionTTL).toBe(12 * 60 * 60 * 1000);
    });

    it('should use custom cleanup interval', () => {
      const store = new SessionStore({ cleanupInterval: 30 * 60 * 1000 });
      expect(store['config'].cleanupInterval).toBe(30 * 60 * 1000);
    });

    it('should merge custom config with defaults', () => {
      const store = new SessionStore({
        maxSessions: 500,
        cleanupInterval: 30 * 60 * 1000,
      });

      expect(store['config'].maxSessions).toBe(500);
      expect(store['config'].cleanupInterval).toBe(30 * 60 * 1000);
      expect(store['config'].maxMessagesPerSession).toBe(1000); // Default
      expect(store['config'].sessionTTL).toBe(24 * 60 * 60 * 1000); // Default
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid updates to same session', () => {
      store.createSession('test-session');

      for (let i = 0; i < 100; i++) {
        store.updateMetadata('test-session', { counter: i });
      }

      const session = store.getSession('test-session');
      expect(session?.metadata.counter).toBe(99);
    });

    it('should handle interleaved operations', () => {
      const store = new SessionStore({ maxSessions: 5, maxMessagesPerSession: 5 });

      for (let i = 0; i < 3; i++) {
        const sessionId = `session-${i}`;
        store.createSession(sessionId);

        for (let j = 0; j < 3; j++) {
          const msg: Message = {
            id: `${sessionId}-msg-${j}`,
            role: 'user',
            content: `Message ${j}`,
            timestamp: Date.now(),
          };
          store.addMessage(sessionId, msg);
        }
      }

      expect(store.getSessionCount()).toBe(3);
      expect(store.getMessages('session-0')).toHaveLength(3);
      expect(store.getMessages('session-1')).toHaveLength(3);
      expect(store.getMessages('session-2')).toHaveLength(3);
    });

    it('should clear all data safely', () => {
      for (let i = 0; i < 10; i++) {
        const sessionId = `session-${i}`;
        store.createSession(sessionId);
        const msg: Message = {
          id: `msg-${i}`,
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
        };
        store.addMessage(sessionId, msg);
      }

      expect(store.getSessionCount()).toBe(10);

      store.clear();

      expect(store.getSessionCount()).toBe(0);
      expect(store.getAllSessionIds()).toEqual([]);
    });
  });
});
