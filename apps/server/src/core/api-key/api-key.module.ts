import { Module } from '@nestjs/common';
import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';
import { ApiKeyRepo } from '@docmost/db/repos/api-key/api-key.repo';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [ApiKeyController],
  providers: [ApiKeyService, ApiKeyRepo],
  exports: [ApiKeyService],
})
export class ApiKeyModule {}
