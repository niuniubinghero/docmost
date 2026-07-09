import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiProvider } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import type { AiToolDefinition, AiToolCall } from './ai-tools';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  tool_call_id?: string;
  tool_calls?: AiToolCall[];
}

export interface AiChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  provider?: AiProvider;
  timeoutMs?: number;
  tools?: AiToolDefinition[];
}

export interface AiStreamChunk {
  type: 'content' | 'tool_call';
  content?: string;
  toolCall?: AiToolCall;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  private withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new BadRequestException(`AI request timed out after ${ms}ms`));
      }, ms);

      promise.then(
        (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        (err) => {
          clearTimeout(timer);
          reject(err);
        },
      );
    });
  }

  async chat(
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const provider = options?.provider;

    if (!provider) {
      throw new BadRequestException('No AI provider configured. Please ask an administrator to set up an AI provider.');
    }

    return this.callProvider(provider, messages, options);
  }

  async *chatStream(
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const provider = options?.provider;

    if (!provider) {
      throw new BadRequestException('No AI provider configured. Please ask an administrator to set up an AI provider.');
    }

    const timeoutMs = options?.timeoutMs ?? 120000;
    const startTime = Date.now();

    try {
      for await (const chunk of this.streamProvider(provider, messages, options)) {
        if (Date.now() - startTime > timeoutMs) {
          throw new BadRequestException(`AI streaming timed out after ${timeoutMs}ms`);
        }
        yield chunk;
      }
    } catch (error: any) {
      if (error instanceof BadRequestException) throw error;
      throw new BadRequestException(`AI streaming error: ${error.message || 'Unknown error'}`);
    }
  }

  async aiSearch(query: string, context: string, provider?: AiProvider): Promise<string> {
    if (!provider) {
      throw new BadRequestException('No AI provider configured.');
    }

    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: `You are a helpful assistant. Answer the user's question based on the following context:\n\n${context}`,
      },
      { role: 'user', content: query },
    ];

    return this.callProvider(provider, messages);
  }

  async webSearch(query: string): Promise<Array<{ title: string; url: string; snippet: string }>> {
    const searchUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    try {
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const html = await response.text();
      const results: Array<{ title: string; url: string; snippet: string }> = [];

      const resultRegex = /<a[^>]*class="result__a"[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>[\s\S]*?<a[^>]*class="result__snippet"[^>]*>(.*?)<\/a>/g;
      let match;

      while ((match = resultRegex.exec(html)) !== null && results.length < 5) {
        const url = match[1];
        const title = match[2].replace(/<[^>]*>/g, '').trim();
        const snippet = match[3].replace(/<[^>]*>/g, '').trim();

        if (url && title) {
          results.push({ title, url, snippet });
        }
      }

      return results;
    } catch (error: any) {
      this.logger.error(`Web search error: ${error.message}`);
      return [];
    }
  }

  private async callProvider(
    provider: AiProvider,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const baseUrl = provider.baseUrl?.replace(/\/+$/, '');

    if (provider.type === 'claude') {
      return this.callClaude(provider, baseUrl, messages, options);
    }

    if (provider.type === 'gemini') {
      return this.callGemini(provider, baseUrl, messages, options);
    }

    if (provider.type === 'ollama') {
      return this.callOllama(provider, baseUrl, messages, options);
    }

    return this.callOpenAiCompatible(provider, baseUrl, messages, options);
  }

  private async *streamProvider(
    provider: AiProvider,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const baseUrl = provider.baseUrl?.replace(/\/+$/, '');

    if (provider.type === 'claude') {
      yield* this.streamClaude(provider, baseUrl, messages, options);
      return;
    }

    if (provider.type === 'gemini') {
      yield* this.streamGemini(provider, baseUrl, messages, options);
      return;
    }

    if (provider.type === 'ollama') {
      yield* this.streamOllama(provider, baseUrl, messages, options);
      return;
    }

    yield* this.streamOpenAiCompatible(provider, baseUrl, messages, options);
  }

  private async callOpenAiCompatible(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const chatUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;

    const response = await this.withTimeout(
      fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        },
        body: JSON.stringify({
          model: options?.model || provider.modelName,
          messages,
          temperature: options?.temperature ?? 0.7,
          max_tokens: options?.maxTokens ?? 2048,
          stream: false,
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`AI API error: ${error}`);
      throw new BadRequestException(`AI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async *streamOpenAiCompatible(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const chatUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;

    const timeoutMs = options?.timeoutMs ?? 120000;

    const body: any = {
      model: options?.model || provider.modelName,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      stream: true,
    };

    if (options?.tools?.length) {
      body.tools = options.tools;
      body.tool_choice = 'auto';
    }

    const response = await this.withTimeout(
      fetch(chatUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(provider.apiKey ? { Authorization: `Bearer ${provider.apiKey}` } : {}),
        },
        body: JSON.stringify(body),
      }),
      10000,
    );

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`AI API error: ${error}`);

      let errorMessage = `AI request failed: ${response.statusText}`;
      try {
        const errorJson = JSON.parse(error);
        if (errorJson.error?.message) {
          errorMessage = errorJson.error.message;
        } else if (errorJson.message) {
          errorMessage = errorJson.message;
        }
      } catch (e) {
        // Use default error message
      }

      throw new BadRequestException(errorMessage);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const startTime = Date.now();

    // Accumulate tool calls from streaming deltas
    const toolCallAccumulator: Map<number, { id: string; name: string; arguments: string }> = new Map();

    try {
      while (true) {
        if (Date.now() - startTime > timeoutMs) {
          throw new BadRequestException(`AI streaming timed out after ${timeoutMs}ms`);
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              // Yield accumulated tool calls
              for (const [, tc] of toolCallAccumulator) {
                yield {
                  type: 'tool_call',
                  toolCall: { id: tc.id, name: tc.name, arguments: tc.arguments },
                };
              }
              return;
            }

            try {
              const parsed = JSON.parse(data);

              if (parsed.error) {
                throw new BadRequestException(parsed.error.message || 'Stream error');
              }

              const choice = parsed.choices?.[0];
              if (!choice) continue;

              // Handle content delta
              const content = choice.delta?.content;
              if (content) {
                yield { type: 'content', content };
              }

              // Handle tool call deltas
              const toolCalls = choice.delta?.tool_calls;
              if (toolCalls) {
                for (const tc of toolCalls) {
                  const idx = tc.index ?? 0;
                  if (!toolCallAccumulator.has(idx)) {
                    toolCallAccumulator.set(idx, {
                      id: tc.id || '',
                      name: tc.function?.name || '',
                      arguments: '',
                    });
                  }
                  const acc = toolCallAccumulator.get(idx)!;
                  if (tc.id) acc.id = tc.id;
                  if (tc.function?.name) acc.name = tc.function.name;
                  if (tc.function?.arguments) acc.arguments += tc.function.arguments;
                }
              }
            } catch (e) {
              if (e instanceof BadRequestException) throw e;
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callClaude(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const response = await this.withTimeout(
      fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.modelName,
          max_tokens: options?.maxTokens ?? 2048,
          messages: messages.filter((m) => m.role !== 'system'),
          system: messages.find((m) => m.role === 'system')?.content,
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async *streamClaude(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const response = await this.withTimeout(
      fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': provider.apiKey || '',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: provider.modelName,
          max_tokens: options?.maxTokens ?? 4096,
          messages: messages.filter((m) => m.role !== 'system'),
          system: messages.find((m) => m.role === 'system')?.content,
          stream: true,
          ...(options?.tools?.length ? { tools: options.tools.map(t => ({
            name: t.function.name,
            description: t.function.description,
            input_schema: t.function.parameters,
          })) } : {}),
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Claude API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const timeoutMs = options?.timeoutMs ?? 120000;
    const startTime = Date.now();

    // Accumulate tool use blocks from Claude streaming
    const toolUseAccumulator: Map<string, { id: string; name: string; input: string }> = new Map();

    try {
      while (true) {
        if (Date.now() - startTime > timeoutMs) {
          throw new BadRequestException(`Claude streaming timed out after ${timeoutMs}ms`);
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              if (parsed.type === 'content_block_start') {
                // Track tool_use content blocks
                if (parsed.content_block?.type === 'tool_use') {
                  toolUseAccumulator.set(parsed.index?.toString() || parsed.content_block.id, {
                    id: parsed.content_block.id || '',
                    name: parsed.content_block.name || '',
                    input: '',
                  });
                }
              } else if (parsed.type === 'content_block_delta') {
                if (parsed.delta?.type === 'text_delta') {
                  yield { type: 'content', content: parsed.delta.text || '' };
                } else if (parsed.delta?.type === 'input_json_delta') {
                  // Accumulate tool use input JSON deltas
                  const key = parsed.index?.toString();
                  if (key && toolUseAccumulator.has(key)) {
                    toolUseAccumulator.get(key)!.input += parsed.delta.partial_json || '';
                  }
                }
              } else if (parsed.type === 'message_stop') {
                // Yield all accumulated tool calls
                for (const [, tc] of toolUseAccumulator) {
                  yield {
                    type: 'tool_call',
                    toolCall: { id: tc.id, name: tc.name, arguments: tc.input },
                  };
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callGemini(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const url = `${baseUrl}/models/${provider.modelName}:generateContent`;
    const response = await this.withTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': provider.apiKey || '',
        },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Gemini API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async *streamGemini(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const url = `${baseUrl}/models/${provider.modelName}:streamGenerateContent?alt=sse`;
    const timeoutMs = options?.timeoutMs ?? 120000;

    const response = await this.withTimeout(
      fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': provider.apiKey || '',
        },
        body: JSON.stringify({
          contents: messages.map((m) => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }],
          })),
          generationConfig: {
            maxOutputTokens: options?.maxTokens ?? 2048,
            temperature: options?.temperature ?? 0.7,
          },
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Gemini API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const startTime = Date.now();

    try {
      while (true) {
        if (Date.now() - startTime > timeoutMs) {
          throw new BadRequestException(`Gemini streaming timed out after ${timeoutMs}ms`);
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const parsed = JSON.parse(data);
              const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
              if (text) yield { type: 'content', content: text };
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private async callOllama(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const response = await this.withTimeout(
      fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.modelName,
          messages,
          stream: false,
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }

  private async *streamOllama(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<AiStreamChunk> {
    const timeoutMs = options?.timeoutMs ?? 120000;

    const response = await this.withTimeout(
      fetch(`${baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: provider.modelName,
          messages,
          stream: true,
        }),
      }),
      30000,
    );

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Ollama API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    const startTime = Date.now();

    try {
      while (true) {
        if (Date.now() - startTime > timeoutMs) {
          throw new BadRequestException(`Ollama streaming timed out after ${timeoutMs}ms`);
        }

        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.content) {
                yield { type: 'content', content: parsed.message.content };
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }
}
