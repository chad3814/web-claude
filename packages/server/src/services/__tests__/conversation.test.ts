import { describe, it, expect, beforeEach } from 'vitest';
import {
  ConversationManager,
  ConversationNotFoundError,
  InvalidMessageError,
} from '../conversation';

describe('ConversationManager', () => {
  let manager: ConversationManager;

  beforeEach(() => {
    manager = new ConversationManager();
  });

  describe('createConversation', () => {
    it('should create a new conversation with unique ID', () => {
      const conv1 = manager.createConversation();
      const conv2 = manager.createConversation();

      expect(conv1.id).toBeTruthy();
      expect(conv2.id).toBeTruthy();
      expect(conv1.id).not.toBe(conv2.id);
    });

    it('should initialize with empty messages array', () => {
      const conversation = manager.createConversation();

      expect(conversation.messages).toEqual([]);
      expect(conversation.messages).toHaveLength(0);
    });

    it('should set createdAt and updatedAt timestamps', () => {
      const beforeCreate = new Date();
      const conversation = manager.createConversation();
      const afterCreate = new Date();

      expect(conversation.createdAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(conversation.createdAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
      expect(conversation.updatedAt.getTime()).toBeGreaterThanOrEqual(beforeCreate.getTime());
      expect(conversation.updatedAt.getTime()).toBeLessThanOrEqual(afterCreate.getTime());
    });
  });

  describe('getConversation', () => {
    it('should retrieve existing conversation by ID', () => {
      const created = manager.createConversation();
      const retrieved = manager.getConversation(created.id);

      expect(retrieved).toBeTruthy();
      expect(retrieved?.id).toBe(created.id);
    });

    it('should return null for non-existent conversation', () => {
      const result = manager.getConversation('non-existent-id');
      expect(result).toBeNull();
    });
  });

  describe('addUserMessage', () => {
    it('should add user message to conversation', () => {
      const conversation = manager.createConversation();
      manager.addUserMessage(conversation.id, 'Hello, Claude!');

      const messages = manager.getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: 'user',
        content: 'Hello, Claude!',
      });
    });

    it('should trim whitespace from message content', () => {
      const conversation = manager.createConversation();
      manager.addUserMessage(conversation.id, '  Hello  ');

      const messages = manager.getMessages(conversation.id);
      expect(messages[0].content).toBe('Hello');
    });

    it('should throw error for empty message', () => {
      const conversation = manager.createConversation();

      expect(() => manager.addUserMessage(conversation.id, '')).toThrow(InvalidMessageError);
      expect(() => manager.addUserMessage(conversation.id, '   ')).toThrow(InvalidMessageError);
    });

    it('should throw error for non-existent conversation', () => {
      expect(() => manager.addUserMessage('non-existent-id', 'Hello')).toThrow(
        ConversationNotFoundError
      );
    });

    it('should update updatedAt timestamp', async () => {
      const conversation = manager.createConversation();
      const originalUpdatedAt = conversation.updatedAt;

      await new Promise(resolve => setTimeout(resolve, 10));
      manager.addUserMessage(conversation.id, 'Hello');

      const updated = manager.getConversation(conversation.id);
      expect(updated?.updatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  describe('addAssistantMessage', () => {
    it('should add assistant message to conversation', () => {
      const conversation = manager.createConversation();
      manager.addAssistantMessage(conversation.id, 'Hello! How can I help you?');

      const messages = manager.getMessages(conversation.id);
      expect(messages).toHaveLength(1);
      expect(messages[0]).toEqual({
        role: 'assistant',
        content: 'Hello! How can I help you?',
      });
    });

    it('should trim whitespace from message content', () => {
      const conversation = manager.createConversation();
      manager.addAssistantMessage(conversation.id, '  Response  ');

      const messages = manager.getMessages(conversation.id);
      expect(messages[0].content).toBe('Response');
    });

    it('should throw error for empty message', () => {
      const conversation = manager.createConversation();

      expect(() => manager.addAssistantMessage(conversation.id, '')).toThrow(InvalidMessageError);
      expect(() => manager.addAssistantMessage(conversation.id, '   ')).toThrow(
        InvalidMessageError
      );
    });

    it('should throw error for non-existent conversation', () => {
      expect(() => manager.addAssistantMessage('non-existent-id', 'Hello')).toThrow(
        ConversationNotFoundError
      );
    });
  });

  describe('getMessages', () => {
    it('should return messages in order', () => {
      const conversation = manager.createConversation();
      manager.addUserMessage(conversation.id, 'First message');
      manager.addAssistantMessage(conversation.id, 'Second message');
      manager.addUserMessage(conversation.id, 'Third message');

      const messages = manager.getMessages(conversation.id);
      expect(messages).toHaveLength(3);
      expect(messages[0].content).toBe('First message');
      expect(messages[0].role).toBe('user');
      expect(messages[1].content).toBe('Second message');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].content).toBe('Third message');
      expect(messages[2].role).toBe('user');
    });

    it('should return a copy of messages array', () => {
      const conversation = manager.createConversation();
      manager.addUserMessage(conversation.id, 'Hello');

      const messages1 = manager.getMessages(conversation.id);
      const messages2 = manager.getMessages(conversation.id);

      expect(messages1).not.toBe(messages2);
      expect(messages1).toEqual(messages2);
    });

    it('should throw error for non-existent conversation', () => {
      expect(() => manager.getMessages('non-existent-id')).toThrow(ConversationNotFoundError);
    });
  });

  describe('deleteConversation', () => {
    it('should delete conversation', () => {
      const conversation = manager.createConversation();
      expect(manager.getConversation(conversation.id)).toBeTruthy();

      manager.deleteConversation(conversation.id);
      expect(manager.getConversation(conversation.id)).toBeNull();
    });

    it('should not throw error when deleting non-existent conversation', () => {
      expect(() => manager.deleteConversation('non-existent-id')).not.toThrow();
    });
  });

  describe('getConversationCount', () => {
    it('should return correct conversation count', () => {
      expect(manager.getConversationCount()).toBe(0);

      manager.createConversation();
      expect(manager.getConversationCount()).toBe(1);

      manager.createConversation();
      expect(manager.getConversationCount()).toBe(2);

      const conv = manager.createConversation();
      manager.deleteConversation(conv.id);
      expect(manager.getConversationCount()).toBe(2);
    });
  });

  describe('clearAll', () => {
    it('should clear all conversations', () => {
      manager.createConversation();
      manager.createConversation();
      manager.createConversation();

      expect(manager.getConversationCount()).toBe(3);

      manager.clearAll();
      expect(manager.getConversationCount()).toBe(0);
    });
  });

  describe('conversation workflow', () => {
    it('should handle full conversation flow', () => {
      const conversation = manager.createConversation();

      manager.addUserMessage(conversation.id, 'What is the capital of France?');
      manager.addAssistantMessage(conversation.id, 'The capital of France is Paris.');
      manager.addUserMessage(conversation.id, 'What is its population?');
      manager.addAssistantMessage(
        conversation.id,
        'Paris has a population of approximately 2.2 million people.'
      );

      const messages = manager.getMessages(conversation.id);
      expect(messages).toHaveLength(4);
      expect(messages[0].role).toBe('user');
      expect(messages[1].role).toBe('assistant');
      expect(messages[2].role).toBe('user');
      expect(messages[3].role).toBe('assistant');
    });
  });
});
