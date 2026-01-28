import type { FastifyInstance, FastifyRequest } from 'fastify';
import type { WebSocket } from 'ws';
import type { ServerMessage, ClientMessage } from '../websocket/types.js';
import { ConnectionManager } from '../websocket/connection-manager.js';
import { MessageHandler } from '../websocket/message-handler.js';
import { StreamBroadcaster } from '../websocket/stream-broadcaster.js';

// Create singleton connection manager
const connectionManager = new ConnectionManager();

// Message handler and stream broadcaster will be initialized when routes are registered
let messageHandler: MessageHandler;
let streamBroadcaster: StreamBroadcaster;

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
 * Get the stream broadcaster instance
 */
export function getStreamBroadcaster(): StreamBroadcaster {
  return streamBroadcaster;
}

/**
 * Register WebSocket routes
 */
export async function registerWebSocketRoutes(fastify: FastifyInstance) {
  // Initialize message handler and stream broadcaster
  messageHandler = new MessageHandler(fastify.log);
  streamBroadcaster = new StreamBroadcaster(connectionManager, fastify.log);

  // Set up user message handler with streaming support
  messageHandler.setUserMessageHandler(async (message: ClientMessage, sessionId: string) => {
    fastify.log.info({
      sessionId,
      messageType: message.type,
      content: message.content
    }, 'User message received, starting stream');

    try {
      // Stream the response to the client
      await streamBroadcaster.streamResponseToClient(
        sessionId,
        message.content,
        (fullResponse) => {
          // Optional: Save the full response to conversation history
          fastify.log.debug({ sessionId, responseLength: fullResponse.length }, 'Stream complete');
        }
      );
    } catch (error) {
      fastify.log.error({ sessionId, error }, 'Error streaming response');
      streamBroadcaster.broadcastError(
        sessionId,
        error instanceof Error ? error.message : 'Failed to generate response'
      );
    }
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
      try {
        const messageStr = rawMessage.toString();
        fastify.log.debug({ sessionId, message: messageStr }, 'Received WebSocket message');

        const result = await messageHandler.handleMessage(messageStr, sessionId);

        if (!result.success) {
          // Send error message back to client
          if (socket.readyState === socket.OPEN) {
            socket.send(JSON.stringify(result.error));
          }
        }
      } catch (error) {
        fastify.log.error({ sessionId, error }, 'Unexpected error handling message');

        // Attempt to send error to client
        if (socket.readyState === socket.OPEN) {
          const errorMessage: ServerMessage = {
            type: 'error',
            sessionId,
            error: 'Internal server error processing message'
          };
          socket.send(JSON.stringify(errorMessage));
        }
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
