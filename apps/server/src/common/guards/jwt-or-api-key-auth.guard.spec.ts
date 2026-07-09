import { ExecutionContext } from '@nestjs/common';
import { JwtOrApiKeyAuthGuard } from './jwt-or-api-key-auth.guard';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

describe('JwtOrApiKeyAuthGuard', () => {
  let guard: JwtOrApiKeyAuthGuard;
  let reflector: any;
  let environmentService: any;
  let apiKeyRepo: any;
  let auditService: any;
  let apiKeyGuardCanActivateSpy: jest.SpyInstance;
  let parentCanActivateSpy: jest.SpyInstance;

  beforeEach(() => {
    reflector = { getAllAndOverride: jest.fn().mockReturnValue(false) };
    environmentService = {
      isCloud: jest.fn().mockReturnValue(false),
      isHttps: jest.fn().mockReturnValue(false),
      getSubdomainHost: jest.fn().mockReturnValue('example.com'),
    };
    apiKeyRepo = {};
    auditService = { logWithContext: jest.fn() };

    guard = new JwtOrApiKeyAuthGuard(
      reflector,
      environmentService,
      apiKeyRepo,
      auditService,
    );

    // The guard internally instantiates an ApiKeyAuthGuard. Spy on that
    // instance's canActivate so we can assert whether the API-key branch ran
    // without hitting the database.
    apiKeyGuardCanActivateSpy = jest
      .spyOn((guard as any).apiKeyGuard, 'canActivate')
      .mockResolvedValue(true);

    // Mock the parent AuthGuard.canActivate so the JWT branch does not trigger
    // the real passport-jwt strategy. super.canActivate() resolves to the
    // parent prototype's method, which this spy replaces.
    parentCanActivateSpy = jest
      .spyOn(
        Object.getPrototypeOf(JwtOrApiKeyAuthGuard.prototype),
        'canActivate',
      )
      .mockResolvedValue(true);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const buildContext = (opts: {
    authorization?: string;
    apiKeyParam?: string;
  } = {}): ExecutionContext => {
    const request: any = {
      headers: {},
      query: {},
      cookies: {},
    };
    if (opts.authorization !== undefined) {
      request.headers.authorization = opts.authorization;
    }
    if (opts.apiKeyParam !== undefined) {
      request.query.api_key = opts.apiKeyParam;
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setCookie: jest.fn() }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
  };

  it('skips auth entirely when @Public() is set', async () => {
    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);
    const ctx = buildContext({ authorization: 'Bearer dk_sometoken' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(apiKeyGuardCanActivateSpy).not.toHaveBeenCalled();
    expect(parentCanActivateSpy).not.toHaveBeenCalled();
  });

  it('routes to ApiKeyAuthGuard when Authorization header starts with "Bearer dk_"', async () => {
    const ctx = buildContext({ authorization: 'Bearer dk_abcdef123456' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(apiKeyGuardCanActivateSpy).toHaveBeenCalledTimes(1);
    expect(apiKeyGuardCanActivateSpy).toHaveBeenCalledWith(ctx);
    expect(parentCanActivateSpy).not.toHaveBeenCalled();
  });

  it('routes to ApiKeyAuthGuard when ?api_key=dk_ query param is present', async () => {
    const ctx = buildContext({ apiKeyParam: 'dk_queryparam123' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(apiKeyGuardCanActivateSpy).toHaveBeenCalledTimes(1);
    expect(apiKeyGuardCanActivateSpy).toHaveBeenCalledWith(ctx);
    expect(parentCanActivateSpy).not.toHaveBeenCalled();
  });

  it('falls through to the JWT (passport) flow when the Bearer token has no dk_ prefix', async () => {
    const ctx = buildContext({
      authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.payload.signature',
    });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(apiKeyGuardCanActivateSpy).not.toHaveBeenCalled();
    expect(parentCanActivateSpy).toHaveBeenCalledTimes(1);
    expect(parentCanActivateSpy).toHaveBeenCalledWith(ctx);
  });

  it('falls through to the JWT flow when no Authorization header or api_key param is present', async () => {
    const ctx = buildContext({});

    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(apiKeyGuardCanActivateSpy).not.toHaveBeenCalled();
    expect(parentCanActivateSpy).toHaveBeenCalledTimes(1);
  });

  it('does not treat a non-dk_ Bearer token as an API key request', async () => {
    const ctx = buildContext({ authorization: 'Bearer someothertoken' });

    await guard.canActivate(ctx);

    expect(apiKeyGuardCanActivateSpy).not.toHaveBeenCalled();
    expect(parentCanActivateSpy).toHaveBeenCalledTimes(1);
  });

  it('propagates the API key branch result to the caller', async () => {
    apiKeyGuardCanActivateSpy.mockResolvedValue(false);
    const ctx = buildContext({ authorization: 'Bearer dk_something' });

    const result = await guard.canActivate(ctx);

    expect(result).toBe(false);
    expect(parentCanActivateSpy).not.toHaveBeenCalled();
  });

  it('propagates ApiKeyAuthGuard rejections (UnauthorizedException) to the caller', async () => {
    const error = new Error('Unauthorized');
    apiKeyGuardCanActivateSpy.mockRejectedValue(error);
    const ctx = buildContext({ authorization: 'Bearer dk_invalid' });

    await expect(guard.canActivate(ctx)).rejects.toThrow('Unauthorized');
    expect(parentCanActivateSpy).not.toHaveBeenCalled();
  });

  it('checks IS_PUBLIC_KEY via the reflector using handler and class', async () => {
    const handler = function publicHandler() {};
    const klass = class PublicController {};
    const request: any = { headers: {}, query: {}, cookies: {} };
    const ctx = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setCookie: jest.fn() }),
      }),
      getHandler: () => handler,
      getClass: () => klass,
    } as any;

    reflector.getAllAndOverride = jest.fn().mockReturnValue(true);

    await guard.canActivate(ctx);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(
      IS_PUBLIC_KEY,
      [handler, klass],
    );
  });
});
