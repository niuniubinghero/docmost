import { Injectable } from '@nestjs/common';
import { AuditLogRepo } from '@docmost/db/repos/audit-log/audit-log.repo';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

@Injectable()
export class AuditLogService {
  constructor(
    private auditLogRepo: AuditLogRepo,
    @InjectKysely() private readonly db: KyselyDB,
  ) {}

  async getAuditLogs(workspaceId: string, pagination: PaginationOptions) {
    return this.auditLogRepo.findByWorkspace(workspaceId, pagination);
  }

  async getRetention(workspaceId: string) {
    const workspace = await this.db
      .selectFrom('workspaces')
      .select(['auditRetentionDays'])
      .where('id', '=', workspaceId)
      .executeTakeFirst();

    return { retentionDays: workspace?.auditRetentionDays ?? 90 };
  }

  async updateRetention(workspaceId: string, days: number) {
    await this.db
      .updateTable('workspaces')
      .set({ auditRetentionDays: days })
      .where('id', '=', workspaceId)
      .execute();

    return { retentionDays: days };
  }
}
