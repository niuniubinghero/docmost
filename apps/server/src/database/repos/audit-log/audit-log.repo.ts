import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { PaginationOptions } from '@docmost/db/pagination/pagination-options';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';

@Injectable()
export class AuditLogRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  async findByWorkspace(
    workspaceId: string,
    pagination?: PaginationOptions,
  ) {
    let query = this.db
      .selectFrom('audit')
      .selectAll()
      .where('workspaceId', '=', workspaceId)
      .orderBy('createdAt', 'desc');

    return executeWithCursorPagination(query, {
      perPage: pagination?.limit ?? 50,
      cursor: pagination?.cursor,
      beforeCursor: pagination?.beforeCursor,
      fields: [
        { expression: 'createdAt', direction: 'desc' },
        { expression: 'id', direction: 'desc' },
      ],
      parseCursor: (cursor: any) => ({
        createdAt: cursor.createdAt,
        id: cursor.id,
      }),
    });
  }

  async create(auditLog: any) {
    return this.db
      .insertInto('audit')
      .values(auditLog)
      .executeTakeFirst();
  }

  async deleteOlderThan(workspaceId: string, cutoffDate: Date): Promise<number> {
    const result = await this.db
      .deleteFrom('audit')
      .where('workspaceId', '=', workspaceId)
      .where('createdAt', '<', cutoffDate)
      .executeTakeFirst();

    return Number(result.numDeletedRows || 0);
  }
}
