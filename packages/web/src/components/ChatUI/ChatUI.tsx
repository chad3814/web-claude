import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient } from '../../lib/websocket-client';
import type { WebSocketMessage, StreamChunk } from '../../lib/websocket-types';
import { ChatMessageList } from './ChatMessageList';
import { ChatInput } from './ChatInput';
import type { Message } from './types';
import './ChatUI.css';

/**
 * ChatUI is the main container component that integrates message display,
 * input handling, and WebSocket communication.
 */
export const ChatUI: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<string>('Disconnected');
  const wsClientRef = useRef<WebSocketClient | null>(null);
  const streamingMessageIdRef = useRef<string | null>(null);

  // Initialize WebSocket client
  useEffect(() => {
    // Get WebSocket URL from environment or use default
    const wsUrl = import.meta.env.VITE_WS_URL || '/ws';
    const client = new WebSocketClient(wsUrl);

    wsClientRef.current = client;

    // Handle connection open
    client.on('open', () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
    });

    // Handle connection close
    client.on('close', () => {
      setIsConnected(false);
      setConnectionStatus('Disconnected');
      setIsWaitingForResponse(false);
    });

    // Handle reconnecting
    client.on('reconnecting', (data: any) => {
      setIsConnected(false);
      setConnectionStatus(`Reconnecting (attempt ${data.attempt})...`);
    });

    // Handle reconnected
    client.on('reconnected', () => {
      setIsConnected(true);
      setConnectionStatus('Connected');
    });

    // Handle errors
    client.on('error', (error: any) => {
      console.error('WebSocket error:', error);
      setConnectionStatus('Error - check console');
    });

    // Handle incoming messages
    client.on('message', (data: any) => {
      const message = data as WebSocketMessage;
      handleIncomingMessage(message);
    });

    // Connect to WebSocket server
    client.connect().catch((error) => {
      console.error('Failed to connect:', error);
      setConnectionStatus('Connection failed');
    });

    // Cleanup on unmount
    return () => {
      client.destroy();
    };
  }, []);

  const handleIncomingMessage = useCallback((message: WebSocketMessage) => {
    switch (message.type) {
      case 'assistant_message':
        // Complete assistant message (non-streaming)
        setIsWaitingForResponse(false);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: message.data as string,
            timestamp: message.timestamp,
            isStreaming: false,
          },
        ]);
        break;

      case 'stream_chunk':
        // Streaming response chunk
        const chunk = message.data as StreamChunk;
        handleStreamChunk(chunk);
        break;

      case 'error':
        // Error message from server
        setIsWaitingForResponse(false);
        console.error('Server error:', message.data);
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content: `Error: ${message.data}`,
            timestamp: message.timestamp,
            isStreaming: false,
          },
        ]);
        break;

      default:
        console.log('Unknown message type:', message.type);
    }
  }, []);

  const handleStreamChunk = useCallback((chunk: StreamChunk) => {
    const { messageId, content, isComplete } = chunk;

    setMessages((prev) => {
      const existingIndex = prev.findIndex((msg) => msg.id === messageId);

      if (existingIndex >= 0) {
        // Update existing streaming message
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          content: updated[existingIndex].content + content,
          isStreaming: !isComplete,
        };
        return updated;
      } else {
        // Create new streaming message
        streamingMessageIdRef.current = messageId;
        return [
          ...prev,
          {
            id: messageId,
            role: 'assistant',
            content,
            timestamp: Date.now(),
            isStreaming: !isComplete,
          },
        ];
      }
    });

    if (isComplete) {
      setIsWaitingForResponse(false);
      streamingMessageIdRef.current = null;
    }
  }, []);

  const handleSendMessage = useCallback((content: string) => {
    if (!wsClientRef.current || !isConnected) {
      console.warn('Cannot send message: not connected');
      return;
    }

    // Add user message to UI
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsWaitingForResponse(true);

    // Send message to server
    const wsMessage: WebSocketMessage = {
      type: 'user_message',
      data: content,
      timestamp: Date.now(),
    };

    wsClientRef.current.send(wsMessage);
  }, [isConnected]);

  return (
    <div className="chat-ui">
      <div className="chat-ui__header">
        <h1 className="chat-ui__title">Web Claude - Chat Interface</h1>
        <div className={`chat-ui__status chat-ui__status--${isConnected ? 'connected' : 'disconnected'}`}>
          <span className="chat-ui__status-indicator"></span>
          <span className="chat-ui__status-text">{connectionStatus}</span>
        </div>
      </div>

      <div className="chat-ui__body">
        <ChatMessageList messages={messages} />
      </div>

      <div className="chat-ui__footer">
        <ChatInput
          onSend={handleSendMessage}
          disabled={isWaitingForResponse}
          isConnected={isConnected}
        />
      </div>
    </div>
  );
};
