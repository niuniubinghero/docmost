import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { createHash } from 'node:crypto';
import { AuditEvent, AuditResource } from '../events/audit-events';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private apiKeyRepo: ApiKeyRepo,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key required');
    }

    const keyHash = this.hashApiKey(apiKey);

    const apiKeyRecord = await this.apiKeyRepo.findByHash(keyHash);

    if (!apiKeyRecord) {
      throw new UnauthorizedException('Invalid API key');
    }

    if (apiKeyRecord.expiresAt && new Date(apiKeyRecord.expiresAt) < new Date()) {
      throw new UnauthorizedException('API key has expired');
    }

    await this.apiKeyRepo.updateLastUsed(apiKeyRecord.id, apiKeyRecord.workspaceId);

    // Record API key usage as an audit event (fire-and-forget: must never
    // block or fail the incoming API request).
    void Promise.resolve(
      this.auditService.logWithContext(
        {
          event: AuditEvent.API_KEY_USED,
          resourceType: AuditResource.API_KEY,
          resourceId: apiKeyRecord.id,
          metadata: {
            apiKeyId: apiKeyRecord.id,
            apiKeyName: apiKeyRecord.name,
          },
        },
        {
          workspaceId: apiKeyRecord.workspaceId,
          actorId: apiKeyRecord.creatorId,
          actorType: 'api_key',
          ipAddress: request.ip ?? request.socket?.remoteAddress,
          userAgent: request.headers?.['user-agent'],
        },
      ),
    ).catch(() => {});

    // Match the shape set by JwtStrategy.validate: { user, workspace }
    // so @AuthUser() (request.user.user) and @AuthWorkspace() (request.user.workspace) work.
    request.user = {
      user: { id: apiKeyRecord.creatorId },
      workspace: { id: apiKeyRecord.workspaceId },
    };
    // null scopes => full access; non-null => restrict via @RequireScopes + ScopeGuard
    request.apiKeyScopes = apiKeyRecord.scopes;

    return true;
  }

  private extractApiKey(request: any): string | null {
    const authHeader = request.headers?.authorization;
    if (authHeader?.startsWith('Bearer dk_')) {
      return authHeader.slice(7);
    }

    const queryApiKey = request.query?.api_key;
    if (queryApiKey?.startsWith('dk_')) {
      return queryApiKey;
    }

    return null;
  }

  private hashApiKey(key: string): string {
    return createHash('sha256').update(key).digest('hex');
  }
}
