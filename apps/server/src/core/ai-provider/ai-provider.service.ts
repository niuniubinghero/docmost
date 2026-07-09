import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { AiProviderRepo, AiProvider } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import {
  CreateAiProviderDto,
  UpdateAiProviderDto,
  AI_PROVIDER_DEFAULTS,
} from './dto/ai-provider.dto';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { IAuditService, AUDIT_SERVICE } from '../../integrations/audit/audit.service';
import { Inject } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { JsonValue } from '@docmost/db/types/db.d';

/**
 * Validates that a URL does not point to a private/internal network address.
 * This prevents SSRF attacks where a malicious user could configure an internal
 * URL to access metadata services, internal APIs, etc.
 */
function validatePublicUrl(urlStr: string): void {
  let url: URL;
  try {
    url = new URL(urlStr);
  } catch {
    throw new Error('Invalid URL provided');
  }

  const hostname = url.hostname.toLowerCase();

  // Block private IP ranges and internal hostnames
  const privatePatterns = [
    /^localhost$/i,
    /^127\.\d+\.\d+\.\d+$/,
    /^10\.\d+\.\d+\.\d+$/,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\.\d+$/,
    /^192\.168\.\d+\.\d+$/,
    /^169\.254\.\d+\.\d+$/,
    /^0\.\d+\.\d+\.\d+$/,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ];

  for (const pattern of privatePatterns) {
    if (pattern.test(hostname)) {
      throw new Error('Internal/private URLs are not allowed for security reasons');
    }
  }

  // Block well-known internal metadata endpoints
  const internalMetaPatterns = [
    /^169\.254\.169\.254$/,
    /^metadata\.internal$/i,
    /^metadata\.azure$/i,
    /^metadata\.google$/i,
  ];

  for (const pattern of internalMetaPatterns) {
    if (pattern.test(hostname)) {
      throw new Error('Internal metadata endpoints are not allowed for security reasons');
    }
  }
}

@Injectable()
export class AiProviderService {
  constructor(
    private aiProviderRepo: AiProviderRepo,
    @InjectKysely() private readonly db: KyselyDB,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getProviders(workspaceId: string) {
    return this.aiProviderRepo.findByWorkspace(workspaceId);
  }

  async getProviderById(providerId: string, workspaceId: string) {
    const provider = await this.aiProviderRepo.findById(providerId, workspaceId);
    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }
    return provider;
  }

  async getDefaultProvider(workspaceId: string) {
    return this.aiProviderRepo.findDefault(workspaceId);
  }

  async createProvider(dto: CreateAiProviderDto, workspaceId: string) {
    if (dto.isDefault) {
      await this.aiProviderRepo.clearDefault(workspaceId);
    }

    const defaults = AI_PROVIDER_DEFAULTS[dto.type];
    const provider = await this.aiProviderRepo.create({
      workspaceId,
      name: dto.name || defaults.name,
      type: dto.type,
      apiKey: dto.apiKey,
      baseUrl: dto.baseUrl || defaults.baseUrl,
      modelName: dto.modelName || defaults.modelName,
      isDefault: dto.isDefault ?? false,
      isActive: dto.isActive ?? true,
      config: dto.config || {},
    });

    this.auditService.log({
      event: AuditEvent.WORKSPACE_UPDATED,
      resourceType: AuditResource.WORKSPACE,
      resourceId: workspaceId,
    });

    return provider;
  }

  async updateProvider(
    providerId: string,
    workspaceId: string,
    dto: UpdateAiProviderDto,
  ) {
    const provider = await this.aiProviderRepo.findById(providerId, workspaceId);
    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    if (dto.isDefault) {
      await this.aiProviderRepo.clearDefault(workspaceId);
    }

    await this.aiProviderRepo.update(providerId, workspaceId, dto);

    return this.aiProviderRepo.findById(providerId, workspaceId);
  }

  async deleteProvider(providerId: string, workspaceId: string) {
    const provider = await this.aiProviderRepo.findById(providerId, workspaceId);
    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    await this.aiProviderRepo.delete(providerId, workspaceId);

    this.auditService.log({
      event: AuditEvent.WORKSPACE_UPDATED,
      resourceType: AuditResource.WORKSPACE,
      resourceId: workspaceId,
    });
  }

  async setDefault(providerId: string, workspaceId: string) {
    const provider = await this.aiProviderRepo.findById(providerId, workspaceId);
    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    await this.db.transaction().execute(async (trx) => {
      await this.aiProviderRepo.clearDefault(workspaceId, trx);
      await this.aiProviderRepo.update(providerId, workspaceId, { isDefault: true }, trx);
    });

    return this.aiProviderRepo.findById(providerId, workspaceId);
  }

