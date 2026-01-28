/**
 * Unit tests for state management utilities.
 */

import { describe, it, expect } from 'vitest';
import {
  generateMessageId,
  generateSessionId,
  createMessage,
  filterMessagesByRole,
  filterMessagesByTimeRange,
  getRecentMessages,
  messageExists,
  calculateTotalTokens,
} from '../utils.js';
import { Message } from '../types.js';

describe('State Management Utils', () => {
  describe('generateMessageId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateMessageId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateMessageId();
      const id2 = generateMessageId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('generateSessionId', () => {
    it('should generate a valid UUID v4', () => {
      const id = generateSessionId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
      expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    });

    it('should generate unique IDs', () => {
      const id1 = generateSessionId();
      const id2 = generateSessionId();
      expect(id1).not.toBe(id2);
    });
  });

  describe('createMessage', () => {
    it('should create a message with auto-generated ID and timestamp', () => {
      const message = createMessage('user', 'Hello world');

      expect(message.id).toBeDefined();
      expect(message.role).toBe('user');
      expect(message.content).toBe('Hello world');
      expect(message.timestamp).toBeGreaterThan(0);
      expect(message.metadata).toBeUndefined();
    });

    it('should create a message with metadata', () => {
      const metadata = {
        model: 'claude-3-opus-20240229',
        tokens: { input: 10, output: 20 },
      };

      const message = createMessage('assistant', 'Hi there', metadata);

      expect(message.role).toBe('assistant');
      expect(message.content).toBe('Hi there');
      expect(message.metadata).toEqual(metadata);
    });

    it('should generate unique message IDs', () => {
      const msg1 = createMessage('user', 'Test 1');
      const msg2 = createMessage('user', 'Test 2');
      expect(msg1.id).not.toBe(msg2.id);
    });
  });

  describe('filterMessagesByRole', () => {
    const messages: Message[] = [
      createMessage('user', 'Message 1'),
      createMessage('assistant', 'Message 2'),
      createMessage('user', 'Message 3'),
      createMessage('assistant', 'Message 4'),
    ];

    it('should filter messages by user role', () => {
      const userMessages = filterMessagesByRole(messages, 'user');
      expect(userMessages).toHaveLength(2);
      expect(userMessages[0].content).toBe('Message 1');
      expect(userMessages[1].content).toBe('Message 3');
    });

    it('should filter messages by assistant role', () => {
      const assistantMessages = filterMessagesByRole(messages, 'assistant');
      expect(assistantMessages).toHaveLength(2);
      expect(assistantMessages[0].content).toBe('Message 2');
      expect(assistantMessages[1].content).toBe('Message 4');
    });

    it('should return empty array if no messages match', () => {
      const emptyMessages: Message[] = [];
      const filtered = filterMessagesByRole(emptyMessages, 'user');
      expect(filtered).toEqual([]);
    });
  });

  describe('filterMessagesByTimeRange', () => {
    const now = Date.now();
    const messages: Message[] = [
      { id: '1', role: 'user', content: 'Msg 1', timestamp: now - 1000 },
      { id: '2', role: 'assistant', content: 'Msg 2', timestamp: now - 500 },
      { id: '3', role: 'user', content: 'Msg 3', timestamp: now },
      { id: '4', role: 'assistant', content: 'Msg 4', timestamp: now + 500 },
    ];

    it('should filter messages within time range', () => {
      const filtered = filterMessagesByTimeRange(messages, now - 600, now + 100);
      expect(filtered).toHaveLength(2);
      expect(filtered[0].id).toBe('2');
      expect(filtered[1].id).toBe('3');
    });

    it('should include messages at boundaries', () => {
      const filtered = filterMessagesByTimeRange(messages, now - 1000, now);
      expect(filtered).toHaveLength(3);
      expect(filtered[0].id).toBe('1');
      expect(filtered[2].id).toBe('3');
    });

    it('should return empty array if no messages in range', () => {
      const filtered = filterMessagesByTimeRange(messages, now + 1000, now + 2000);
      expect(filtered).toEqual([]);
    });
  });

  describe('getRecentMessages', () => {
    const messages: Message[] = [
      createMessage('user', 'Msg 1'),
      createMessage('assistant', 'Msg 2'),
      createMessage('user', 'Msg 3'),
      createMessage('assistant', 'Msg 4'),
      createMessage('user', 'Msg 5'),
    ];

    it('should return last N messages', () => {
      const recent = getRecentMessages(messages, 2);
      expect(recent).toHaveLength(2);
      expect(recent[0].content).toBe('Msg 4');
      expect(recent[1].content).toBe('Msg 5');
    });

    it('should return all messages if count exceeds array length', () => {
      const recent = getRecentMessages(messages, 10);
      expect(recent).toHaveLength(5);
    });

    it('should return empty array if count is 0 or negative', () => {
      expect(getRecentMessages(messages, 0)).toHaveLength(0);
      expect(getRecentMessages(messages, -1)).toHaveLength(0);
      expect(getRecentMessages(messages, -10)).toHaveLength(0);
    });
  });

  describe('messageExists', () => {
    const messages: Message[] = [
      { id: 'msg-1', role: 'user', content: 'Test 1', timestamp: Date.now() },
      { id: 'msg-2', role: 'assistant', content: 'Test 2', timestamp: Date.now() },
    ];

    it('should return true if message ID exists', () => {
      expect(messageExists(messages, 'msg-1')).toBe(true);
      expect(messageExists(messages, 'msg-2')).toBe(true);
    });

    it('should return false if message ID does not exist', () => {
      expect(messageExists(messages, 'msg-3')).toBe(false);
      expect(messageExists(messages, 'non-existent')).toBe(false);
    });

    it('should handle empty array', () => {
      expect(messageExists([], 'msg-1')).toBe(false);
    });
  });

  describe('calculateTotalTokens', () => {
    it('should calculate total tokens across messages', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
          metadata: { tokens: { input: 10, output: 5 } },
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Response',
          timestamp: Date.now(),
          metadata: { tokens: { input: 20, output: 30 } },
        },
        {
          id: 'msg-3',
          role: 'user',
          content: 'Follow-up',
          timestamp: Date.now(),
          metadata: { tokens: { input: 15, output: 0 } },
        },
      ];

      const total = calculateTotalTokens(messages);
      expect(total.input).toBe(45);
      expect(total.output).toBe(35);
    });

    it('should handle messages without token metadata', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
        },
        {
          id: 'msg-2',
          role: 'assistant',
          content: 'Response',
          timestamp: Date.now(),
          metadata: { tokens: { input: 10, output: 20 } },
        },
      ];

      const total = calculateTotalTokens(messages);
      expect(total.input).toBe(10);
      expect(total.output).toBe(20);
    });

    it('should handle empty array', () => {
      const total = calculateTotalTokens([]);
      expect(total.input).toBe(0);
      expect(total.output).toBe(0);
    });

    it('should handle messages with metadata but no tokens', () => {
      const messages: Message[] = [
        {
          id: 'msg-1',
          role: 'user',
          content: 'Test',
          timestamp: Date.now(),
          metadata: { model: 'claude-3-opus-20240229' },
        },
      ];

      const total = calculateTotalTokens(messages);
      expect(total.input).toBe(0);
      expect(total.output).toBe(0);
    });
  });
});
