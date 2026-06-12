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
import { TemplateService } from './template.service';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('templates')
export class TemplateController {
  constructor(
    private templateService: TemplateService,
    private workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('list')
  async getTemplates(
    @Body() pagination: PaginationOptions,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.getTemplates(workspace.id, pagination);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getTemplateById(
    @Body() body: { templateId: string },
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.templateService.getTemplateById(body.templateId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post()
  async createTemplate(
    @Body() dto: CreateTemplateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.templateService.createTemplate(dto, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateTemplate(
    @Body() body: { templateId: string } & UpdateTemplateDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    const { templateId, ...dto } = body;
    return this.templateService.updateTemplate(dto, templateId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteTemplate(
    @Body() body: { templateId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.templateService.deleteTemplate(body.templateId, workspace.id);
  }
}
