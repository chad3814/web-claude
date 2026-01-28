/**
 * Represents a chat message in the conversation.
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  isStreaming?: boolean;
}

/**
 * Props for the ChatUI container component.
 */
export interface ChatUIProps {
  messages: Message[];
  onSendMessage: (content: string) => void;
  isConnected: boolean;
  isWaitingForResponse: boolean;
}

/**
 * Props for the ChatMessage component.
 */
export interface ChatMessageProps {
  message: Message;
}

/**
 * Props for the ChatMessageList component.
 */
export interface ChatMessageListProps {
  messages: Message[];
}

/**
 * Props for the ChatInput component.
 */
export interface ChatInputProps {
  onSend: (content: string) => void;
  disabled: boolean;
  isConnected: boolean;
}

/**
 * Input mode type for single-line or multiline input.
 */
export type InputMode = 'single' | 'multi';
