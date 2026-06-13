import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { JsonValue } from '@docmost/db/types/db.d';

export interface AiProvider {
  id: string;
  workspaceId: string;
  name: string;
  type: string;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  isDefault: boolean;
  isActive: boolean;
  config: JsonValue;
  createdAt: Date;
  updatedAt: Date;
}

export interface InsertableAiProvider {
  workspaceId: string;
  name: string;
  type: string;
  apiKey?: string;
  baseUrl?: string;
  modelName: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: JsonValue;
}

export interface UpdatableAiProvider {
  name?: string;
  type?: string;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: JsonValue;
}

@Injectable()
export class AiProviderRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private baseFields = [
    'aiProviders.id',
    'aiProviders.workspaceId',
    'aiProviders.name',
    'aiProviders.type',
    'aiProviders.apiKey',
    'aiProviders.baseUrl',
    'aiProviders.modelName',
    'aiProviders.isDefault',
    'aiProviders.isActive',
    'aiProviders.config',
    'aiProviders.createdAt',
    'aiProviders.updatedAt',
  ] as const;

  async findById(
    providerId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ): Promise<AiProvider> {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('aiProviders')
      .select(this.baseFields)
      .where('id', '=', providerId)
      .where('workspaceId', '=', workspaceId)
      .executeTakeFirst();
  }

  async findByWorkspace(workspaceId: string): Promise<AiProvider[]> {
    return this.db
      .selectFrom('aiProviders')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .orderBy('isDefault', 'desc')
      .orderBy('createdAt', 'desc')
      .execute();
  }

  async findDefault(workspaceId: string): Promise<AiProvider> {
    return this.db
      .selectFrom('aiProviders')
      .select(this.baseFields)
      .where('workspaceId', '=', workspaceId)
      .where('isDefault', '=', true)
      .where('isActive', '=', true)
      .executeTakeFirst();
  }

  async create(
    insertable: InsertableAiProvider,
    trx?: KyselyTransaction,
  ): Promise<AiProvider> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiProviders')
      .values(insertable)
      .returning(this.baseFields)
      .executeTakeFirst();
  }

  async update(
    providerId: string,
    workspaceId: string,
    updatable: UpdatableAiProvider,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('aiProviders')
      .set({ ...updatable, updatedAt: new Date() })
      .where('id', '=', providerId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async delete(
    providerId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .deleteFrom('aiProviders')
      .where('id', '=', providerId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async clearDefault(workspaceId: string, trx?: KyselyTransaction) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('aiProviders')
      .set({ isDefault: false, updatedAt: new Date() })
      .where('workspaceId', '=', workspaceId)
      .where('isDefault', '=', true)
      .execute();
  }
}
