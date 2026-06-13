import { Module } from '@nestjs/common';
import { TemplateController } from './template.controller';
import { TemplateService } from './template.service';
import { TemplateRepo } from '@docmost/db/repos/template/template.repo';
import { DatabaseModule } from '@docmost/db/database.module';
import { PageModule } from '../page/page.module';

@Module({
  imports: [DatabaseModule, PageModule],
  controllers: [TemplateController],
  providers: [TemplateService, TemplateRepo],
  exports: [TemplateService],
})
export class TemplateModule {}
