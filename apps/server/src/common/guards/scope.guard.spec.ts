import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { ScopeGuard } from './scope.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { REQUIRE_SCOPES_KEY } from '../decorators/require-scopes.decorator';

describe('ScopeGuard', () => {
  let guard: ScopeGuard;
  let reflector: any;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn() };
    guard = new ScopeGuard(reflector);
  });

  const buildContext = (apiKeyScopes: any): ExecutionContext => {
    const request: any = { apiKeyScopes };
    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  // Configure the reflector mock to answer both IS_PUBLIC_KEY and
  // REQUIRE_SCOPES_KEY lookups deterministically.
  const setupReflector = (opts: {
    isPublic?: boolean;
    requiredScopes?: string[];
  }) => {
    reflector.getAllAndOverride.mockImplementation((key: string) => {
      if (key === IS_PUBLIC_KEY) return opts.isPublic ?? false;
      if (key === REQUIRE_SCOPES_KEY) return opts.requiredScopes;
      return undefined;
    });
  };

  it('allows access when @Public() is set, regardless of scopes', () => {
    setupReflector({ isPublic: true, requiredScopes: ['page:read'] });
    const ctx = buildContext(['unrelated:scope']);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when apiKeyScopes is null (full-access API key)', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext(null);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when apiKeyScopes is undefined (JWT user)', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext(undefined);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when apiKeyScopes contains a required scope', () => {
    setupReflector({
      isPublic: false,
      requiredScopes: ['page:read', 'space:read'],
    });
    const ctx = buildContext(['page:read']);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('allows access when apiKeyScopes matches any one of the required scopes', () => {
    setupReflector({
      isPublic: false,
      requiredScopes: ['page:read', 'space:read'],
    });
    const ctx = buildContext(['space:read']);

    expect(guard.canActivate(ctx)).toBe(true);
  });

  it('throws ForbiddenException when apiKeyScopes does not contain any required scope', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext(['space:read']);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException when apiKeyScopes is an empty array and a scope is required', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext([]);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for a scoped API key on an endpoint with no @RequireScopes', () => {
    setupReflector({ isPublic: false, requiredScopes: undefined });
    const ctx = buildContext(['page:read']);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('throws ForbiddenException for a scoped API key on an endpoint with an empty @RequireScopes list', () => {
    setupReflector({ isPublic: false, requiredScopes: [] });
    const ctx = buildContext(['page:read']);

    expect(() => guard.canActivate(ctx)).toThrow(ForbiddenException);
  });

  it('uses ForbiddenException with the expected message on scope mismatch', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext(['space:read']);

    let caught: any;
    try {
      guard.canActivate(ctx);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(ForbiddenException);
    expect(caught.message).toBe('Insufficient API key scopes');
  });

  it('does not consult the reflector for required scopes when apiKeyScopes is null', () => {
    setupReflector({ isPublic: false, requiredScopes: ['page:read'] });
    const ctx = buildContext(null);

    guard.canActivate(ctx);

    // IS_PUBLIC_KEY is always consulted first; REQUIRE_SCOPES_KEY should not be
    // because the null-scope short-circuit returns early.
    const calls = reflector.getAllAndOverride.mock.calls;
    const requiredScopesCalls = calls.filter(
      ([key]: [string]) => key === REQUIRE_SCOPES_KEY,
    );
    expect(requiredScopesCalls).toHaveLength(0);
  });
});
