import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import { randomUUID } from 'crypto';
import type { ServerMessage } from '../websocket/types.js';

/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(fastify: FastifyInstance) {
  // WebSocket endpoint
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    // Generate unique session ID for this connection
    const sessionId = randomUUID();

    fastify.log.info({ sessionId }, 'WebSocket connection established');

    // Send session ID to client
    const connectionMessage: ServerMessage = {
      type: 'connection_established',
      sessionId,
      content: 'Connected to server'
    };

    socket.send(JSON.stringify(connectionMessage));

    // Handle incoming messages
    socket.on('message', (rawMessage: Buffer | string) => {
      try {
        const messageStr = rawMessage.toString();
        fastify.log.debug({ sessionId, message: messageStr }, 'Received WebSocket message');

        // Parse JSON message
        const message = JSON.parse(messageStr);

        // TODO: Route message to appropriate handler
        fastify.log.info({ sessionId, messageType: message.type }, 'Message received');

      } catch (error) {
        fastify.log.error({ sessionId, error }, 'Error parsing WebSocket message');

        const errorMessage: ServerMessage = {
          type: 'error',
          sessionId,
          error: 'Invalid message format'
        };

        socket.send(JSON.stringify(errorMessage));
      }
    });

    // Handle connection close
    socket.on('close', () => {
      fastify.log.info({ sessionId }, 'WebSocket connection closed');
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      fastify.log.error({ sessionId, error }, 'WebSocket error');
    });

      // Handle ping/pong for keep-alive
      socket.on('ping', () => {
        fastify.log.debug({ sessionId }, 'Received ping');
        socket.pong();
      });
    });
  });
}
