import { Module } from '@nestjs/common';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { WebhookDispatcherService } from './webhook-dispatcher.service';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [WebhookController],
  providers: [WebhookService, WebhookDispatcherService],
  exports: [WebhookService, WebhookDispatcherService],
})
export class WebhookModule {}
