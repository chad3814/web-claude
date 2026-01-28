import { randomUUID } from 'crypto';
import type { ClaudeMessage } from './claude';

export interface Conversation {
  id: string;
  messages: ClaudeMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export class ConversationNotFoundError extends Error {
  constructor(conversationId: string) {
    super(`Conversation not found: ${conversationId}`);
    this.name = 'ConversationNotFoundError';
  }
}

export class InvalidMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMessageError';
  }
}

export class ConversationManager {
  private conversations: Map<string, Conversation>;

  constructor() {
    this.conversations = new Map();
  }

  /**
   * Create a new conversation session
   */
  createConversation(): Conversation {
    const conversation: Conversation = {
      id: randomUUID(),
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.conversations.set(conversation.id, conversation);
    return conversation;
  }

  /**
   * Get conversation by ID
   */
  getConversation(id: string): Conversation | null {
    return this.conversations.get(id) || null;
  }

  /**
   * Add a user message to conversation
   */
  addUserMessage(conversationId: string, content: string): void {
    if (!content || content.trim().length === 0) {
      throw new InvalidMessageError('Message content cannot be empty');
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    conversation.messages.push({
      role: 'user',
      content: content.trim(),
    });
    conversation.updatedAt = new Date();
  }

  /**
   * Add an assistant message to conversation
   */
  addAssistantMessage(conversationId: string, content: string): void {
    if (!content || content.trim().length === 0) {
      throw new InvalidMessageError('Message content cannot be empty');
    }

    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    conversation.messages.push({
      role: 'assistant',
      content: content.trim(),
    });
    conversation.updatedAt = new Date();
  }

  /**
   * Get all messages for a conversation
   */
  getMessages(conversationId: string): ClaudeMessage[] {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      throw new ConversationNotFoundError(conversationId);
    }

    return [...conversation.messages];
  }

  /**
   * Delete a conversation (cleanup)
   */
  deleteConversation(id: string): void {
    this.conversations.delete(id);
  }

  /**
   * Get the total number of conversations
   * Useful for monitoring and testing
   */
  getConversationCount(): number {
    return this.conversations.size;
  }

  /**
   * Clear all conversations
   * Useful for testing
   */
  clearAll(): void {
    this.conversations.clear();
  }
}
