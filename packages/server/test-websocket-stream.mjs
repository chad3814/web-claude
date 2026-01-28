/**
 * WebSocket streaming test client
 * Tests the full streaming flow: connect -> send message -> receive streamed response
 * Run this after starting the server with: npm run dev
 */
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');

let sessionId = null;
let fullResponse = '';

ws.on('open', () => {
  console.log('✓ Connected to WebSocket server');
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());

  switch (message.type) {
    case 'connection_established':
      sessionId = message.sessionId;
      console.log(`✓ Session established: ${sessionId}`);
      console.log('→ Sending user message...');

      // Send a test message
      const userMessage = {
        type: 'user_message',
        content: 'Hello, can you help me with TypeScript?',
        sessionId
      };

      ws.send(JSON.stringify(userMessage));
      break;

    case 'stream_start':
      console.log('✓ Stream started');
      fullResponse = '';
      process.stdout.write('← Streaming response: ');
      break;

    case 'stream_chunk':
      fullResponse += message.content;
      process.stdout.write(message.content);
      break;

    case 'stream_end':
      console.log('\n✓ Stream completed');
      console.log(`Full response (${fullResponse.length} chars): "${fullResponse}"`);

      // Close after receiving complete response
      setTimeout(() => {
        ws.close();
        console.log('✓ Connection closed');
        process.exit(0);
      }, 500);
      break;

    case 'error':
      console.error(`✗ Error: ${message.error}`);
      ws.close();
      process.exit(1);
      break;

    default:
      console.log('← Received:', message);
  }
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error);
  process.exit(1);
});

ws.on('close', () => {
  console.log('✓ WebSocket connection closed');
});

// Timeout after 10 seconds
setTimeout(() => {
  console.error('✗ Test timeout');
  ws.close();
  process.exit(1);
}, 10000);
