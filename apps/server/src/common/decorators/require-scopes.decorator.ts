import { SetMetadata } from '@nestjs/common';

export const REQUIRE_SCOPES_KEY = 'requireScopes';

/**
 * Marks an endpoint as requiring at least one of the given API key scopes.
 * The ScopeGuard checks this metadata against request.apiKeyScopes.
 *
 * - JWT users and full-access API keys (scopes === null) bypass this check.
 * - API keys with a specific scope array must hold at least one listed scope.
 * - Endpoints without this decorator are inaccessible to scoped API keys
 *   (they are still accessible to JWT users and full-access API keys).
 */
export const RequireScopes = (...scopes: string[]) =>
  SetMetadata(REQUIRE_SCOPES_KEY, scopes);
