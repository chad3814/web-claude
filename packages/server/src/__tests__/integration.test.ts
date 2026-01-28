import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import Fastify, { FastifyInstance } from 'fastify';
import { ClaudeService } from '../services/claude';
import { ConversationManager } from '../services/conversation';
import { chatRoutes } from '../routes/chat';

describe('API Integration Tests', () => {
  let app: FastifyInstance;
  let conversationManager: ConversationManager;

  beforeAll(async () => {
    // Create a mock Claude service for testing
    const mockClaudeService = {
      streamMessage: async (messages: any[], onChunk: any) => {
        // Simulate streaming response
        onChunk({ type: 'message_start' });
        onChunk({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'Hello' },
        });
        onChunk({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: ' World' },
        });
        onChunk({ type: 'message_stop' });
      },
      sendMessage: async (messages: any[]) => {
        return 'Test response';
      },
    } as unknown as ClaudeService;

    conversationManager = new ConversationManager();

    app = Fastify();
    await app.register(chatRoutes, {
      claudeService: mockClaudeService,
      conversationManager,
    });

    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/chat/stream', () => {
    it('should create new conversation if conversationId not provided', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {
          message: 'Hello, Claude!',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers['content-type']).toBe('text/event-stream');
      expect(response.body).toContain('conversation_id');
      expect(response.body).toContain('Hello');
      expect(response.body).toContain('World');
    });

    it('should return 400 for empty message', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {
          message: '',
        },
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      // Fastify validation error has a different structure
      expect(body.message || body.error?.message).toBeTruthy();
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {
          conversationId: 'non-existent-id',
          message: 'Hello',
        },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('not found');
    });

    it('should use existing conversation when conversationId provided', async () => {
      const conversation = conversationManager.createConversation();

      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {
          conversationId: conversation.id,
          message: 'Hello again!',
        },
      });

      expect(response.statusCode).toBe(200);
      expect(response.body).toContain(conversation.id);

      const messages = conversationManager.getMessages(conversation.id);
      expect(messages).toHaveLength(2); // User message + assistant message
    });
  });

  describe('GET /api/conversations/:id', () => {
    it('should return conversation history', async () => {
      const conversation = conversationManager.createConversation();
      conversationManager.addUserMessage(conversation.id, 'Hello');
      conversationManager.addAssistantMessage(conversation.id, 'Hi there!');

      const response = await app.inject({
        method: 'GET',
        url: `/api/conversations/${conversation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.id).toBe(conversation.id);
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toBe('Hello');
      expect(body.messages[1].role).toBe('assistant');
      expect(body.messages[1].content).toBe('Hi there!');
    });

    it('should return 404 for non-existent conversation', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/conversations/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.body);
      expect(body.error.message).toContain('not found');
    });

    it('should include timestamps in response', async () => {
      const conversation = conversationManager.createConversation();

      const response = await app.inject({
        method: 'GET',
        url: `/api/conversations/${conversation.id}`,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body.createdAt).toBeTruthy();
      expect(body.updatedAt).toBeTruthy();
    });
  });

  describe('Request validation', () => {
    it('should reject POST request without message field', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });

    it('should accept valid POST request with all fields', async () => {
      const conversation = conversationManager.createConversation();

      const response = await app.inject({
        method: 'POST',
        url: '/api/chat/stream',
        payload: {
          conversationId: conversation.id,
          message: 'Valid message',
        },
      });

      expect(response.statusCode).toBe(200);
    });
  });
});
