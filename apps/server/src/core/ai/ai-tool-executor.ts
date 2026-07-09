import { Injectable, Logger } from '@nestjs/common';
import { InjectKysely } from 'nestjs-kysely';
import { KyselyDB } from '@docmost/db/types/kysely.types';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { PageService } from '../page/services/page.service';
import { CreatePageDto } from '../page/dto/create-page.dto';
import { SpaceRepo } from '@docmost/db/repos/space/space.repo';
import { User } from '@docmost/db/types/entity.types';
import { AiToolResult } from './ai-tools';

@Injectable()
export class AiToolExecutor {
  private readonly logger = new Logger(AiToolExecutor.name);

  constructor(
    @InjectKysely() private readonly db: KyselyDB,
    private pageRepo: PageRepo,
    private pageService: PageService,
    private spaceRepo: SpaceRepo,
  ) {}

  async executeTool(
    name: string,
    args: Record<string, any>,
    user: User,
    workspaceId: string,
    toolCallId?: string,
  ): Promise<AiToolResult> {
    try {
      let result: string;

      switch (name) {
        case 'read_page':
          result = await this.readPage(args.page_id, workspaceId);
          break;
        case 'update_page_content':
          result = await this.updatePageContent(
            args.page_id,
            args.content,
            args.operation,
            user,
            workspaceId,
          );
          break;
        case 'search_pages':
          result = await this.searchPages(args.query, workspaceId);
          break;
        case 'create_page':
          result = await this.createPage(
            args.title,
            args.space_id,
            args.content,
            user,
            workspaceId,
          );
          break;
        default:
          result = `Unknown tool: ${name}`;
      }

      return {
        tool_call_id: toolCallId || '',
        name,
        result,
      };
    } catch (error: any) {
      this.logger.error(`Tool execution error: ${error.message}`);
      return {
        tool_call_id: toolCallId || '',
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
    const pages = await this.db
      .selectFrom('pages')
      .select(['id', 'title', 'textContent'])
      .where('workspaceId', '=', workspaceId)
      .where('deletedAt', 'is', null)
      .where((eb) =>
        eb.or([
          eb('title', 'ilike', `%${safeQuery}%`),
          eb('textContent', 'ilike', `%${safeQuery}%`),
        ])
      )
      .limit(5)
      .execute();

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
}
