import { Injectable } from '@nestjs/common';
import { AuditLogRepo } from '@docmost/db/repos/audit-log/audit-log.repo';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';

@Injectable()
export class AuditLogService {
  constructor(private auditLogRepo: AuditLogRepo) {}

  async getAuditLogs(workspaceId: string, pagination: PaginationOptions) {
    return this.auditLogRepo.findByWorkspace(workspaceId, pagination);
  }
}
