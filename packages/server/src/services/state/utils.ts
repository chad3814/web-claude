/**
 * Utility functions for state management.
 */

import { randomUUID } from 'node:crypto';
import { Message, MessageRole, MessageMetadata } from './types.js';

/**
 * Generate a unique message ID.
 *
 * @returns UUID v4 string
 */
export function generateMessageId(): string {
  return randomUUID();
}

/**
 * Generate a unique session ID.
 *
 * @returns UUID v4 string
 */
export function generateSessionId(): string {
  return randomUUID();
}

/**
 * Create a message object with generated ID and current timestamp.
 *
 * @param role - Message role (user or assistant)
 * @param content - Message content
 * @param metadata - Optional metadata
 * @returns Complete Message object
 */
export function createMessage(
  role: MessageRole,
  content: string,
  metadata?: MessageMetadata
): Message {
  return {
    id: generateMessageId(),
    role,
    content,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Filter messages by role.
 *
 * @param messages - Array of messages
 * @param role - Role to filter by
 * @returns Filtered messages
 */
export function filterMessagesByRole(messages: Message[], role: MessageRole): Message[] {
  return messages.filter((msg) => msg.role === role);
}

/**
 * Filter messages by time range.
 *
 * @param messages - Array of messages
 * @param startTime - Start timestamp (inclusive)
 * @param endTime - End timestamp (inclusive)
 * @returns Filtered messages
 */
export function filterMessagesByTimeRange(
  messages: Message[],
  startTime: number,
  endTime: number
): Message[] {
  return messages.filter((msg) => msg.timestamp >= startTime && msg.timestamp <= endTime);
}

/**
 * Get the most recent N messages.
 *
 * @param messages - Array of messages
 * @param count - Number of recent messages to return
 * @returns Most recent messages
 */
export function getRecentMessages(messages: Message[], count: number): Message[] {
  if (count <= 0) {
    return [];
  }
  return messages.slice(-count);
}

/**
 * Check if a message ID already exists in the array (for deduplication).
 *
 * @param messages - Array of messages
 * @param messageId - Message ID to check
 * @returns True if message ID exists
 */
export function messageExists(messages: Message[], messageId: string): boolean {
  return messages.some((msg) => msg.id === messageId);
}

/**
 * Calculate total token usage across messages.
 *
 * @param messages - Array of messages
 * @returns Total input and output tokens
 */
export function calculateTotalTokens(messages: Message[]): { input: number; output: number } {
  return messages.reduce(
    (acc, msg) => {
      if (msg.metadata?.tokens) {
        acc.input += msg.metadata.tokens.input || 0;
        acc.output += msg.metadata.tokens.output || 0;
      }
      return acc;
    },
    { input: 0, output: 0 }
  );
}
