import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { sql } from 'kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';

export interface Webhook {
  id: string;
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertableWebhook {
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  enabled?: boolean;
}

export interface WebhookDelivery {
  id: string;
  webhookId: string;
  event: string;
  payload: unknown;
  statusCode: number | null;
  responseBody: string | null;
  attempt: number;
  status: 'success' | 'failed' | 'pending';
  createdAt: Date;
}

export interface InsertableWebhookDelivery {
  webhookId: string;
  event: string;
  payload?: unknown;
  statusCode?: number | null;
  responseBody?: string | null;
  attempt?: number;
  status: 'success' | 'failed' | 'pending';
}

@Injectable()
export class WebhookRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private webhookFields = [
    'webhooks.id',
    'webhooks.workspaceId',
    'webhooks.url',
    'webhooks.secret',
    'webhooks.events',
    'webhooks.enabled',
    'webhooks.createdAt',
    'webhooks.updatedAt',
  ] as const;

  private deliveryFields = [
    'webhookDeliveries.id',
    'webhookDeliveries.webhookId',
    'webhookDeliveries.event',
    'webhookDeliveries.payload',
    'webhookDeliveries.statusCode',
    'webhookDeliveries.responseBody',
    'webhookDeliveries.attempt',
    'webhookDeliveries.status',
    'webhookDeliveries.createdAt',
  ] as const;

  async findById(id: string): Promise<Webhook | null> {
    return (
      (await this.db
        .selectFrom('webhooks')
        .select(this.webhookFields)
        .where('id', '=', id)
        .executeTakeFirst()) ?? null
    );
  }

  async findByWorkspace(workspaceId: string): Promise<Webhook[]> {
    return this.db
      .selectFrom('webhooks')
      .select(this.webhookFields)
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async findEnabledByEvent(
    workspaceId: string,
    event: string,
  ): Promise<Webhook[]> {
    return this.db
      .selectFrom('webhooks')
      .select(this.webhookFields)
      .where('workspaceId', '=', workspaceId)
      .where('enabled', '=', true)
      .where((eb) =>
        sql`${eb.ref('webhooks.events')} @> ${JSON.stringify([event])}::jsonb`,
      )
      .execute();
  }

  async create(data: InsertableWebhook): Promise<Webhook> {
    const webhook = await this.db
      .insertInto('webhooks')
      .values({
        workspaceId: data.workspaceId,
        url: data.url,
        secret: data.secret,
        events: data.events,
        enabled: data.enabled ?? true,
      })
      .returning(this.webhookFields)
      .executeTakeFirst();
    return webhook as Webhook;
  }

  async update(
    id: string,
    data: Partial<InsertableWebhook>,
  ): Promise<Webhook> {
    const webhook = await this.db
      .updateTable('webhooks')
      .set({ ...data, updatedAt: new Date() })
      .where('id', '=', id)
      .returning(this.webhookFields)
      .executeTakeFirst();
    return webhook as Webhook;
  }

  async delete(id: string): Promise<void> {
    await this.db.deleteFrom('webhooks').where('id', '=', id).execute();
  }

  async createDelivery(
    data: InsertableWebhookDelivery,
  ): Promise<WebhookDelivery> {
    const delivery = await this.db
      .insertInto('webhookDeliveries')
      .values({
        webhookId: data.webhookId,
        event: data.event,
        payload: data.payload as any,
        statusCode: data.statusCode ?? null,
        responseBody: data.responseBody ?? null,
        attempt: data.attempt ?? 1,
        status: data.status,
      })
      .returning(this.deliveryFields)
      .executeTakeFirst();
    return delivery as WebhookDelivery;
  }

  async updateDelivery(
    id: string,
    data: Partial<WebhookDelivery>,
  ): Promise<WebhookDelivery> {
    const delivery = await this.db
      .updateTable('webhookDeliveries')
      .set(data as any)
      .where('id', '=', id)
      .returning(this.deliveryFields)
      .executeTakeFirst();
    return delivery as WebhookDelivery;
  }
}
