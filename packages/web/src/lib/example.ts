/**
 * Example usage of the WebSocket client.
 *
 * This file demonstrates common patterns for using the WebSocket client
 * in a real application.
 */

import { WebSocketClient, type WebSocketMessage, type StreamChunk } from './index';

// Basic connection example
export function basicExample() {
  const client = new WebSocketClient('ws://localhost:3000/ws');

  // Listen for connection events
  client.on('open', () => {
    console.log('Connected to server');
  });

  client.on('close', (data: any) => {
    console.log('Disconnected:', data?.reason);
  });

  client.on('error', (error) => {
    console.error('WebSocket error:', error);
  });

  // Handle incoming messages
  client.on('message', (message) => {
    const msg = message as WebSocketMessage;
    console.log('Received message:', msg.type, msg.data);
  });

  // Connect and send a message
  client.connect().then(() => {
    client.send({
      type: 'user_message',
      data: { text: 'Hello, server!' },
      timestamp: Date.now(),
    });
  });

  return client;
}

// Streaming response example
export function streamingExample() {
  const client = new WebSocketClient('ws://localhost:3000/ws');

  let currentMessage = '';

  client.on('message', (message) => {
    const msg = message as WebSocketMessage;

    if (msg.type === 'stream_chunk') {
      const chunk = msg.data as StreamChunk;

      // Accumulate content
      currentMessage += chunk.content;

      // Display progress
      console.log('Streaming:', currentMessage);

      // Check if complete
      if (chunk.isComplete) {
        console.log('Stream complete:', currentMessage);
        currentMessage = '';
      }
    }
  });

  client.connect();
  return client;
}

// Advanced configuration example
export function advancedExample() {
  const client = new WebSocketClient('ws://localhost:3000/ws', {
    reconnect: true,
    reconnectInterval: 2000, // Start with 2s delay
    reconnectDecay: 1.5, // Slower backoff
    maxReconnectAttempts: 5, // Give up after 5 attempts
    maxReconnectInterval: 60000, // Max 1 minute between attempts
    timeout: 10000, // 10s connection timeout
  });

  // Track reconnection attempts
  client.on('reconnecting', (data: any) => {
    console.log(`Reconnecting... attempt ${data.attempt}/${5}, waiting ${data.delay}ms`);
  });

  client.on('reconnected', () => {
    console.log('Successfully reconnected!');
    console.log(`Queued messages: ${client.getQueuedMessageCount()}`);
  });

  client.connect();
  return client;
}

// React hook example
export function useWebSocketExample() {
  // This would typically be in a React component

  /*
  import { useEffect, useState } from 'react';

  function ChatComponent() {
    const [client, setClient] = useState<WebSocketClient | null>(null);
    const [messages, setMessages] = useState<WebSocketMessage[]>([]);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
      const ws = new WebSocketClient('ws://localhost:3000/ws');

      ws.on('open', () => setIsConnected(true));
      ws.on('close', () => setIsConnected(false));

      ws.on('message', (message) => {
        setMessages((prev) => [...prev, message as WebSocketMessage]);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      ws.connect();
      setClient(ws);

      // Cleanup on unmount
      return () => {
        ws.destroy();
      };
    }, []);

    const sendMessage = (text: string) => {
      if (!client) return;

      client.send({
        type: 'user_message',
        data: { text },
        timestamp: Date.now(),
      });
    };

    return (
      <div>
        <div>Status: {isConnected ? 'Connected' : 'Disconnected'}</div>
        <div>Messages: {messages.length}</div>
        <button onClick={() => sendMessage('Hello!')}>Send</button>
      </div>
    );
  }
  */
}

// Cleanup example
export function cleanupExample() {
  const client = new WebSocketClient('ws://localhost:3000/ws');

  client.connect();

  // Later, when done:
  function cleanup() {
    client.disconnect();
    client.destroy();
  }

  // Call cleanup when component unmounts or page unloads
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', cleanup);
  }

  return { client, cleanup };
}
