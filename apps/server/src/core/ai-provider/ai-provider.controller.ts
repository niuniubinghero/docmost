import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AiProviderService } from './ai-provider.service';
import { CreateAiProviderDto, UpdateAiProviderDto, FetchModelsDto } from './dto/ai-provider.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('ai-providers')
export class AiProviderController {
  constructor(
    private aiProviderService: AiProviderService,
    private workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  private checkAdmin(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post()
  async getProviders(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.getProviders(workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createProvider(
    @Body() dto: CreateAiProviderDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.createProvider(dto, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateProvider(
    @Body() body: { providerId: string } & UpdateAiProviderDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    const { providerId, ...dto } = body;
    return this.aiProviderService.updateProvider(providerId, workspace.id, dto);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteProvider(
    @Body() body: { providerId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.deleteProvider(body.providerId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('set-default')
  async setDefault(
    @Body() body: { providerId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.setDefault(body.providerId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('test')
  async testConnection(
    @Body() body: { providerId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.testConnection(body.providerId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('models')
  async fetchModels(
    @Body() dto: FetchModelsDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.checkAdmin(user, workspace);
    return this.aiProviderService.fetchModels(dto.type, dto.apiKey, dto.baseUrl);
  }
}
