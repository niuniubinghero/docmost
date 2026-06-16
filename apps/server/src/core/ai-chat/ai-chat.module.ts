import { Module } from '@nestjs/common';
import { AiChatController } from './ai-chat.controller';
import { AiChatService } from './ai-chat.service';
import { AiChatRepo } from '@docmost/db/repos/ai-chat/ai-chat.repo';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { AiService } from '../ai/ai.service';
import { AiToolExecutor } from '../ai/ai-tool-executor';
import { PageService } from '../page/services/page.service';
import { DatabaseModule } from '@docmost/db/database.module';
import { CollaborationModule } from '../../collaboration/collaboration.module';
import { WatcherModule } from '../watcher/watcher.module';
import { TransclusionModule } from '../page/transclusion/transclusion.module';
import { StorageModule } from '../../integrations/storage/storage.module';
import { EnvironmentModule } from '../../integrations/environment/environment.module';
import { LabelModule } from '../label/label.module';

@Module({
  imports: [
    DatabaseModule,
    CollaborationModule,
    WatcherModule,
    TransclusionModule,
    StorageModule.forRootAsync({
      imports: [EnvironmentModule],
    }),
    LabelModule,
  ],
  controllers: [AiChatController],
  providers: [
    AiChatService,
    AiChatRepo,
    AiProviderRepo,
    PageRepo,
    SpaceRepo,
    AiService,
    AiToolExecutor,
    PageService,
  ],
  exports: [AiChatService],
})
export class AiChatModule {}
