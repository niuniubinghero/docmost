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
import { PageVerificationService } from './page-verification.service';
import { CreatePageVerificationDto, UpdatePageVerificationDto } from './dto/page-verification.dto';
import WorkspaceAbilityFactory from '../casl/abilities/workspace-ability.factory';
import {
  WorkspaceCaslAction,
  WorkspaceCaslSubject,
} from '../casl/interfaces/workspace-ability.type';

@UseGuards(JwtAuthGuard)
@Controller('page-verifications')
export class PageVerificationController {
  constructor(
    private pageVerificationService: PageVerificationService,
    private workspaceAbility: WorkspaceAbilityFactory,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post('list')
  async getVerificationsByPage(
    @Body() body: { pageId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pageVerificationService.getVerificationsByPage(body.pageId);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getVerificationById(
    @Body() body: { verificationId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.pageVerificationService.getVerificationById(body.verificationId);
  }

  @HttpCode(HttpStatus.OK)
  @Post()
  async createVerification(
    @Body() dto: CreatePageVerificationDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.pageVerificationService.createVerification(dto, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateVerification(
    @Body() body: { verificationId: string } & UpdatePageVerificationDto,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    const { verificationId, ...dto } = body;
    return this.pageVerificationService.updateVerification(dto, verificationId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('approve')
  async approveVerification(
    @Body() body: { verificationId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.pageVerificationService.approveVerification(body.verificationId, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('reject')
  async rejectVerification(
    @Body() body: { verificationId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.pageVerificationService.rejectVerification(body.verificationId, workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteVerification(
    @Body() body: { verificationId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const ability = this.workspaceAbility.createForUser(user, workspace);
    if (
      ability.cannot(WorkspaceCaslAction.Manage, WorkspaceCaslSubject.Settings)
    ) {
      throw new ForbiddenException();
    }

    return this.pageVerificationService.deleteVerification(body.verificationId, workspace.id);
  }
}
