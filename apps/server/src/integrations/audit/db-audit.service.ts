import { Injectable } from '@nestjs/common';
import { AuditLogPayload, ActorType } from '../../common/events/audit-events';
import { AuditLogRepo } from '@docmost/db/repos/audit-log/audit-log.repo';
import { ClsService } from 'nestjs-cls';
import {
  AuditContext,
  AUDIT_CONTEXT_KEY,
} from '../../common/middlewares/audit-context.middleware';
import { IAuditService } from './audit.service';

@Injectable()
export class DbAuditService implements IAuditService {
  constructor(
    private auditLogRepo: AuditLogRepo,
    private cls: ClsService,
  ) {}

  async log(payload: AuditLogPayload): Promise<void> {
    const context = this.cls.get<AuditContext>(AUDIT_CONTEXT_KEY);

    await this.auditLogRepo.create({
      event: payload.event,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      actorId: context?.actorId || null,
      actorType: context?.actorType || 'user',
      workspaceId: context?.workspaceId || '',
      spaceId: payload.spaceId || null,
      changes: payload.changes || null,
      metadata: payload.metadata || null,
      ipAddress: context?.ipAddress || null,
    });
  }

  async logWithContext(
    payload: AuditLogPayload,
    context: {
      workspaceId: string;
      actorId?: string;
      actorType?: ActorType;
      ipAddress?: string;
    },
  ): Promise<void> {
    await this.auditLogRepo.create({
      event: payload.event,
      resourceType: payload.resourceType,
      resourceId: payload.resourceId,
      actorId: context.actorId || null,
      actorType: context.actorType || 'user',
      workspaceId: context.workspaceId,
      spaceId: payload.spaceId,
      changes: payload.changes || null,
      metadata: payload.metadata || null,
      ipAddress: context.ipAddress,
    });
  }

  async logBatchWithContext(
    payloads: AuditLogPayload[],
    context: {
      workspaceId: string;
      actorId?: string;
      actorType?: ActorType;
      ipAddress?: string;
    },
  ): Promise<void> {
    for (const payload of payloads) {
      await this.logWithContext(payload, context);
    }
  }

  setActorId(_actorId: string): void {
    // No-op: actorId is now obtained from CLS context
  }

  setActorType(_actorType: ActorType): void {
    // No-op: actorType is now obtained from CLS context
  }

  async updateRetention(
    _workspaceId: string,
    _retentionDays: number,
  ): Promise<void> {
    // Implementation for retention cleanup
  }
}
