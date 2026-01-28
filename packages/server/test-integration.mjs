/**
 * Integration test suite for WebSocket server
 * Tests multiple scenarios and edge cases
 */
import WebSocket from 'ws';

const SERVER_URL = 'ws://localhost:3000/ws';
const TIMEOUT = 10000;

let testsPassed = 0;
let testsFailed = 0;

function log(emoji, ...args) {
  console.log(emoji, ...args);
}

function pass(testName) {
  testsPassed++;
  log('✓', `PASS: ${testName}`);
}

function fail(testName, error) {
  testsFailed++;
  log('✗', `FAIL: ${testName}`, error);
}

/**
 * Test 1: Basic connection and session establishment
 */
async function testBasicConnection() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    let receivedSessionId = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for connection'));
    }, TIMEOUT);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'connection_established' && message.sessionId) {
        receivedSessionId = true;
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Test 2: Send user message and receive streaming response
 */
async function testMessageStreaming() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    let sessionId = null;
    let receivedStreamStart = false;
    let receivedChunks = 0;
    let receivedStreamEnd = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for streaming response'));
    }, TIMEOUT);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'connection_established') {
        sessionId = message.sessionId;

        // Send test message
        ws.send(JSON.stringify({
          type: 'user_message',
          content: 'Test message',
          sessionId
        }));
      } else if (message.type === 'stream_start') {
        receivedStreamStart = true;
      } else if (message.type === 'stream_chunk') {
        receivedChunks++;
      } else if (message.type === 'stream_end') {
        receivedStreamEnd = true;

        if (receivedStreamStart && receivedChunks > 0) {
          clearTimeout(timeout);
          ws.close();
          resolve();
        } else {
          clearTimeout(timeout);
          ws.close();
          reject(new Error('Invalid streaming sequence'));
        }
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Test 3: Send malformed message and receive error
 */
async function testMalformedMessage() {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(SERVER_URL);
    let sessionId = null;
    let receivedError = false;

    const timeout = setTimeout(() => {
      ws.close();
      reject(new Error('Timeout waiting for error response'));
    }, TIMEOUT);

    ws.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'connection_established') {
        sessionId = message.sessionId;

        // Send malformed message (invalid JSON structure)
        ws.send('{ invalid json }');
      } else if (message.type === 'error') {
        receivedError = true;
        clearTimeout(timeout);
        ws.close();
        resolve();
      }
    });

    ws.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Test 4: Multiple concurrent connections
 */
async function testMultipleConnections() {
  return new Promise((resolve, reject) => {
    const connectionCount = 5;
    const connections = [];
    const receivedSessionIds = new Set();

    const timeout = setTimeout(() => {
      connections.forEach(ws => ws.close());
      reject(new Error('Timeout waiting for multiple connections'));
    }, TIMEOUT);

    for (let i = 0; i < connectionCount; i++) {
      const ws = new WebSocket(SERVER_URL);

      ws.on('message', (data) => {
        const message = JSON.parse(data.toString());

        if (message.type === 'connection_established') {
          receivedSessionIds.add(message.sessionId);

          // If all connections received session IDs
          if (receivedSessionIds.size === connectionCount) {
            clearTimeout(timeout);
            connections.forEach(ws => ws.close());
            resolve();
          }
        }
      });

      ws.on('error', (error) => {
        clearTimeout(timeout);
        connections.forEach(ws => ws.close());
        reject(error);
      });

      connections.push(ws);
    }
  });
}

/**
 * Test 5: Reconnection scenario
 */
async function testReconnection() {
  return new Promise((resolve, reject) => {
    let firstSessionId = null;
    let secondSessionId = null;

    const timeout = setTimeout(() => {
      reject(new Error('Timeout during reconnection test'));
    }, TIMEOUT);

    // First connection
    const ws1 = new WebSocket(SERVER_URL);

    ws1.on('message', (data) => {
      const message = JSON.parse(data.toString());

      if (message.type === 'connection_established') {
        firstSessionId = message.sessionId;
        ws1.close();

        // Create second connection after first is closed
        setTimeout(() => {
          const ws2 = new WebSocket(SERVER_URL);

          ws2.on('message', (data) => {
            const message = JSON.parse(data.toString());

            if (message.type === 'connection_established') {
              secondSessionId = message.sessionId;

              // Verify we got different session IDs
              if (firstSessionId !== secondSessionId) {
                clearTimeout(timeout);
                ws2.close();
                resolve();
              } else {
                clearTimeout(timeout);
                ws2.close();
                reject(new Error('Same session ID after reconnection'));
              }
            }
          });

          ws2.on('error', (error) => {
            clearTimeout(timeout);
            reject(error);
          });
        }, 500);
      }
    });

    ws1.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Starting WebSocket Integration Tests\n');

  const tests = [
    { name: 'Basic connection and session establishment', fn: testBasicConnection },
    { name: 'Message streaming flow', fn: testMessageStreaming },
    { name: 'Malformed message error handling', fn: testMalformedMessage },
    { name: 'Multiple concurrent connections', fn: testMultipleConnections },
    { name: 'Reconnection scenario', fn: testReconnection }
  ];

  for (const test of tests) {
    try {
      await test.fn();
      pass(test.name);
    } catch (error) {
      fail(test.name, error.message);
    }
  }

  console.log(`\n${'='.repeat(50)}`);
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log(`${'='.repeat(50)}\n`);

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((error) => {
  console.error('Test suite error:', error);
  process.exit(1);
});
