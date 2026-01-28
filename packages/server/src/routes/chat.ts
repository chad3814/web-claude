import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { ClaudeService, AnthropicAPIError } from '../services/claude';
import {
  ConversationManager,
  ConversationNotFoundError,
  InvalidMessageError,
} from '../services/conversation';

interface ChatStreamBody {
  conversationId?: string;
  message: string;
}

interface ConversationParams {
  id: string;
}

export async function chatRoutes(
  fastify: FastifyInstance,
  options: {
    claudeService: ClaudeService;
    conversationManager: ConversationManager;
  }
) {
  const { claudeService, conversationManager } = options;

  // Schema for POST /api/chat/stream validation
  const chatStreamSchema = {
    body: {
      type: 'object',
      required: ['message'],
      properties: {
        conversationId: { type: 'string' },
        message: { type: 'string', minLength: 1 },
      },
    },
  };

  // POST /api/chat/stream - Initiate streaming chat
  fastify.post<{ Body: ChatStreamBody }>(
    '/api/chat/stream',
    { schema: chatStreamSchema },
    async (request: FastifyRequest<{ Body: ChatStreamBody }>, reply: FastifyReply) => {
      const { conversationId, message } = request.body;

      try {
        // Validate message content
        if (!message || message.trim().length === 0) {
          return reply.status(400).send({
            error: {
              message: 'Message content cannot be empty',
              statusCode: 400,
            },
          });
        }

        // Get or create conversation
        let conversation;
        if (conversationId) {
          conversation = conversationManager.getConversation(conversationId);
          if (!conversation) {
            return reply.status(404).send({
              error: {
                message: 'Conversation not found',
                statusCode: 404,
              },
            });
          }
        } else {
          conversation = conversationManager.createConversation();
        }

        // Add user message to conversation
        conversationManager.addUserMessage(conversation.id, message);

        // Get all messages for context
        const messages = conversationManager.getMessages(conversation.id);

        // Set up SSE headers
        reply.raw.writeHead(200, {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        });

        // Send conversation ID first
        reply.raw.write(`data: ${JSON.stringify({ type: 'conversation_id', conversationId: conversation.id })}\n\n`);

        // Accumulate assistant response
        let assistantResponse = '';

        // Stream the response
        await claudeService.streamMessage(messages, (chunk) => {
          if (chunk.type === 'content_block_delta' && chunk.delta) {
            const text = chunk.delta.text;
            assistantResponse += text;
            reply.raw.write(`data: ${JSON.stringify({ type: 'delta', text })}\n\n`);
          } else if (chunk.type === 'message_start') {
            reply.raw.write(`data: ${JSON.stringify({ type: 'start' })}\n\n`);
          } else if (chunk.type === 'message_stop') {
            reply.raw.write(`data: ${JSON.stringify({ type: 'stop' })}\n\n`);
          }
        });

        // Save assistant response to conversation
        if (assistantResponse) {
          conversationManager.addAssistantMessage(conversation.id, assistantResponse);
        }

        // End the stream
        reply.raw.end();
      } catch (error) {
        fastify.log.error(error);

        // Handle specific error types
        if (error instanceof AnthropicAPIError) {
          const statusCode = error.statusCode || 502;
          reply.raw.write(
            `data: ${JSON.stringify({
              type: 'error',
              error: {
                message: error.message,
                statusCode,
                errorType: error.errorType,
              },
            })}\n\n`
          );
          reply.raw.end();
          return;
        }

        if (error instanceof InvalidMessageError) {
          reply.raw.write(
            `data: ${JSON.stringify({
              type: 'error',
              error: {
                message: error.message,
                statusCode: 400,
              },
            })}\n\n`
          );
          reply.raw.end();
          return;
        }

        // Generic error handling
        reply.raw.write(
          `data: ${JSON.stringify({
            type: 'error',
            error: {
              message: 'An unexpected error occurred',
              statusCode: 500,
            },
          })}\n\n`
        );
        reply.raw.end();
      }
    }
  );

  // GET /api/conversations/:id - Get conversation history
  fastify.get<{ Params: ConversationParams }>(
    '/api/conversations/:id',
    async (request: FastifyRequest<{ Params: ConversationParams }>, reply: FastifyReply) => {
      const { id } = request.params;

      try {
        const conversation = conversationManager.getConversation(id);

        if (!conversation) {
          return reply.status(404).send({
            error: {
              message: 'Conversation not found',
              statusCode: 404,
            },
          });
        }

        return reply.status(200).send({
          id: conversation.id,
          messages: conversation.messages,
          createdAt: conversation.createdAt,
          updatedAt: conversation.updatedAt,
        });
      } catch (error) {
        fastify.log.error(error);

        if (error instanceof ConversationNotFoundError) {
          return reply.status(404).send({
            error: {
              message: error.message,
              statusCode: 404,
            },
          });
        }

        return reply.status(500).send({
          error: {
            message: 'An unexpected error occurred',
            statusCode: 500,
          },
        });
      }
    }
  );
}
