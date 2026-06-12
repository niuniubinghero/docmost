import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';
import { sql } from 'kysely';

export interface InsertableTemplate {
  title?: string;
  description?: string;
  content?: any;
  icon?: string;
  spaceId?: string;
  creatorId?: string;
  workspaceId: string;
}

export interface UpdatableTemplate {
  title?: string;
  description?: string;
  content?: any;
  icon?: string;
  spaceId?: string;
}

@Injectable()
export class TemplateRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findById(
    templateId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .selectFrom('templates')
      .selectAll()
      .where('id', '=', templateId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async findByWorkspace(
    workspaceId: string,
    pagination?: PaginationOptions,
  ) {
    let query = this.db
      .selectFrom('templates')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null);

    if (pagination?.query) {
      query = query.where((eb) =>
        eb(
          sql`f_unaccent(templates.title)`,
          'ilike',
          sql`f_unaccent(${'%' + pagination.query + '%'})`,
        ),
      );
    }

    return executeWithCursorPagination(query, {
      perPage: pagination?.limit ?? 50,
      cursor: pagination?.cursor,
      beforeCursor: pagination?.beforeCursor,
      fields: [
        { expression: 'title', direction: 'asc' },
        { expression: 'id', direction: 'asc' },
      ],
      parseCursor: (cursor: any) => ({ title: cursor.title, id: cursor.id }),
    });
  }

  async create(
    insertable: InsertableTemplate,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('templates')
      .values(insertable)
      .returningAll()
      .executeTakeFirst();
  }

  async update(
    updatable: UpdatableTemplate,
    templateId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('templates')
      .set({ ...updatable, updatedAt: new Date() })
      .where('id', '=', templateId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async softDelete(
    templateId: string,
    workspaceId: string,
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('templates')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', templateId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }
}
