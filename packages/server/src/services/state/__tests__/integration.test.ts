/**
 * Integration tests for state management system.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getSessionStore,
  resetSessionStore,
  hasSessionStore,
  createMessage,
  filterMessagesByRole,
  calculateTotalTokens,
  getRecentMessages,
} from '../index.js';

describe('State Management Integration', () => {
  afterEach(() => {
    resetSessionStore();
  });

  describe('Singleton Instance', () => {
    it('should return the same instance on multiple calls', () => {
      const store1 = getSessionStore();
      const store2 = getSessionStore();
      expect(store1).toBe(store2);
    });

    it('should initialize instance on first call', () => {
      expect(hasSessionStore()).toBe(false);
      getSessionStore();
      expect(hasSessionStore()).toBe(true);
    });

    it('should reset instance', () => {
      getSessionStore();
      expect(hasSessionStore()).toBe(true);

      resetSessionStore();
      expect(hasSessionStore()).toBe(false);
    });

    it('should create new instance after reset', () => {
      const store1 = getSessionStore();
      resetSessionStore();
      const store2 = getSessionStore();
      expect(store1).not.toBe(store2);
    });
  });

  describe('End-to-End Conversation Flow', () => {
    it('should handle a complete conversation', () => {
      const store = getSessionStore();

      // Create session
      const session = store.createSession();
      expect(session.id).toBeDefined();
      expect(session.messages).toHaveLength(0);

      // User sends first message
      const msg1 = createMessage('user', 'Hello, Claude!');
      store.addMessage(session.id, msg1);

      // Assistant responds
      const msg2 = createMessage('assistant', 'Hello! How can I help you today?', {
        model: 'claude-3-opus-20240229',
        tokens: { input: 10, output: 15 },
      });
      store.addMessage(session.id, msg2);

      // User asks a question
      const msg3 = createMessage('user', 'What is the capital of France?');
      store.addMessage(session.id, msg3);

      // Assistant responds
      const msg4 = createMessage('assistant', 'The capital of France is Paris.', {
        model: 'claude-3-opus-20240229',
        tokens: { input: 25, output: 12 },
      });
      store.addMessage(session.id, msg4);

      // Verify conversation history
      const messages = store.getMessages(session.id);
      expect(messages).toHaveLength(4);
      expect(messages[0].content).toBe('Hello, Claude!');
      expect(messages[1].content).toBe('Hello! How can I help you today?');
      expect(messages[2].content).toBe('What is the capital of France?');
      expect(messages[3].content).toBe('The capital of France is Paris.');
    });

    it('should handle multiple concurrent sessions', () => {
      const store = getSessionStore();

      // Create multiple sessions
      const session1 = store.createSession();
      const session2 = store.createSession();
      const session3 = store.createSession();

      // Add messages to each session
      store.addMessage(session1.id, createMessage('user', 'Session 1 message'));
      store.addMessage(session2.id, createMessage('user', 'Session 2 message'));
      store.addMessage(session3.id, createMessage('user', 'Session 3 message'));

      // Verify isolation
      expect(store.getMessages(session1.id)).toHaveLength(1);
      expect(store.getMessages(session2.id)).toHaveLength(1);
      expect(store.getMessages(session3.id)).toHaveLength(1);

      expect(store.getMessages(session1.id)[0].content).toBe('Session 1 message');
      expect(store.getMessages(session2.id)[0].content).toBe('Session 2 message');
      expect(store.getMessages(session3.id)[0].content).toBe('Session 3 message');
    });
  });

  describe('Message Utilities Integration', () => {
    it('should filter and analyze conversation messages', () => {
      const store = getSessionStore();
      const session = store.createSession();

      // Add conversation
      store.addMessage(session.id, createMessage('user', 'Hello'));
      store.addMessage(session.id, createMessage('assistant', 'Hi there', {
        tokens: { input: 5, output: 10 },
      }));
      store.addMessage(session.id, createMessage('user', 'How are you?'));
      store.addMessage(session.id, createMessage('assistant', 'I am doing well, thank you!', {
        tokens: { input: 15, output: 20 },
      }));

      const messages = store.getMessages(session.id);

      // Filter by role
      const userMessages = filterMessagesByRole(messages, 'user');
      const assistantMessages = filterMessagesByRole(messages, 'assistant');

      expect(userMessages).toHaveLength(2);
      expect(assistantMessages).toHaveLength(2);

      // Calculate token usage
      const tokens = calculateTotalTokens(messages);
      expect(tokens.input).toBe(20);
      expect(tokens.output).toBe(30);

      // Get recent messages
      const recent = getRecentMessages(messages, 2);
      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe('How are you?');
      expect(recent[1].content).toBe('I am doing well, thank you!');
    });
  });

  describe('Session Lifecycle Integration', () => {
    it('should track session activity timestamps', () => {
      const store = getSessionStore();
      const session = store.createSession();

      const initialActivity = session.lastActivity;
      expect(session.createdAt).toBeLessThanOrEqual(initialActivity);

      // Wait a bit
      const msg = createMessage('user', 'Test');
      store.addMessage(session.id, msg);

      const updated = store.getSession(session.id);
      expect(updated!.lastActivity).toBeGreaterThanOrEqual(initialActivity);
    });

    it('should manage session metadata throughout lifecycle', () => {
      const store = getSessionStore();
      const session = store.createSession();

      // Initial metadata
      expect(session.metadata).toEqual({});

      // Add metadata
      store.updateMetadata(session.id, {
        userId: 'user-123',
        clientIp: '192.168.1.1',
      });

      let updated = store.getSession(session.id);
      expect(updated!.metadata.userId).toBe('user-123');
      expect(updated!.metadata.clientIp).toBe('192.168.1.1');

      // Update metadata
      store.updateMetadata(session.id, {
        conversationType: 'support',
      });

      updated = store.getSession(session.id);
      expect(updated!.metadata.userId).toBe('user-123');
      expect(updated!.metadata.conversationType).toBe('support');
    });
  });

  describe('Memory Management Integration', () => {
    it('should handle session limit gracefully', () => {
      resetSessionStore();
      process.env.SESSION_STORE_MAX_SESSIONS = '3';

      const store = getSessionStore();

      // Create 4 sessions
      const s1 = store.createSession('session-1');
      const s2 = store.createSession('session-2');
      const s3 = store.createSession('session-3');
      const s4 = store.createSession('session-4');

      // Should only have 3 sessions (oldest evicted)
      expect(store.getSessionCount()).toBe(3);
      expect(store.getSession('session-1')).toBeNull();
      expect(store.getSession('session-4')).not.toBeNull();

      delete process.env.SESSION_STORE_MAX_SESSIONS;
    });

    it('should handle message limit gracefully', () => {
      resetSessionStore();
      process.env.SESSION_STORE_MAX_MESSAGES_PER_SESSION = '3';

      const store = getSessionStore();
      const session = store.createSession();

      // Add 5 messages
      for (let i = 1; i <= 5; i++) {
        store.addMessage(session.id, createMessage('user', `Message ${i}`));
      }

      // Should only have 3 messages (oldest removed)
      const messages = store.getMessages(session.id);
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('Message 3');
      expect(messages[2].content).toBe('Message 5');

      delete process.env.SESSION_STORE_MAX_MESSAGES_PER_SESSION;
    });
  });

  describe('Real-World Scenarios', () => {
    it('should handle WebSocket-style interaction pattern', () => {
      const store = getSessionStore();

      // Simulate WebSocket connection
      const session = store.createSession();

      // Update with connection metadata
      store.updateMetadata(session.id, {
        connectedAt: Date.now(),
        clientIp: '192.168.1.100',
      });

      // Simulate multiple message exchanges
      for (let i = 0; i < 5; i++) {
        // User message
        store.addMessage(session.id, createMessage('user', `Question ${i + 1}`));

        // Assistant response
        store.addMessage(session.id, createMessage('assistant', `Answer ${i + 1}`, {
          model: 'claude-3-opus-20240229',
          tokens: { input: 10 + i, output: 15 + i },
        }));
      }

      // Verify conversation
      const messages = store.getMessages(session.id);
      expect(messages).toHaveLength(10);

      // Calculate total tokens used
      const tokens = calculateTotalTokens(messages);
      expect(tokens.input).toBe(60); // 10+11+12+13+14
      expect(tokens.output).toBe(85); // 15+16+17+18+19

      // Update final metadata
      store.updateMetadata(session.id, {
        disconnectedAt: Date.now(),
        totalMessages: messages.length,
        totalTokens: tokens.input + tokens.output,
      });

      const finalSession = store.getSession(session.id);
      expect(finalSession!.metadata.totalMessages).toBe(10);
      expect(finalSession!.metadata.totalTokens).toBe(145);
    });

    it('should handle session cleanup after inactivity', async () => {
      resetSessionStore();
      process.env.SESSION_STORE_TTL_HOURS = '0.00001'; // Very short TTL
      process.env.SESSION_STORE_CLEANUP_INTERVAL_MINUTES = '0.0001'; // Fast cleanup

      const store = getSessionStore();
      const session = store.createSession();

      // Manually set old timestamp
      const retrieved = store.getSession(session.id);
      retrieved!.lastActivity = Date.now() - 1000; // 1 second ago

      // Wait for cleanup
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Session should be cleaned up
      expect(store.getSession(session.id)).toBeNull();

      delete process.env.SESSION_STORE_TTL_HOURS;
      delete process.env.SESSION_STORE_CLEANUP_INTERVAL_MINUTES;
    });

    it('should handle rapid message additions', () => {
      const store = getSessionStore();
      const session = store.createSession();

      // Rapidly add messages
      for (let i = 0; i < 50; i++) {
        const role = i % 2 === 0 ? 'user' : 'assistant';
        store.addMessage(session.id, createMessage(role, `Message ${i}`));
      }

      const messages = store.getMessages(session.id);
      expect(messages).toHaveLength(50);

      // Verify order is maintained
      for (let i = 0; i < 50; i++) {
        expect(messages[i].content).toBe(`Message ${i}`);
      }
    });

    it('should isolate sessions even with same message content', () => {
      const store = getSessionStore();

      const session1 = store.createSession();
      const session2 = store.createSession();

      const content = 'Identical message content';

      store.addMessage(session1.id, createMessage('user', content));
      store.addMessage(session2.id, createMessage('user', content));

      const messages1 = store.getMessages(session1.id);
      const messages2 = store.getMessages(session2.id);

      expect(messages1).toHaveLength(1);
      expect(messages2).toHaveLength(1);
      expect(messages1[0].id).not.toBe(messages2[0].id); // Different message IDs
    });
  });

  describe('Error Handling Integration', () => {
    it('should handle invalid operations gracefully', () => {
      const store = getSessionStore();

      // Try to get non-existent session
      expect(store.getSession('invalid-id')).toBeNull();

      // Try to delete non-existent session
      expect(store.deleteSession('invalid-id')).toBe(false);

      // Try to add message to non-existent session
      expect(() => {
        store.addMessage('invalid-id', createMessage('user', 'Test'));
      }).toThrow();
    });
  });
});
