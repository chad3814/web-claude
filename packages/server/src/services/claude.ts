import Anthropic from '@anthropic-ai/sdk';

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeStreamChunk {
  type: 'content_block_delta' | 'message_start' | 'message_stop';
  delta?: {
    type: 'text_delta';
    text: string;
  };
}

export interface ClaudeServiceConfig {
  apiKey: string;
  model?: string;
  maxTokens?: number;
}

export class AnthropicAPIError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public errorType?: string
  ) {
    super(message);
    this.name = 'AnthropicAPIError';
  }
}

export class ClaudeService {
  private client: Anthropic;
  private model: string;
  private maxTokens: number;

  constructor(config: ClaudeServiceConfig) {
    if (!config.apiKey) {
      throw new AnthropicAPIError('API key is required', 500, 'missing_api_key');
    }

    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.maxTokens = config.maxTokens || 4096;
  }

  /**
   * Send a message and stream the response
   * @param messages - Conversation history including new user message
   * @param onChunk - Callback for each streaming chunk
   * @returns Promise that resolves when stream completes
   */
  async streamMessage(
    messages: ClaudeMessage[],
    onChunk: (chunk: ClaudeStreamChunk) => void
  ): Promise<void> {
    try {
      const stream = await this.client.messages.stream({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      for await (const chunk of stream) {
        if (chunk.type === 'message_start') {
          onChunk({ type: 'message_start' });
        } else if (chunk.type === 'content_block_delta') {
          if (chunk.delta.type === 'text_delta') {
            onChunk({
              type: 'content_block_delta',
              delta: {
                type: 'text_delta',
                text: chunk.delta.text,
              },
            });
          }
        } else if (chunk.type === 'message_stop') {
          onChunk({ type: 'message_stop' });
        }
      }
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  /**
   * Send a message and return complete response (non-streaming)
   * Useful for testing or specific use cases
   */
  async sendMessage(messages: ClaudeMessage[]): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        messages: messages.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const textContent = response.content.find(block => block.type === 'text');
      if (textContent && textContent.type === 'text') {
        return textContent.text;
      }

      return '';
    } catch (error) {
      throw this.handleAPIError(error);
    }
  }

  /**
   * Handle and transform API errors into standardized error types
   */
  private handleAPIError(error: unknown): AnthropicAPIError {
    if (error instanceof Anthropic.APIError) {
      const statusCode = error.status;
      const errorType = error.type || 'unknown_error';
      const message = error.message;

      // Handle rate limiting
      if (statusCode === 429) {
        return new AnthropicAPIError(
          'Rate limit exceeded. Please try again later.',
          429,
          'rate_limit_error'
        );
      }

      // Handle authentication errors
      if (statusCode === 401) {
        return new AnthropicAPIError(
          'Invalid API key',
          401,
          'authentication_error'
        );
      }

      // Handle server errors
      if (statusCode && statusCode >= 500) {
        return new AnthropicAPIError(
          'Anthropic API service error. Please try again later.',
          502,
          'service_error'
        );
      }

      return new AnthropicAPIError(message, statusCode, errorType);
    }

    if (error instanceof Error) {
      return new AnthropicAPIError(error.message, 500, 'unknown_error');
    }

    return new AnthropicAPIError('An unknown error occurred', 500, 'unknown_error');
  }
}
