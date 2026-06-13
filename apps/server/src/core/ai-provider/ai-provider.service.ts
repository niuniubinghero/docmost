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
import { JsonValue } from '@docmost/db/types/db.d';

@Injectable()
export class AiProviderService {
  constructor(
    private aiProviderRepo: AiProviderRepo,
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

    await this.aiProviderRepo.clearDefault(workspaceId);
    await this.aiProviderRepo.update(providerId, workspaceId, { isDefault: true });

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
    const url = `${baseUrl}/models/${provider.modelName}:generateContent?key=${provider.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
