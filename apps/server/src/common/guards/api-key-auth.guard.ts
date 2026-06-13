import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { createHash } from 'node:crypto';

@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(private apiKeyRepo: ApiKeyRepo) {}

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

    request.user = { id: apiKeyRecord.creatorId };
    request.workspace = { id: apiKeyRecord.workspaceId };

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
