import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { EnvironmentModule } from '../../integrations/environment/environment.module';

@Module({
  imports: [EnvironmentModule],
  controllers: [AiController],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
