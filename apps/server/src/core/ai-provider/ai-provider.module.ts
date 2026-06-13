import { Module } from '@nestjs/common';
import { AiProviderController } from './ai-provider.controller';
import { AiProviderService } from './ai-provider.service';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { DatabaseModule } from '@docmost/db/database.module';
import { CaslModule } from '../casl/casl.module';

@Module({
  imports: [DatabaseModule, CaslModule],
  controllers: [AiProviderController],
  providers: [AiProviderService, AiProviderRepo],
  exports: [AiProviderService, AiProviderRepo],
})
export class AiProviderModule {}
