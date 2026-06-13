import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { IAuditService, AUDIT_SERVICE } from '../../integrations/audit/audit.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class ApiKeyService {
  constructor(
    private apiKeyRepo: ApiKeyRepo,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getApiKeys(workspaceId: string) {
    return this.apiKeyRepo.findByWorkspace(workspaceId);
  }

  async createApiKey(
    dto: CreateApiKeyDto,
    workspaceId: string,
    userId: string,
  ) {
    const { apiKey, rawKey } = await this.apiKeyRepo.create({
      name: dto.name,
      creatorId: userId,
      workspaceId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    });

    this.auditService.log({
      event: AuditEvent.API_KEY_CREATED,
      resourceType: AuditResource.API_KEY,
      resourceId: apiKey.id,
    });

    return { apiKey, rawKey };
  }

  async updateApiKey(
    keyId: string,
    workspaceId: string,
    data: { name?: string },
  ) {
    const apiKey = await this.apiKeyRepo.findById(keyId, workspaceId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepo.update(keyId, workspaceId, data);

    return this.apiKeyRepo.findById(keyId, workspaceId);
  }

  async revokeApiKey(keyId: string, workspaceId: string) {
    const apiKey = await this.apiKeyRepo.findById(keyId, workspaceId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepo.revoke(keyId, workspaceId);

    this.auditService.log({
      event: AuditEvent.API_KEY_DELETED,
      resourceType: AuditResource.API_KEY,
      resourceId: keyId,
    });
  }

  async deleteApiKey(keyId: string, workspaceId: string) {
    const apiKey = await this.apiKeyRepo.findById(keyId, workspaceId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepo.delete(keyId, workspaceId);

    this.auditService.log({
      event: AuditEvent.API_KEY_DELETED,
      resourceType: AuditResource.API_KEY,
      resourceId: keyId,
    });
  }
}
