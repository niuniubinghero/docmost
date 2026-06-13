import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiChatRepo } from '@docmost/db/repos/ai-chat/ai-chat.repo';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { AiService } from '../ai/ai.service';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [AiChatController],
  providers: [AiChatService, AiChatRepo, AiProviderRepo, PageRepo, AiService],
  exports: [AiChatService],
})
export class AiChatModule {}
