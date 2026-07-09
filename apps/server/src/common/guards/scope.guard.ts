import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_SCOPES_KEY } from '../decorators/require-scopes.decorator';

@Injectable()
export class ScopeGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const apiKeyScopes = request?.apiKeyScopes;

    // JWT users or full-access API keys (scopes === null | undefined) are allowed.
    if (apiKeyScopes === null || apiKeyScopes === undefined) {
      return true;
    }

    const requiredScopes = this.reflector.getAllAndOverride<string[]>(
      REQUIRE_SCOPES_KEY,
      [context.getHandler(), context.getClass()],
    );

    // No @RequireScopes on this endpoint => scoped API keys are not allowed.
    if (!requiredScopes || requiredScopes.length === 0) {
      throw new ForbiddenException('Insufficient API key scopes');
    }

    const hasScope = requiredScopes.some((scope) =>
      apiKeyScopes.includes(scope),
    );

    if (!hasScope) {
      throw new ForbiddenException('Insufficient API key scopes');
    }

    return true;
  }
}