  async testConnection(providerId: string, workspaceId: string) {
    const provider = await this.aiProviderRepo.findById(providerId, workspaceId);
    if (!provider) {
      throw new NotFoundException('AI provider not found');
    }

    try {
      const result = await this.callProvider(provider, 'Hello, respond with "OK" only.');
      return { success: true, response: result };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }

  async fetchModels(
    type: string,
    apiKey?: string,
    baseUrl?: string,
  ): Promise<{ models: string[] }> {
    try {
      // SSRF protection: validate URL for non-local providers
      if (baseUrl && type !== 'ollama') {
        validatePublicUrl(baseUrl);
      }

      let models: string[] = [];

      switch (type) {
        case 'openai':
        case 'deepseek':
        case 'kimi':
        case 'qwen':
        case 'mimo':
        case 'custom':
        case 'claude-compat':
          models = await this.fetchOpenAiCompatibleModels(apiKey, baseUrl);
          break;
        case 'ollama':
          models = await this.fetchOllamaModels(baseUrl);
          break;
        case 'gemini':
          models = await this.fetchGeminiModels(apiKey);
          break;
        case 'claude':
          // Claude API doesn't have a public models endpoint, use curated list
          models = [
            'claude-opus-4-20250514',
            'claude-sonnet-4-20250514',
            'claude-3-7-sonnet-20250219',
            'claude-3-5-sonnet-20241022',
            'claude-3-5-haiku-20241022',
            'claude-3-haiku-20240307',
          ];
          break;
        default:
          models = await this.fetchOpenAiCompatibleModels(apiKey, baseUrl);
      }

      return { models };
    } catch (error: any) {
      throw new BadRequestException(`Failed to fetch models: ${error.message}`);
    }
  }

  private async fetchOpenAiCompatibleModels(
    apiKey?: string,
    baseUrl?: string,
  ): Promise<string[]> {
    let url = (baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
    if (!url.endsWith('/models')) {
      url = url.endsWith('/v1')
        ? `${url}/models`
        : `${url}/v1/models`;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(url, { method: 'GET', headers });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    const items = data.data || data.models || data;
    const models = Array.isArray(items)
      ? items.map((m: any) => m.id || m.name || m).filter(Boolean)
      : [];

    return models.sort();
  }

  private async fetchOllamaModels(baseUrl?: string): Promise<string[]> {
    const url = (baseUrl || 'http://localhost:11434').replace(/\/+$/, '');
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const data = await response.json();
    const models = (data.models || []).map((m: any) => m.name || m.model).filter(Boolean);
    return models.sort();
  }

  private async fetchGeminiModels(apiKey?: string): Promise<string[]> {
    if (!apiKey) {
      throw new Error('API key is required for Gemini');
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned ${response.status}`);
    }

    const data = await response.json();
    const models = (data.models || [])
      .filter((m: any) =>
        m.supportedGenerationMethods?.includes('generateContent') ||
        m.supportedGenerationMethods?.includes('countTokens')
      )
      .map((m: any) => m.name?.replace('models/', '') || m.name)
      .filter(Boolean);

    return models.sort();
  }

  private async callProvider(provider: AiProvider, prompt: string): Promise<string> {
    const baseUrl = provider.baseUrl?.replace(/\/+$/, '');

    if (provider.type === 'claude') {
      return this.callClaude(provider, baseUrl, prompt);
    }

    if (provider.type === 'gemini') {
      return this.callGemini(provider, baseUrl, prompt);
    }

    if (provider.type === 'ollama') {
      return this.callOllama(provider, baseUrl, prompt);
    }

    return this.callOpenAiCompatible(provider, baseUrl, prompt);
  }

  private async callOpenAiCompatible(
    provider: AiProvider,
    baseUrl: string,
    prompt: string,
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
        model: provider.modelName,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 100,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  private async callClaude(
    provider: AiProvider,
    baseUrl: string,
    prompt: string,
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
        max_tokens: 100,
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || '';
  }

  private async callGemini(
    provider: AiProvider,
    baseUrl: string,
    prompt: string,
  ): Promise<string> {
    const url = `${baseUrl}/models/${provider.modelName}:generateContent`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': provider.apiKey || '',
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || '';
  }

  private async callOllama(
    provider: AiProvider,
    baseUrl: string,
    prompt: string,
  ): Promise<string> {
    const response = await fetch(`${baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: provider.modelName,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new BadRequestException(`API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.message?.content || '';
  }
}
