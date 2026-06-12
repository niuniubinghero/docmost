import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { CreatePageVerificationDto, UpdatePageVerificationDto } from './dto/page-verification.dto';
import { AuditEvent, AuditResource } from '../../common/events/audit-events';
import { IAuditService, AUDIT_SERVICE } from '../../integrations/audit/audit.service';
import { Inject } from '@nestjs/common';

@Injectable()
export class PageVerificationService {
  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    @Inject(AUDIT_SERVICE) private readonly auditService: IAuditService,
  ) {}

  async getVerificationsByPage(pageId: string) {
    return this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('pageId', '=', pageId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async getVerificationById(verificationId: string) {
    const verification = await this.db
      .selectFrom('pageVerifications')
      .selectAll()
      .where('id', '=', verificationId)
      .executeTakeFirst();

    if (!verification) {
      throw new NotFoundException('Page verification not found');
    }

    return verification;
  }

  async createVerification(
    dto: CreatePageVerificationDto,
    workspaceId: string,
    userId: string,
  ) {
    const verification = await this.db
      .insertInto('pageVerifications')
      .values({
        pageId: dto.pageId,
        workspaceId,
        creatorId: userId,
        type: dto.type || 'expiring',
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : null,
      })
      .returningAll()
      .executeTakeFirst();

    this.auditService.log({
      event: AuditEvent.PAGE_VERIFICATION_CREATED,
      resourceType: AuditResource.PAGE,
      resourceId: dto.pageId,
    });

    return verification;
  }

  async updateVerification(
    dto: UpdatePageVerificationDto,
    verificationId: string,
    workspaceId: string,
  ) {
    const verification = await this.getVerificationById(verificationId);

    await this.db
      .updateTable('pageVerifications')
      .set({
        status: dto.status || verification.status,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : verification.expiresAt,
        updatedAt: new Date(),
      })
      .where('id', '=', verificationId)
      .execute();

    this.auditService.log({
      event: AuditEvent.PAGE_VERIFICATION_UPDATED,
      resourceType: AuditResource.PAGE,
      resourceId: verification.pageId,
    });

    return this.getVerificationById(verificationId);
  }

  async approveVerification(verificationId: string, workspaceId: string, userId: string) {
    return this.updateVerification(
      { status: 'approved' },
      verificationId,
      workspaceId,
    );
  }

  async rejectVerification(verificationId: string, workspaceId: string, userId: string) {
    return this.updateVerification(
      { status: 'rejected' },
      verificationId,
      workspaceId,
    );
  }

  async deleteVerification(verificationId: string, workspaceId: string) {
    const verification = await this.getVerificationById(verificationId);

    await this.db
      .deleteFrom('pageVerifications')
      .where('id', '=', verificationId)
      .execute();

    this.auditService.log({
      event: AuditEvent.PAGE_VERIFICATION_REMOVED,
      resourceType: AuditResource.PAGE,
      resourceId: verification.pageId,
    });
  }
}
