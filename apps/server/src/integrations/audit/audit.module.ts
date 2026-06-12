import { Global, Module } from '@nestjs/common';
import { AUDIT_SERVICE } from './audit.service';
import { DbAuditService } from './db-audit.service';
import { AuditLogRepo } from '@docmost/db/repos/audit-log/audit-log.repo';
import { DatabaseModule } from '@docmost/db/database.module';

@Global()
@Module({
  imports: [DatabaseModule],
  providers: [
    AuditLogRepo,
    {
      provide: AUDIT_SERVICE,
      useClass: DbAuditService,
    },
  ],
  exports: [AUDIT_SERVICE],
})
export class NoopAuditModule {}
