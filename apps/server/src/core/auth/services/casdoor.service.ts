import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { EnvironmentService } from '../../../integrations/environment/environment.service';
import { UserRepo } from '@docmost/db/repos/user/user.repo';
import { SessionService } from '../../session/session.service';
import { WorkspaceRepo } from '@docmost/db/repos/workspace/workspace.repo';
import { nanoid } from 'nanoid';

@Injectable()
export class CasdoorService {
  private readonly logger = new Logger(CasdoorService.name);

  constructor(
    private environmentService: EnvironmentService,
    private userRepo: UserRepo,
    private sessionService: SessionService,
    private workspaceRepo: WorkspaceRepo,
  ) {}

  private getCasdoorConfig() {
    return {
      endpoint: this.environmentService.getCasdoorEndpoint(),
      clientId: this.environmentService.getCasdoorClientId(),
      clientSecret: this.environmentService.getCasdoorClientSecret(),
      organization: this.environmentService.getCasdoorOrganization(),
      application: this.environmentService.getCasdoorApplication(),
    };
  }

  getLoginUrl(state: string): string {
    const config = this.getCasdoorConfig();
    const callbackUrl = `${this.environmentService.getAppUrl()}/auth/casdoor/callback`;

    const params = new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: callbackUrl,
      scope: 'openid profile email',
      state,
    });

    return `${config.endpoint}/login/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(code: string): Promise<any> {
    const config = this.getCasdoorConfig();
    const callbackUrl = `${this.environmentService.getAppUrl()}/auth/casdoor/callback`;

    const response = await fetch(`${config.endpoint}/api/login/oauth/access_token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        grant_type: 'authorization_code',
        client_id: config.clientId,
        client_secret: config.clientSecret,
        code,
        redirect_uri: callbackUrl,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to exchange code for token: ${response.statusText}`);
    }

    return response.json();
  }

  async getUserInfo(accessToken: string): Promise<any> {
    const config = this.getCasdoorConfig();

    const response = await fetch(`${config.endpoint}/api/userinfo`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json();
  }

  async handleCallback(code: string, workspaceId: string): Promise<string> {
    const workspace = await this.workspaceRepo.findById(workspaceId);
    if (!workspace) {
      throw new BadRequestException('Invalid workspace');
    }

    const tokenData = await this.exchangeCodeForToken(code);
    const userInfo = await this.getUserInfo(tokenData.access_token);

    if (!userInfo.email) {
      this.logger.warn('Casdoor OIDC did not return email for user');
      throw new BadRequestException(
        'Email is required from Casdoor but was not provided. Please ensure your Casdoor application has the email scope enabled.',
      );
    }

    let user = await this.userRepo.findByEmail(userInfo.email, workspaceId);

    if (!user) {
      user = await this.userRepo.insertUser({
        name: userInfo.name || userInfo.preferred_username || userInfo.email.split('@')[0],
        email: userInfo.email,
        password: nanoid(32),
        role: 'MEMBER',
        workspaceId,
      });
    }

    return this.sessionService.createSessionAndToken(user);
  }
}
