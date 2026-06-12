import { Module } from '@nestjs/common';
import { PageVerificationController } from './page-verification.controller';
import { PageVerificationService } from './page-verification.service';
import { DatabaseModule } from '@docmost/db/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [PageVerificationController],
  providers: [PageVerificationService],
  exports: [PageVerificationService],
})
export class PageVerificationModule {}
