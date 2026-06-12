import { Injectable, NotFoundException } from '@nestjs/common';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { CreateTemplateDto, UpdateTemplateDto } from './dto/template.dto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { IAuditService, AUDIT_SERVICE } from '../../integrations/audit/audit.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class TemplateService {
  constructor(
    private templateRepo: TemplateRepo,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getTemplates(workspaceId: string, pagination: PaginationOptions) {
    return this.templateRepo.findByWorkspace(workspaceId, pagination);
  }

  async getTemplateById(templateId: string, workspaceId: string) {
    const template = await this.templateRepo.findById(templateId, workspaceId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }
    return template;
  }

  async createTemplate(
    dto: CreateTemplateDto,
    workspaceId: string,
    userId: string,
  ) {
    const template = await this.templateRepo.create({
      title: dto.title,
      description: dto.description,
      content: dto.content,
      icon: dto.icon,
      spaceId: dto.spaceId,
      creatorId: userId,
      workspaceId,
    });

    this.auditService.log({
      event: AuditEvent.TEMPLATE_CREATE,
      resourceType: AuditResource.TEMPLATE,
      resourceId: template.id,
    });

    return template;
  }

  async updateTemplate(
    dto: UpdateTemplateDto,
    templateId: string,
    workspaceId: string,
  ) {
    const template = await this.templateRepo.findById(templateId, workspaceId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.templateRepo.update(dto, templateId, workspaceId);

    return this.templateRepo.findById(templateId, workspaceId);
  }

  async deleteTemplate(templateId: string, workspaceId: string) {
    const template = await this.templateRepo.findById(templateId, workspaceId);
    if (!template) {
      throw new NotFoundException('Template not found');
    }

    await this.templateRepo.softDelete(templateId, workspaceId);

    this.auditService.log({
      event: AuditEvent.TEMPLATE_DELETE,
      resourceType: AuditResource.TEMPLATE,
      resourceId: templateId,
    });
  }
}
