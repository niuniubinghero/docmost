import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { AiProvider } from '@docmost/db/repos/ai-provider/ai-provider.repo';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  provider?: AiProvider;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

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
  ): AsyncGenerator<string> {
    const provider = options?.provider;

    if (!provider) {
      throw new BadRequestException('No AI provider configured. Please ask an administrator to set up an AI provider.');
    }

    yield* this.streamProvider(provider, messages, options);
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
  ): AsyncGenerator<string> {
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

    const response = await fetch(chatUrl, {
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
    });

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
  ): AsyncGenerator<string> {
    const chatUrl = baseUrl.endsWith('/v1')
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;

    const response = await fetch(chatUrl, {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`AI API error: ${error}`);
      throw new BadRequestException(`AI request failed: ${response.statusText}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices[0]?.delta?.content;
            if (content) {
              yield content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  private async callClaude(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/messages`, {
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
    });

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
  ): AsyncGenerator<string> {
    const response = await fetch(`${baseUrl}/messages`, {
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
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Claude API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
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
            if (parsed.type === 'content_block_delta') {
              yield parsed.delta?.text || '';
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }

  private async callGemini(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const url = `${baseUrl}/models/${provider.modelName}:generateContent?key=${provider.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: messages.map((m) => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content }],
        })),
      }),
    });

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
  ): AsyncGenerator<string> {
    const result = await this.callGemini(provider, baseUrl, messages, options);
    yield result;
  }

  private async callOllama(
    provider: AiProvider,
    baseUrl: string,
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.modelName,
        messages,
        stream: false,
      }),
    });

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
  ): AsyncGenerator<string> {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.modelName,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`Ollama API error: ${response.status} - ${error}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
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
              yield parsed.message.content;
            }
          } catch (e) {
            // Skip invalid JSON
          }
        }
      }
    }
  }
}
