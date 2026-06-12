import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { randomBytes } from 'node:crypto';

export interface ApiKey {
  id: string;
  name: string | null;
  creatorId: string;
  workspaceId: string;
  expiresAt: Date | null;
  lastUsedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface InsertableApiKey {
  name?: string;
  creatorId: string;
  workspaceId: string;
  expiresAt?: Date;
}

@Injectable()
export class ApiKeyRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields = [
    'apiKeys.id',
    'apiKeys.name',
    'apiKeys.creatorId',
    'apiKeys.workspaceId',
    'apiKeys.expiresAt',
    'apiKeys.lastUsedAt',
    'apiKeys.createdAt',
    'apiKeys.updatedAt',
  ] as const;

  async findById(
    keyId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<ApiKey> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('apiKeys')
      .select(this.baseFields)
      .where('id', '=', keyId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async findByWorkspace(workspaceId: string): Promise<ApiKey[]> {
    return this.db
      .selectFrom('apiKeys')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async create(
    insertable: InsertableApiKey,
    trx?: KyselyTransaction,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const db = dbOrTx(this.db, trx);
    const rawKey = randomBytes(32).toString('hex');

    const apiKey = await db
      .insertInto('apiKeys')
      .values({
        ...insertable,
        name: insertable.name || null,
      })
      .returning(this.baseFields)
      .executeTakeFirst();

    return { apiKey, rawKey };
  }

  async delete(
    keyId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('apiKeys')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', keyId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async updateLastUsed(
    keyId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('apiKeys')
      .set({ lastUsedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', keyId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }
}
