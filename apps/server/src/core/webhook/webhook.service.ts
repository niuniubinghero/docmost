import { Injectable, NotFoundException } from '@nestjs/common';
import { randomBytes } from 'crypto';
import { WebhookRepo } from '@docmost/db/repos/webhook/webhook.repo';
import { CreateWebhookDto, UpdateWebhookDto } from './dto/webhook.dto';

@Injectable()
export class WebhookService {
  constructor(private webhookRepo: WebhookRepo) {}

  async list(workspaceId: string) {
    return this.webhookRepo.findByWorkspace(workspaceId);
  }

  async create(workspaceId: string, dto: CreateWebhookDto) {
    const secret = randomBytes(32).toString('hex');

    return this.webhookRepo.create({
      workspaceId,
      url: dto.url,
      events: dto.events,
      secret,
      enabled: dto.enabled ?? true,
    });
  }

  async update(id: string, workspaceId: string, dto: UpdateWebhookDto) {
    const webhook = await this.webhookRepo.findById(id);
    if (!webhook || webhook.workspaceId !== workspaceId) {
      throw new NotFoundException('Webhook not found');
    }

    const { id: _id, ...data } = dto;
    return this.webhookRepo.update(id, data);
  }

  async delete(id: string, workspaceId: string) {
    const webhook = await this.webhookRepo.findById(id);
    if (!webhook || webhook.workspaceId !== workspaceId) {
      throw new NotFoundException('Webhook not found');
    }

    await this.webhookRepo.delete(id);
  }
}
