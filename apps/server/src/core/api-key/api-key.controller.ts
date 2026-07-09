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
import { ApiKeyService } from './api-key.service';
import { CreateApiKeyDto } from './dto/api-key.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@ApiTags('API Keys')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('api-keys')
export class ApiKeyController {
  constructor(
    private apiKeyService: ApiKeyService,
    private workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @ApiOperation({ summary: '获取 API Keys 列表' })
  @ApiResponse({ status: 200, description: '返回工作空间的 API Keys 列表' })
  @HttpCode(HttpStatus.OK)
  @Post()
  async getApiKeys(
    @Body() pagination: PaginationOptions,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.apiKeyService.getApiKeys(workspace.id, pagination);
  }

  @ApiOperation({ summary: '创建 API Key' })
  @ApiResponse({ status: 200, description: 'API Key 创建成功' })
  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createApiKey(
    @Body() dto: CreateApiKeyDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.API)
    ) {
      throw new ForbiddenException();
    }

    return this.apiKeyService.createApiKey(dto, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateApiKey(
    @Body() body: { apiKeyId: string; name?: string; scopes?: string[] },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.API)
    ) {
      throw new ForbiddenException();
    }

    return this.apiKeyService.updateApiKey(body.apiKeyId, workspace.id, body);
  }

  @HttpCode(HttpStatus.OK)
  @Post('revoke')
  async revokeApiKey(
    @Body() body: { apiKeyId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.apiKeyService.revokeApiKey(body.apiKeyId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteApiKey(
    @Body() body: { keyId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.apiKeyService.deleteApiKey(body.keyId, workspace.id);
  }
}
