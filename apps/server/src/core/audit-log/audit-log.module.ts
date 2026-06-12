import { Module } from '@nestjs/common';
import { AuditLogController } from './audit-log.controller';
import { AuditLogService } from './audit-log.service';
import { AuditLogRepo } from '@docmost/db/repos/audit-log/audit-log.repo';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AuditLogController],
  providers: [AuditLogService, AuditLogRepo],
  exports: [AuditLogService],
})
export class AuditLogModule {}
