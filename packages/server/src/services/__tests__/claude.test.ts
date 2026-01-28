import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClaudeService, AnthropicAPIError, type ClaudeMessage } from '../claude';
import Anthropic from '@anthropic-ai/sdk';

describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(() => {
    service = new ClaudeService({
      apiKey: 'test-api-key',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 1024,
    });
  });

  describe('constructor', () => {
    it('should create service with valid config', () => {
      expect(service).toBeInstanceOf(ClaudeService);
    });

    it('should throw error when API key is missing', () => {
      expect(() => new ClaudeService({ apiKey: '' })).toThrow(AnthropicAPIError);
      expect(() => new ClaudeService({ apiKey: '' })).toThrow('API key is required');
    });

    it('should use default model and maxTokens when not provided', () => {
      const defaultService = new ClaudeService({ apiKey: 'test-key' });
      expect(defaultService).toBeInstanceOf(ClaudeService);
    });
  });

  describe('sendMessage', () => {
    it('should handle empty message array', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Hello!' }],
      });
      vi.spyOn(service['client'].messages, 'create').mockImplementation(mockCreate);

      const messages: ClaudeMessage[] = [];
      const response = await service.sendMessage(messages);
      expect(response).toBe('Hello!');
    });

    it('should format messages correctly', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'Response' }],
      });
      vi.spyOn(service['client'].messages, 'create').mockImplementation(mockCreate);

      const messages: ClaudeMessage[] = [
        { role: 'user', content: 'Hello' },
        { role: 'assistant', content: 'Hi there!' },
        { role: 'user', content: 'How are you?' },
      ];

      await service.sendMessage(messages);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: 'Hello' },
          { role: 'assistant', content: 'Hi there!' },
          { role: 'user', content: 'How are you?' },
        ],
      });
    });

    it('should return empty string when no text content', async () => {
      const mockCreate = vi.fn().mockResolvedValue({
        content: [],
      });
      vi.spyOn(service['client'].messages, 'create').mockImplementation(mockCreate);

      const response = await service.sendMessage([{ role: 'user', content: 'test' }]);
      expect(response).toBe('');
    });
  });

  describe('error handling', () => {
    it('should handle rate limit errors (429)', async () => {
      const apiError = new Anthropic.APIError(
        429,
        { type: 'rate_limit_error', message: 'Rate limit exceeded' },
        'Rate limit exceeded',
        new Headers()
      );

      vi.spyOn(service['client'].messages, 'create').mockRejectedValue(apiError);

      await expect(service.sendMessage([{ role: 'user', content: 'test' }]))
        .rejects
        .toThrow(AnthropicAPIError);

      try {
        await service.sendMessage([{ role: 'user', content: 'test' }]);
      } catch (error) {
        expect(error).toBeInstanceOf(AnthropicAPIError);
        expect((error as AnthropicAPIError).statusCode).toBe(429);
        expect((error as AnthropicAPIError).errorType).toBe('rate_limit_error');
      }
    });

    it('should handle authentication errors (401)', async () => {
      const apiError = new Anthropic.APIError(
        401,
        { type: 'authentication_error', message: 'Invalid API key' },
        'Invalid API key',
        new Headers()
      );

      vi.spyOn(service['client'].messages, 'create').mockRejectedValue(apiError);

      try {
        await service.sendMessage([{ role: 'user', content: 'test' }]);
      } catch (error) {
        expect(error).toBeInstanceOf(AnthropicAPIError);
        expect((error as AnthropicAPIError).statusCode).toBe(401);
      }
    });

    it('should handle server errors (5xx)', async () => {
      const apiError = new Anthropic.APIError(
        503,
        { type: 'service_unavailable', message: 'Service unavailable' },
        'Service unavailable',
        new Headers()
      );

      vi.spyOn(service['client'].messages, 'create').mockRejectedValue(apiError);

      try {
        await service.sendMessage([{ role: 'user', content: 'test' }]);
      } catch (error) {
        expect(error).toBeInstanceOf(AnthropicAPIError);
        expect((error as AnthropicAPIError).statusCode).toBe(502);
        expect((error as AnthropicAPIError).errorType).toBe('service_error');
      }
    });

    it('should handle generic errors', async () => {
      const genericError = new Error('Network error');
      vi.spyOn(service['client'].messages, 'create').mockRejectedValue(genericError);

      try {
        await service.sendMessage([{ role: 'user', content: 'test' }]);
      } catch (error) {
        expect(error).toBeInstanceOf(AnthropicAPIError);
        expect((error as AnthropicAPIError).statusCode).toBe(500);
      }
    });
  });

  describe('streamMessage', () => {
    it('should handle stream events correctly', async () => {
      const chunks = [
        { type: 'message_start' as const },
        { type: 'content_block_delta' as const, delta: { type: 'text_delta' as const, text: 'Hello' } },
        { type: 'content_block_delta' as const, delta: { type: 'text_delta' as const, text: ' world' } },
        { type: 'message_stop' as const },
      ];

      const mockStream = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        },
      };

      vi.spyOn(service['client'].messages, 'stream').mockResolvedValue(mockStream as any);

      const receivedChunks: any[] = [];
      await service.streamMessage(
        [{ role: 'user', content: 'Hi' }],
        (chunk) => receivedChunks.push(chunk)
      );

      expect(receivedChunks).toHaveLength(4);
      expect(receivedChunks[0]).toEqual({ type: 'message_start' });
      expect(receivedChunks[1]).toEqual({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: 'Hello' },
      });
      expect(receivedChunks[2]).toEqual({
        type: 'content_block_delta',
        delta: { type: 'text_delta', text: ' world' },
      });
      expect(receivedChunks[3]).toEqual({ type: 'message_stop' });
    });

    it('should handle streaming errors', async () => {
      const apiError = new Anthropic.APIError(
        429,
        { type: 'rate_limit_error', message: 'Rate limit' },
        'Rate limit',
        new Headers()
      );

      vi.spyOn(service['client'].messages, 'stream').mockRejectedValue(apiError);

      await expect(
        service.streamMessage(
          [{ role: 'user', content: 'test' }],
          () => {}
        )
      ).rejects.toThrow(AnthropicAPIError);
    });
  });
});
