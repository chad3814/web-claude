import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ChatMessage } from './ChatMessage';
import type { ChatMessageListProps } from './types';
import './ChatMessageList.css';

/**
 * ChatMessageList component displays the scrollable list of messages.
 * Implements smart auto-scrolling that respects user scroll position.
 */
export const ChatMessageList: React.FC<ChatMessageListProps> = ({ messages }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(messages.length);

  // Detect if user has scrolled away from bottom
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef.current;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    // If user is within 100px of bottom, enable auto-scroll
    // Otherwise, they're reading history and we should disable it
    setShouldAutoScroll(distanceFromBottom < 100);
  }, []);

  // Auto-scroll to bottom when new messages arrive (if enabled)
  useEffect(() => {
    const hasNewMessages = messages.length > lastMessageCountRef.current;
    lastMessageCountRef.current = messages.length;

    if (shouldAutoScroll && hasNewMessages && bottomRef.current) {
      // Use requestAnimationFrame to batch DOM updates for smooth scrolling
      requestAnimationFrame(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      });
    }
  }, [messages, shouldAutoScroll]);

  // Auto-scroll on content updates for streaming messages
  useEffect(() => {
    if (shouldAutoScroll && messages.length > 0) {
      const lastMessage = messages[messages.length - 1];

      if (lastMessage.isStreaming && bottomRef.current) {
        // For streaming, scroll immediately without smooth behavior
        requestAnimationFrame(() => {
          bottomRef.current?.scrollIntoView({ behavior: 'auto' });
        });
      }
    }
  }, [messages, shouldAutoScroll]);

  return (
    <div
      ref={containerRef}
      className="chat-message-list"
      onScroll={handleScroll}
      role="log"
      aria-live="polite"
      aria-label="Chat conversation"
    >
      {messages.length === 0 ? (
        <div className="chat-message-list__empty" role="status">
          <p>No messages yet. Start a conversation!</p>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          <div ref={bottomRef} className="chat-message-list__bottom" />
        </>
      )}
    </div>
  );
};
