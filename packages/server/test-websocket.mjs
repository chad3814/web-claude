/**
 * Simple WebSocket client test
 * Run this after starting the server with: npm run dev
 */
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:3000/ws');

ws.on('open', () => {
  console.log('✓ Connected to WebSocket server');

  // Send a test message
  const message = {
    type: 'user_message',
    content: 'Hello from test client!',
    sessionId: 'test-session-id'
  };

  ws.send(JSON.stringify(message));
  console.log('→ Sent message:', message);
});

ws.on('message', (data) => {
  const message = JSON.parse(data.toString());
  console.log('← Received message:', message);

  // Close after receiving response
  setTimeout(() => {
    ws.close();
    console.log('✓ Connection closed');
    process.exit(0);
  }, 1000);
});

ws.on('error', (error) => {
  console.error('✗ WebSocket error:', error);
  process.exit(1);
});

ws.on('close', () => {
  console.log('✓ WebSocket connection closed');
});
