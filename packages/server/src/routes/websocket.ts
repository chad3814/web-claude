import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import type { ServerMessage, ClientMessage } from '../websocket/types.js';
import { ConnectionManager } from '../websocket/connection-manager.js';
import { MessageHandler } from '../websocket/message-handler.js';

// Create singleton connection manager
const connectionManager = new ConnectionManager();

// Message handler will be initialized when routes are registered
let messageHandler: MessageHandler;

/**
 * Get the connection manager instance
 */
export function getConnectionManager(): ConnectionManager {
  return connectionManager;
}

/**
 * Get the message handler instance
 */
export function getMessageHandler(): MessageHandler {
  return messageHandler;
}

/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(fastify: FastifyInstance) {
  // Initialize message handler
  messageHandler = new MessageHandler(fastify.log);

  // Set up a basic user message handler (will be replaced in Task Group 4)
  messageHandler.setUserMessageHandler(async (message: ClientMessage, sessionId: string) => {
    fastify.log.info({
      sessionId,
      messageType: message.type,
      content: message.content
    }, 'User message received');

    // TODO: This will be replaced with Claude API integration in Task Group 4
  });

  // WebSocket endpoint
  fastify.register(async (fastify) => {
    fastify.get('/ws', { websocket: true }, (socket: WebSocket, request: FastifyRequest) => {
    // Add connection and get session ID
    const sessionId = connectionManager.addConnection(socket);

    fastify.log.info({
      sessionId,
      activeConnections: connectionManager.getConnectionCount()
    }, 'WebSocket connection established');

    // Send session ID to client
    const connectionMessage: ServerMessage = {
      type: 'connection_established',
      sessionId,
      content: 'Connected to server'
    };

    socket.send(JSON.stringify(connectionMessage));

    // Handle incoming messages
    socket.on('message', async (rawMessage: Buffer | string) => {
      const messageStr = rawMessage.toString();
      fastify.log.debug({ sessionId, message: messageStr }, 'Received WebSocket message');

      const result = await messageHandler.handleMessage(messageStr, sessionId);

      if (!result.success) {
        // Send error message back to client
        socket.send(JSON.stringify(result.error));
      }
    });

    // Handle connection close
    socket.on('close', () => {
      connectionManager.removeConnection(sessionId);
      fastify.log.info({
        sessionId,
        activeConnections: connectionManager.getConnectionCount()
      }, 'WebSocket connection closed');
    });

    // Handle errors
    socket.on('error', (error: Error) => {
      fastify.log.error({ sessionId, error }, 'WebSocket error');
      connectionManager.removeConnection(sessionId);
    });

      // Handle ping/pong for keep-alive
      socket.on('ping', () => {
        fastify.log.debug({ sessionId }, 'Received ping');
        socket.pong();
      });
    });
  });
}
