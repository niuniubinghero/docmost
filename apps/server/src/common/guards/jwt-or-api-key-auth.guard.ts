import {
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { addDays } from 'date-fns';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { ApiKeyAuthGuard } from './api-key-auth.guard';
import { EnvironmentService } from '../../integrations/environment/environment.service';
import {
  AUDIT_SERVICE,
  IAuditService,
} from '../../integrations/audit/audit.service';

/**
 * Combined auth guard that accepts either a JWT (the default flow) or a
 * community `dk_`-prefixed API key. API key requests are detected via the
 * `Authorization: Bearer dk_...` header or the `?api_key=dk_...` query param
 * and routed to ApiKeyAuthGuard; everything else falls through to the JWT
 * passport strategy.
 *
 * @Public() endpoints are skipped, mirroring JwtAuthGuard's behaviour.
 */
@Injectable()
export class JwtOrApiKeyAuthGuard extends AuthGuard('jwt') {
  private readonly apiKeyGuard: ApiKeyAuthGuard;

  constructor(
    private reflector: Reflector,
    private environmentService: EnvironmentService,
    apiKeyRepo: ApiKeyRepo,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {
    super();
    this.apiKeyGuard = new ApiKeyAuthGuard(apiKeyRepo, auditService);
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const authHeader: string = request.headers?.authorization || '';
    const apiKeyParam = request.query?.api_key;

    const isApiKeyRequest =
      authHeader.startsWith('Bearer dk_') ||
      (typeof apiKeyParam === 'string' && apiKeyParam.startsWith('dk_'));

    if (isApiKeyRequest) {
      return this.apiKeyGuard.canActivate(context);
    }

    return (super.canActivate(context) as Promise<boolean>);
  }

  handleRequest(err: any, user: any, info: any, ctx: ExecutionContext) {
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    this.setJoinedWorkspacesCookie(user, ctx);
    return user;
  }

  setJoinedWorkspacesCookie(user: any, ctx: ExecutionContext) {
    if (this.environmentService.isCloud()) {
      const req = ctx.switchToHttp().getRequest();
      const res = ctx.switchToHttp().getResponse();

      const workspaceId = user?.workspace?.id;
      let workspaceIds = [];
      try {
        workspaceIds = req.cookies.joinedWorkspaces
          ? JSON.parse(req.cookies.joinedWorkspaces)
          : [];
      } catch (err) {
        /* empty */
      }

      if (!workspaceIds.includes(workspaceId)) {
        workspaceIds.push(workspaceId);
      }

      res.setCookie('joinedWorkspaces', JSON.stringify(workspaceIds), {
        httpOnly: false,
        domain: '.' + this.environmentService.getSubdomainHost(),
        path: '/',
        expires: addDays(new Date(), 365),
        secure: this.environmentService.isHttps(),
      });
    }
  }
}
