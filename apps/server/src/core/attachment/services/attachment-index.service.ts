import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { StorageService } from '../../../integrations/storage/storage.service';

@Injectable()
export class AttachmentIndexService {
  private readonly logger = new Logger(AttachmentIndexService.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private readonly storageService: StorageService,
  ) {}

  async indexAttachment(attachmentId: string): Promise<void> {
    try {
      const attachment = await this.db
        .selectFrom('attachments')
        .selectAll()
        .where('id', '=', attachmentId)
        .executeTakeFirst();

      if (!attachment) {
        this.logger.warn(`Attachment not found: ${attachmentId}`);
        return;
      }

      const fileBuffer = await this.storageService.read(attachment.filePath);
      if (!fileBuffer) {
        this.logger.warn(`Failed to fetch attachment file: ${attachment.filePath}`);
        return;
      }

      let extractedText = '';

      if (attachment.mimeType === 'application/pdf') {
        extractedText = await this.extractTextFromPdf(fileBuffer);
      } else if (
        attachment.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        extractedText = await this.extractTextFromDocx(fileBuffer);
      } else {
        this.logger.debug(`Unsupported MIME type for indexing: ${attachment.mimeType}`);
        return;
      }

      if (extractedText) {
        await this.db
          .updateTable('attachments')
          .set({
            textContent: extractedText,
            updatedAt: new Date(),
          })
          .where('id', '=', attachmentId)
          .execute();

        this.logger.debug(`Indexed attachment ${attachmentId} (${extractedText.length} chars)`);
      }
    } catch (error) {
      this.logger.error(`Failed to index attachment ${attachmentId}`, error);
    }
  }

  async indexAttachments(workspaceId: string): Promise<void> {
    const attachments = await this.db
      .selectFrom('attachments')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('mimeType', 'in', [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ])
      .where('textContent', 'is', null)
      .limit(100)
      .execute();

    for (const attachment of attachments) {
      await this.indexAttachment(attachment.id);
    }
  }

  private async extractTextFromPdf(buffer: Buffer): Promise<string> {
    try {
      // Simple PDF text extraction - in production, use a proper PDF parser
      // For now, return empty string as placeholder
      this.logger.debug('PDF text extraction not implemented yet');
      return '';
    } catch (error) {
      this.logger.error('Failed to extract text from PDF', error);
      return '';
    }
  }

  private async extractTextFromDocx(buffer: Buffer): Promise<string> {
    try {
      // Simple DOCX text extraction - in production, use a proper DOCX parser
      // For now, return empty string as placeholder
      this.logger.debug('DOCX text extraction not implemented yet');
      return '';
    } catch (error) {
      this.logger.error('Failed to extract text from DOCX', error);
      return '';
    }
  }
}
