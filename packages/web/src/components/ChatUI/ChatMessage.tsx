import React from 'react';
import type { ChatMessageProps } from './types';
import './ChatMessage.css';

/**
 * ChatMessage component displays a single message in the chat interface.
 * Provides visual distinction between user and assistant messages.
 */
export const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message }) => {
  const { role, content, timestamp, isStreaming } = message;

  const formattedTime = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className={`chat-message chat-message--${role}`} role="article" aria-label={`${role} message`}>
      <div className="chat-message__header">
        <span className="chat-message__sender">
          {role === 'user' ? 'You' : 'Claude'}
        </span>
        <span className="chat-message__timestamp">{formattedTime}</span>
      </div>
      <div className="chat-message__content">
        {content}
        {isStreaming && <span className="chat-message__cursor" aria-hidden="true">▋</span>}
      </div>
    </div>
  );
});

ChatMessage.displayName = 'ChatMessage';
