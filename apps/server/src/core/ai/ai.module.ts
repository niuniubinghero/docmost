import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AiController],
  providers: [AiService, AiProviderRepo],
  exports: [AiService],
})
export class AiModule {}
