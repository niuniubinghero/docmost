import { Injectable, Logger } from '@nestjs/common';
import { EnvironmentService } from '../../integrations/environment/environment.service';

export interface AiChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiChatOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private environmentService: EnvironmentService) {}

  private getApiConfig() {
    return {
      apiKey: this.environmentService.getOpenAiApiKey(),
      baseUrl: this.environmentService.getOpenAiApiUrl() || 'https://api.xiaomi.com/mimo',
      model: this.environmentService.getAiCompletionModel() || 'mimo-7b',
    };
  }

  async chat(
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): Promise<string> {
    const config = this.getApiConfig();

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`MiMo API error: ${error}`);
      throw new Error(`AI request failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices[0].message.content;
  }

  async *chatStream(
    messages: AiChatMessage[],
    options?: AiChatOptions,
  ): AsyncGenerator<string> {
    const config = this.getApiConfig();

    const response = await fetch(`${config.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({
        model: options?.model || config.model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 2048,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      this.logger.error(`MiMo API error: ${error}`);
      throw new Error(`AI request failed: ${response.statusText}`);
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
            // Skip invalid JSON lines
          }
        }
      }
    }
  }

  async improveWriting(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a professional writing assistant. Improve the writing quality of the text while maintaining its meaning. Fix grammar, spelling, and improve clarity.',
      },
      { role: 'user', content: text },
    ]);
  }

  async fixSpelling(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a spelling and grammar checker. Fix all spelling and grammar errors in the text. Return only the corrected text without explanations.',
      },
      { role: 'user', content: text },
    ]);
  }

  async makeShorter(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a concise writing assistant. Make the text shorter while preserving the key information. Be brief and to the point.',
      },
      { role: 'user', content: text },
    ]);
  }

  async makeLonger(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are an expandable writing assistant. Expand the text with more details and explanations while maintaining the original meaning.',
      },
      { role: 'user', content: text },
    ]);
  }

  async simplify(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a simple language assistant. Simplify the text to make it easier to understand. Use simple words and short sentences.',
      },
      { role: 'user', content: text },
    ]);
  }

  async changeTone(text: string, tone: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `You are a tone adjustment assistant. Change the tone of the text to be ${tone} while preserving the meaning.`,
      },
      { role: 'user', content: text },
    ]);
  }

  async summarize(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a summarization assistant. Create a concise summary of the text, capturing the key points.',
      },
      { role: 'user', content: text },
    ]);
  }

  async explain(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are an explanation assistant. Explain the text in simple terms, making it easy to understand.',
      },
      { role: 'user', content: text },
    ]);
  }

  async translate(text: string, targetLanguage: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `You are a professional translator. Translate the text to ${targetLanguage}. Maintain the original meaning and tone.`,
      },
      { role: 'user', content: text },
    ]);
  }

  async continueWriting(text: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: 'You are a creative writing assistant. Continue the text naturally, maintaining the style and context.',
      },
      { role: 'user', content: text },
    ]);
  }

  async aiSearch(query: string, context: string): Promise<string> {
    return this.chat([
      {
        role: 'system',
        content: `You are a helpful assistant. Answer the user's question based on the following context:\n\n${context}`,
      },
      { role: 'user', content: query },
    ]);
  }
}
