import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { CreateApiKeyDto } from './dto/api-key.dto';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { IAuditService, AUDIT_SERVICE } from '../../integrations/audit/audit.service';
import { Inject } from '@nestjs/common';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@Injectable()
export class ApiKeyService {
  constructor(
    private apiKeyRepo: ApiKeyRepo,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getApiKeys(workspaceId: string, pagination: PaginationOptions) {
    return this.apiKeyRepo.findByWorkspace(workspaceId, pagination);
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
      scopes: dto.scopes,
    });

    this.auditService.log({
      event: AuditEvent.API_KEY_CREATED,
      resourceType: AuditResource.API_KEY,
      resourceId: apiKey.id,
      metadata: { scopes: dto.scopes },
    });

    return { ...apiKey, token: rawKey };
  }

  async updateApiKey(
    keyId: string,
    workspaceId: string,
    data: { name?: string; scopes?: string[] },
  ) {
    const apiKey = await this.apiKeyRepo.findById(keyId, workspaceId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepo.update(keyId, workspaceId, data);

    this.auditService.log({
      event: AuditEvent.API_KEY_UPDATED,
      resourceType: AuditResource.API_KEY,
      resourceId: keyId,
      metadata: { name: data.name, scopes: data.scopes },
    });

    return this.apiKeyRepo.findById(keyId, workspaceId);
  }

  async revokeApiKey(keyId: string, workspaceId: string) {
    const apiKey = await this.apiKeyRepo.findById(keyId, workspaceId);
    if (!apiKey) {
      throw new NotFoundException('API key not found');
    }

    await this.apiKeyRepo.revoke(keyId, workspaceId);

    this.auditService.log({
      event: AuditEvent.API_KEY_REVOKED,
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
