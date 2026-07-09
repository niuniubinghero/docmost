import { Injectable } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB, KyselyTransaction } from '@docmost/db/types/kysely.types';
import { dbOrTx } from '@docmost/db/utils';
import { executeWithCursorPagination } from '@docmost/db/pagination/cursor-pagination';

export interface AiChat {
  id: string;
  workspaceId: string;
  creatorId: string;
  title: string | null;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date | null;
}

export interface AiChatMessage {
  id: string;
  chatId: string;
  workspaceId: string;
  userId: string | null;
  role: string;
  content: string | null;
  toolCalls: any;
  metadata: any;
  createdAt: Date;
  updatedAt?: Date;
  deletedAt?: Date | null;
}

@Injectable()
export class AiChatRepo {
  constructor(@InjectKysely() private readonly db: KyselyDB) {}

  private chatFields = [
    'aiChats.id',
    'aiChats.workspaceId',
    'aiChats.creatorId',
    'aiChats.title',
    'aiChats.createdAt',
    'aiChats.updatedAt',
  ] as const;

  private messageFields = [
    'aiChatMessages.id',
    'aiChatMessages.chatId',
    'aiChatMessages.workspaceId',
    'aiChatMessages.userId',
    'aiChatMessages.role',
    'aiChatMessages.content',
    'aiChatMessages.toolCalls',
    'aiChatMessages.metadata',
    'aiChatMessages.createdAt',
  ] as const;

  async findChatById(chatId: string, workspaceId: string): Promise<AiChat> {
    return this.db
      .selectFrom('aiChats')
      .select(this.chatFields)
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .executeTakeFirst();
  }

  async findChatsByWorkspace(
    workspaceId: string,
    userId: string,
    options?: { limit?: number; cursor?: string },
  ) {
    let query = this.db
      .selectFrom('aiChats')
      .select(this.chatFields)
      .where('workspaceId', '=', workspaceId)
      .where('creatorId', '=', userId)
      .where('deletedAt', 'is', null)
      .orderBy('updatedAt', 'desc');

    return executeWithCursorPagination(query, {
      perPage: options?.limit ?? 50,
      cursor: options?.cursor,
      fields: [
        { expression: 'updatedAt', direction: 'desc' },
        { expression: 'id', direction: 'desc' },
      ],
      parseCursor: (cursor: any) => ({
        updatedAt: cursor.updatedAt,
        id: cursor.id,
      }),
    });
  }

  async createChat(
    workspaceId: string,
    creatorId: string,
    title?: string,
    trx?: KyselyTransaction,
  ): Promise<AiChat> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiChats')
      .values({
        workspaceId,
        creatorId,
        title: title || null,
      })
      .returning(this.chatFields)
      .executeTakeFirst();
  }

  async updateChat(
    chatId: string,
    workspaceId: string,
    data: { title?: string },
    trx?: KyselyTransaction,
  ) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('aiChats')
      .set({ ...data, updatedAt: new Date() })
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .execute();
  }

  async deleteChat(chatId: string, workspaceId: string, trx?: KyselyTransaction) {
    const db = dbOrTx(this.db, trx);
    return db
      .updateTable('aiChats')
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where('id', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .execute();
  }

  async findMessagesByChatId(chatId: string, workspaceId: string): Promise<AiChatMessage[]> {
    return this.db
      .selectFrom('aiChatMessages')
      .select(this.messageFields)
      .where('chatId', '=', chatId)
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .orderBy('createdAt', 'asc')
      .execute();
  }

  async createMessage(
    data: {
      chatId: string;
      workspaceId: string;
      userId?: string;
      role: string;
      content?: string;
      toolCalls?: any;
      metadata?: any;
    },
    trx?: KyselyTransaction,
  ): Promise<AiChatMessage> {
    const db = dbOrTx(this.db, trx);
    return db
      .insertInto('aiChatMessages')
      .values(data)
      .returning(this.messageFields)
      .executeTakeFirst();
  }

  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  async searchChats(workspaceId: string, userId: string, query: string): Promise<AiChat[]> {
    const safeQuery = this.escapeLikePattern(query);
    return this.db
      .selectFrom('aiChats')
      .select(this.chatFields)
      .where('workspaceId', '=', workspaceId)
      .where('creatorId', '=', userId)
      .where('deletedAt', 'is', null)
      .where('title', 'ilike', `%${safeQuery}%`)
      .orderBy('updatedAt', 'desc')
      .limit(20)
      .execute();
  }
}
