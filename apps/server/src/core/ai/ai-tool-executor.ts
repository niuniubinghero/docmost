import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { sql } from 'kysely';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageService } from '../page/services/page.service';
import { CreatePageDto } from '../page/dto/create-page.dto';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { User } from '@docmost/db/types/entity.types';
import { AiToolResult } from './ai-tools';
import { AiService } from './ai.service';
import { z } from 'zod';

const toolSchemas: Record<string, z.ZodType<any>> = {
  read_page: z.object({
    page_id: z.string().min(1, 'page_id is required'),
  }),
  update_page_content: z.object({
    page_id: z.string().min(1, 'page_id is required'),
    content: z.string(),
    operation: z.enum(['append', 'prepend', 'replace']),
  }),
  search_pages: z.object({
    query: z.string().min(1, 'query is required').max(500),
  }),
  create_page: z.object({
    title: z.string().min(1, 'title is required').max(500),
    space_id: z.string().min(1, 'space_id is required'),
    content: z.string().optional(),
  }),
  web_search: z.object({
    query: z.string().min(1, 'query is required').max(500),
  }),
};

@Injectable()
export class AiToolExecutor {
  private readonly logger = new Logger(AiToolExecutor.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private pageRepo: PageRepo,
    private pageService: PageService,
    private spaceRepo: SpaceRepo,
    private aiService: AiService,
  ) {}

  async executeTool(
    name: string,
    args: Record<string, any>,
    user: User,
    workspaceId: string,
    toolCallId?: string,
  ): Promise<AiToolResult> {
    const toolId = toolCallId || '';

    // Validate tool name
    const schema = toolSchemas[name];
    if (!schema) {
      return {
        tool_call_id: toolId,
        name,
        result: `Unknown tool: ${name}`,
      };
    }

    // Validate arguments
    const parsed = schema.safeParse(args);
    if (!parsed.success) {
      const errorMsg = parsed.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      return {
        tool_call_id: toolId,
        name,
        result: `Invalid arguments for ${name}: ${errorMsg}`,
      };
    }

    const validArgs = parsed.data;

    try {
      let result: string;

      switch (name) {
        case 'read_page':
          result = await this.readPage(validArgs.page_id, workspaceId);
          break;
        case 'update_page_content':
          result = await this.updatePageContent(
            validArgs.page_id,
            validArgs.content,
            validArgs.operation,
            user,
            workspaceId,
          );
          break;
        case 'search_pages':
          result = await this.searchPages(validArgs.query, workspaceId);
          break;
        case 'create_page':
          result = await this.createPage(
            validArgs.title,
            validArgs.space_id,
            validArgs.content,
            user,
            workspaceId,
          );
          break;
        case 'web_search':
          result = await this.webSearch(validArgs.query);
          break;
        default:
          result = `Unknown tool: ${name}`;
      }

      return {
        tool_call_id: toolId,
        name,
        result,
      };
    } catch (error: any) {
      this.logger.error(`Tool execution error: ${error.message}`);
      return {
        tool_call_id: toolId,
        name,
        result: `Error executing ${name}: ${error.message}`,
      };
    }
  }

  private async readPage(pageId: string, workspaceId: string): Promise<string> {
    const page = await this.pageRepo.findById(pageId, {
      includeTextContent: true,
    });

    if (!page) {
      return `Page not found with ID: ${pageId}`;
    }

    if (page.workspaceId !== workspaceId) {
      return `Access denied: page does not belong to this workspace`;
    }

    const title = page.title || 'Untitled';
    const content = page.textContent || '(empty page)';

    return `# ${title}\n\n${content}`;
  }

  private async updatePageContent(
    pageId: string,
    content: string,
    operation: 'append' | 'prepend' | 'replace',
    user: User,
    workspaceId: string,
  ): Promise<string> {
    // Verify page belongs to workspace before updating
    const page = await this.pageRepo.findById(pageId);
    if (!page) {
      return `Page not found with ID: ${pageId}`;
    }
    if (page.workspaceId !== workspaceId) {
      return `Access denied: page does not belong to this workspace`;
    }

    await this.pageService.updatePageContent(
      pageId,
      content,
      operation,
      'markdown',
      user,
    );

    return `Successfully ${operation === 'replace' ? 'replaced' : operation === 'append' ? 'appended to' : 'prepended to'} page content.`;
  }

  private escapeLikePattern(pattern: string): string {
    return pattern.replace(/%/g, '\\%').replace(/_/g, '\\_');
  }

  private async searchPages(query: string, workspaceId: string): Promise<string> {
    const safeQuery = this.escapeLikePattern(query);

    // Use PostgreSQL full-text search with existing tsv column and GIN index
    // Falls back to ilike for short queries (< 3 chars) since tsquery needs word tokens
    const useFullText = query.trim().length >= 3;

    let dbQuery = this.db
      .selectFrom('pages')
      .select(['id', 'title', 'textContent'])
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null);

    if (useFullText) {
      dbQuery = dbQuery
        .where((eb) =>
          eb.or([
            eb('title', 'ilike', `%${safeQuery}%`),
            sql`"tsv" @@ plainto_tsquery('english', ${query})` as any,
          ]),
        )
        .orderBy(
          sql`ts_rank("tsv", plainto_tsquery('english', ${query}))`,
          'desc',
        );
    } else {
      dbQuery = dbQuery.where((eb) =>
        eb.or([
          eb('title', 'ilike', `%${safeQuery}%`),
          eb('textContent', 'ilike', `%${safeQuery}%`),
        ]),
      );
    }

    const pages = await dbQuery.limit(5).execute();

    if (!pages || pages.length === 0) {
      return `No pages found matching "${query}"`;
    }

    const results = pages.map((p) => {
      const title = p.title || 'Untitled';
      const snippet = (p.textContent || '').substring(0, 200);
      return `- **${title}** (ID: ${p.id})\n  ${snippet}...`;
    });

    return `Found ${pages.length} pages:\n\n${results.join('\n')}`;
  }

  private async createPage(
    title: string,
    spaceId: string,
    content: string | undefined,
    user: User,
    workspaceId: string,
  ): Promise<string> {
    const space = await this.spaceRepo.findById(spaceId, workspaceId);
    if (!space || space.workspaceId !== workspaceId) {
      return `Space not found or access denied`;
    }

    const createPageDto: CreatePageDto = {
      title,
      spaceId,
      icon: '📄',
      ...(content ? { content, format: 'markdown' as const } : {}),
    };

    const page = await this.pageService.create(
      user.id,
      workspaceId,
      createPageDto,
    );

    return `Created page "${title}" with ID: ${page.id}`;
  }

  private async webSearch(query: string): Promise<string> {
    const results = await this.aiService.webSearch(query);
    const topResults = results.slice(0, 5);

    if (topResults.length === 0) {
      return `No web search results found for "${query}"`;
    }

    return topResults
      .map(
        (result) =>
          `### ${result.title}\n- **URL:** ${result.url}\n- **Snippet:** ${result.snippet}`,
      )
      .join('\n\n');
  }
}
