import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import dotenv from 'dotenv';
import { ClaudeService } from './services/claude';
import { ConversationManager } from './services/conversation';
import { chatRoutes } from './routes/chat';
import { registerWebSocketRoutes } from './routes/websocket.js';

// Load environment variables
dotenv.config();

const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Initialize services
const claudeService = new ClaudeService({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
  model: process.env.ANTHROPIC_MODEL,
  maxTokens: process.env.ANTHROPIC_MAX_TOKENS
    ? parseInt(process.env.ANTHROPIC_MAX_TOKENS, 10)
    : undefined,
});

const conversationManager = new ConversationManager();

// Create Fastify instance with logger
const fastify = Fastify({
  logger: {
    level: NODE_ENV === 'production' ? 'info' : 'debug',
    transport: NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } }
      : undefined
  },
  trustProxy: true,
  requestTimeout: 30000
});

// Register CORS plugin
await fastify.register(cors, {
  origin: NODE_ENV === 'development'
    ? ['http://localhost:3000', 'http://localhost:5173', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173']
    : false,
  credentials: true
});

// Register WebSocket plugin
await fastify.register(websocket, {
  options: {
    maxPayload: 1048576, // 1MB max message size
    clientTracking: true
  }
});

// Register WebSocket routes
await registerWebSocketRoutes(fastify);

// Register chat routes
await fastify.register(chatRoutes, {
  claudeService,
  conversationManager,
});


// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: NODE_ENV
  };
});

// Error handler
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);

  const statusCode = error.statusCode || 500;
  const message = statusCode === 500 && NODE_ENV === 'production'
    ? 'Internal Server Error'
    : error.message;

  reply.status(statusCode).send({
    error: {
      message,
      statusCode
    }
  });
});

// Graceful shutdown
const shutdown = async () => {
  fastify.log.info('Shutting down gracefully...');
  try {
    await fastify.close();
    fastify.log.info('Server closed successfully');
    process.exit(0);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
try {
  await fastify.listen({ port: PORT, host: HOST });
  fastify.log.info(`Server running on http://${HOST}:${PORT}`);
} catch (err) {
  fastify.log.error(err);
  process.exit(1);
}
