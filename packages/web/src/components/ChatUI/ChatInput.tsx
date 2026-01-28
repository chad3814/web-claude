import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { ChatInputProps, InputMode } from './types';
import './ChatInput.css';

/**
 * ChatInput component provides flexible single-line and multiline input modes.
 * Switches between input and textarea based on user interaction.
 */
export const ChatInput: React.FC<ChatInputProps> = ({ onSend, disabled, isConnected }) => {
  const [inputValue, setInputValue] = useState('');
  const [inputMode, setInputMode] = useState<InputMode>('single');
  const inputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isMac, setIsMac] = useState(false);

  // Detect OS for correct modifier key display
  useEffect(() => {
    setIsMac(/Mac|iPod|iPhone|iPad/.test(navigator.platform));
  }, []);

  // Maintain focus when switching modes
  useEffect(() => {
    if (inputMode === 'single' && inputRef.current) {
      inputRef.current.focus();
    } else if (inputMode === 'multi' && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [inputMode]);

  const handleSendMessage = useCallback(() => {
    const trimmedValue = inputValue.trim();
    if (trimmedValue && !disabled) {
      onSend(trimmedValue);
      setInputValue('');
      setInputMode('single');
    }
  }, [inputValue, disabled, onSend]);

  const handleSingleLineKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.shiftKey) {
      // Shift+Enter: Switch to multiline mode
      e.preventDefault();
      setInputMode('multi');
      setInputValue((prev) => prev + '\n');
    } else if (e.key === 'Enter' && !e.shiftKey) {
      // Enter: Submit message
      e.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  const handleMultiLineKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter (Mac) or Ctrl+Enter (Windows/Linux): Submit message
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendMessage();
    }
    // Enter alone: Insert newline (default textarea behavior)
  }, [handleSendMessage]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInputValue(e.target.value);
  }, []);

  const modifierKey = isMac ? 'Cmd' : 'Ctrl';
  const connectionStatusClass = isConnected ? 'connected' : 'disconnected';
  const placeholder = disabled
    ? 'Waiting for response...'
    : !isConnected
    ? 'Disconnected - reconnecting...'
    : 'Type a message...';

  return (
    <div className={`chat-input ${connectionStatusClass}`}>
      <div className="chat-input__wrapper">
        {inputMode === 'single' ? (
          <input
            ref={inputRef}
            type="text"
            className="chat-input__field chat-input__field--single"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleSingleLineKeyDown}
            placeholder={placeholder}
            disabled={disabled || !isConnected}
            aria-label="Chat message input"
          />
        ) : (
          <textarea
            ref={textareaRef}
            className="chat-input__field chat-input__field--multi"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleMultiLineKeyDown}
            placeholder={placeholder}
            disabled={disabled || !isConnected}
            rows={4}
            aria-label="Chat message input (multiline)"
          />
        )}

        <button
          className="chat-input__send-button"
          onClick={handleSendMessage}
          disabled={disabled || !isConnected || !inputValue.trim()}
          aria-label="Send message"
        >
          Send
        </button>
      </div>

      <div className="chat-input__hint" role="status" aria-live="polite">
        {inputMode === 'single' ? (
          <span>Press <kbd>Shift</kbd> + <kbd>Enter</kbd> for multiline</span>
        ) : (
          <span>Press <kbd>{modifierKey}</kbd> + <kbd>Enter</kbd> to send</span>
        )}
      </div>
    </div>
  );
};
