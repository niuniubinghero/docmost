import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { randomBytes, createHash } from 'node:crypto';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import {
  CursorPaginationResult,
  executeWithCursorPagination,
} from '@docmost/db/pagination/cursor-pagination';
import { jsonObjectFrom } from 'kysely/helpers/postgres';

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
  scopes: string[] | null;
}

export interface ApiKeyWithCreator extends ApiKey {
  creator: {
    id: string;
    name: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface InsertableApiKey {
  name?: string;
  creatorId: string;
  workspaceId: string;
  expiresAt?: Date;
  scopes?: string[] | null;
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
    'apiKeys.scopes',
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

  async findByWorkspace(
    workspaceId: string,
    pagination: PaginationOptions,
  ): Promise<CursorPaginationResult<ApiKeyWithCreator>> {
    const query = this.db
      .selectFrom('apiKeys')
      .selectAll('apiKeys')
      .select((eb) =>
        jsonObjectFrom(
          eb
            .selectFrom('users')
            .select(['users.id', 'users.name', 'users.avatarUrl'])
            .whereRef('users.id', '=', 'apiKeys.creatorId'),
        ).as('creator'),
      )
      .where('apiKeys.workspaceId', '=', workspaceId)
      .where('apiKeys.deletedAt', 'is', null);

    return executeWithCursorPagination(query, {
      perPage: pagination.limit,
      cursor: pagination.cursor,
      beforeCursor: pagination.beforeCursor,
      fields: [{ expression: 'apiKeys.id', direction: 'desc' }],
      parseCursor: (cursor) => ({ id: cursor.id }),
    });
  }

  async findByHash(keyHash: string): Promise<ApiKey> {
    return this.db
      .selectFrom('apiKeys')
      .select(this.baseFields)
      .where('keyHash', '=', keyHash)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async create(
    insertable: InsertableApiKey,
    trx?: KyselyTransaction,
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const db = dbOrTx(this.db, trx);
    const rawKey = 'dk_' + randomBytes(32).toString('hex');
    const keyHash = createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await db
      .insertInto('apiKeys')
      .values({
        ...insertable,
        name: insertable.name || null,
        keyHash,
      })
      .returning(this.baseFields)
      .executeTakeFirst();

    return { apiKey, rawKey };
  }

  async update(
    keyId: string,
    workspaceId: string,
    data: { name?: string; scopes?: string[] | null },
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('apiKeys')
      .set({ ...data, updatedAt: new Date() })
      .where('id', '=', keyId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();
  }

  async revoke(
    keyId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('apiKeys')
      .set({ expiresAt: new Date(), updatedAt: new Date() })
      .where('id', '=', keyId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();
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
