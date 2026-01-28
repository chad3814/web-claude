import type { FastifyBaseLogger } from 'fastify';
import type { ServerMessage } from './types.js';
import type { ConnectionManager } from './connection-manager.js';

/**
 * Handles broadcasting streaming responses to WebSocket clients
 */
export class StreamBroadcaster {
  constructor(
    private connectionManager: ConnectionManager,
    private logger: FastifyBaseLogger
  ) {}

  /**
   * Broadcast stream start event to a session
   */
  broadcastStreamStart(sessionId: string): boolean {
    const message: ServerMessage = {
      type: 'stream_start',
      sessionId,
      content: 'Starting response stream'
    };

    const success = this.connectionManager.sendToSession(
      sessionId,
      JSON.stringify(message)
    );

    if (success) {
      this.logger.debug({ sessionId }, 'Sent stream_start');
    } else {
      this.logger.warn({ sessionId }, 'Failed to send stream_start');
    }

    return success;
  }

  /**
   * Broadcast a stream chunk to a session
   */
  broadcastStreamChunk(sessionId: string, content: string): boolean {
    const message: ServerMessage = {
      type: 'stream_chunk',
      sessionId,
      content
    };

    const success = this.connectionManager.sendToSession(
      sessionId,
      JSON.stringify(message)
    );

    if (success) {
      this.logger.debug({ sessionId, chunkLength: content.length }, 'Sent stream_chunk');
    } else {
      this.logger.warn({ sessionId }, 'Failed to send stream_chunk');
    }

    return success;
  }

  /**
   * Broadcast stream end event to a session
   */
  broadcastStreamEnd(sessionId: string): boolean {
    const message: ServerMessage = {
      type: 'stream_end',
      sessionId,
      content: 'Response stream complete'
    };

    const success = this.connectionManager.sendToSession(
      sessionId,
      JSON.stringify(message)
    );

    if (success) {
      this.logger.debug({ sessionId }, 'Sent stream_end');
    } else {
      this.logger.warn({ sessionId }, 'Failed to send stream_end');
    }

    return success;
  }

  /**
   * Broadcast error event to a session
   */
  broadcastError(sessionId: string, error: string): boolean {
    const message: ServerMessage = {
      type: 'error',
      sessionId,
      error
    };

    const success = this.connectionManager.sendToSession(
      sessionId,
      JSON.stringify(message)
    );

    if (success) {
      this.logger.debug({ sessionId, error }, 'Sent error message');
    } else {
      this.logger.warn({ sessionId }, 'Failed to send error message');
    }

    return success;
  }

  /**
   * Handle streaming from Claude API and broadcast to client
   * This will be integrated with the actual Claude service once available
   */
  async streamResponseToClient(
    sessionId: string,
    userMessage: string,
    onStreamComplete?: (fullResponse: string) => void
  ): Promise<void> {
    try {
      // Send stream start
      this.broadcastStreamStart(sessionId);

      // TODO: Integrate with Claude API service when available
      // Example integration:
      //
      // const claudeService = new ClaudeService({ apiKey: process.env.ANTHROPIC_API_KEY });
      // let fullResponse = '';
      //
      // await claudeService.streamMessage(
      //   [{ role: 'user', content: userMessage }],
      //   (chunk) => {
      //     fullResponse += chunk.text;
      //     this.broadcastStreamChunk(sessionId, chunk.text);
      //   }
      // );
      //
      // For now, simulate streaming behavior
      const mockResponse = `Mock response to: "${userMessage}"`;

      // Simulate streaming by sending response in chunks
      const chunkSize = 10;
      for (let i = 0; i < mockResponse.length; i += chunkSize) {
        const chunk = mockResponse.slice(i, i + chunkSize);
        this.broadcastStreamChunk(sessionId, chunk);

        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Send stream end
      this.broadcastStreamEnd(sessionId);

      if (onStreamComplete) {
        onStreamComplete(mockResponse);
      }

      this.logger.info({ sessionId }, 'Stream completed successfully');

    } catch (error) {
      this.logger.error({ sessionId, error }, 'Stream error');

      const errorMessage = error instanceof Error ? error.message : 'Unknown streaming error';
      this.broadcastError(sessionId, errorMessage);

      throw error;
    }
  }
}

/**
 * Integration point for Claude API streaming
 * This interface will be implemented when Claude service is available
 */
export interface ClaudeStreamHandler {
  /**
   * Stream a response from Claude API
   * @param messages - Conversation history
   * @param onChunk - Callback for each streaming chunk
   */
  streamMessage(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    onChunk: (chunk: string) => void
  ): Promise<void>;
}
