import {
  Body,
  Controller,
  ForbiddenException,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { WebhookService } from './webhook.service';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('webhooks')
export class WebhookController {
  constructor(
    private webhookService: WebhookService,
    private workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @ApiOperation({ summary: '获取 Webhooks 列表' })
  @ApiResponse({ status: 200, description: '返回工作空间的 Webhooks 列表' })
  @HttpCode(HttpStatus.OK)
  @Post()
  async list(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    return this.webhookService.list(workspace.id);
  }

  @ApiOperation({ summary: '创建 Webhook' })
  @ApiResponse({ status: 200, description: 'Webhook 创建成功' })
  @HttpCode(HttpStatus.OK)
  @Post('create')
  async create(
    @Body() dto: CreateWebhookDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    return this.webhookService.create(workspace.id, dto);
  }

  @ApiOperation({ summary: '更新 Webhook' })
  @ApiResponse({ status: 200, description: 'Webhook 更新成功' })
  @HttpCode(HttpStatus.OK)
  @Post('update')
  async update(
    @Body() dto: UpdateWebhookDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    return this.webhookService.update(dto.id, workspace.id, dto);
  }

  @ApiOperation({ summary: '删除 Webhook' })
  @ApiResponse({ status: 200, description: 'Webhook 删除成功' })
  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async delete(
    @Body() body: { id: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    this.assertCanManage(user, workspace);
    return this.webhookService.delete(body.id, workspace.id);
  }

  private assertCanManage(user: User, workspace: Workspace) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }
  }
}
