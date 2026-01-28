import type { FastifyBaseLogger } from 'fastify';
import type { ClientMessage, ServerMessage } from './types.js';

/**
 * Validates a client message
 */
export function validateClientMessage(message: unknown): message is ClientMessage {
  if (typeof message !== 'object' || message === null) {
    return false;
  }

  const msg = message as Record<string, unknown>;

  return (
    typeof msg.type === 'string' &&
    msg.type === 'user_message' &&
    typeof msg.content === 'string' &&
    typeof msg.sessionId === 'string'
  );
}

/**
 * Parses a raw message string into a ClientMessage
 */
export function parseClientMessage(rawMessage: string): {
  success: true;
  message: ClientMessage;
} | {
  success: false;
  error: string;
} {
  try {
    const parsed = JSON.parse(rawMessage);

    if (!validateClientMessage(parsed)) {
      return {
        success: false,
        error: 'Invalid message format. Expected: { type: "user_message", content: string, sessionId: string }'
      };
    }

    return {
      success: true,
      message: parsed
    };
  } catch (error) {
    return {
      success: false,
      error: 'Invalid JSON format'
    };
  }
}

/**
 * Handler function type for user messages
 */
export type UserMessageHandler = (message: ClientMessage, sessionId: string) => void | Promise<void>;

/**
 * Message handler class
 */
export class MessageHandler {
  private userMessageHandler?: UserMessageHandler;

  constructor(private logger: FastifyBaseLogger) {}

  /**
   * Set the handler for user messages
   */
  setUserMessageHandler(handler: UserMessageHandler): void {
    this.userMessageHandler = handler;
  }

  /**
   * Handle an incoming raw message
   */
  async handleMessage(
    rawMessage: string,
    sessionId: string
  ): Promise<{ success: true } | { success: false; error: ServerMessage }> {
    this.logger.debug({ sessionId, rawMessage }, 'Processing message');

    const parseResult = parseClientMessage(rawMessage);

    if (!parseResult.success) {
      this.logger.warn({ sessionId, error: parseResult.error }, 'Invalid message received');

      return {
        success: false,
        error: {
          type: 'error',
          sessionId,
          error: parseResult.error
        }
      };
    }

    const { message } = parseResult;

    // Route to appropriate handler based on message type
    if (message.type === 'user_message') {
      if (!this.userMessageHandler) {
        this.logger.error({ sessionId }, 'No user message handler registered');

        return {
          success: false,
          error: {
            type: 'error',
            sessionId,
            error: 'Server not ready to handle messages'
          }
        };
      }

      try {
        await this.userMessageHandler(message, sessionId);
        return { success: true };
      } catch (error) {
        this.logger.error({ sessionId, error }, 'Error handling user message');

        return {
          success: false,
          error: {
            type: 'error',
            sessionId,
            error: error instanceof Error ? error.message : 'Failed to process message'
          }
        };
      }
    }

    // Unknown message type
    return {
      success: false,
      error: {
        type: 'error',
        sessionId,
        error: `Unknown message type: ${(message as any).type}`
      }
    };
  }
}
