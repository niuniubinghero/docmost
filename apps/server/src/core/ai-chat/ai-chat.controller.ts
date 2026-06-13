import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AiChatService } from './ai-chat.service';
import { AiService, AiChatMessage } from '../ai/ai.service';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { FastifyReply } from 'fastify';

@UseGuards(JwtAuthGuard)
@Controller('ai/chats')
export class AiChatController {
  constructor(
    private aiChatService: AiChatService,
    private aiService: AiService,
    private aiProviderRepo: AiProviderRepo,
    private pageRepo: PageRepo,
  ) {}

  @HttpCode(HttpStatus.OK)
  @Post()
  async listChats(
    @Body() body: { limit?: number; cursor?: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.getChats(workspace.id, user.id, {
      limit: body.limit,
      cursor: body.cursor,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('create')
  async createChat(
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.createChat(workspace.id, user.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('info')
  async getChatInfo(
    @Body() body: { chatId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.getChatInfo(body.chatId, workspace.id);
  }

  @HttpCode(HttpStatus.OK)
  @Post('update')
  async updateChat(
    @Body() body: { chatId: string; title: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.updateChat(body.chatId, workspace.id, {
      title: body.title,
    });
  }

  @HttpCode(HttpStatus.OK)
  @Post('delete')
  async deleteChat(
    @Body() body: { chatId: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    await this.aiChatService.deleteChat(body.chatId, workspace.id);
    return { success: true };
  }

  @HttpCode(HttpStatus.OK)
  @Post('search')
  async searchChats(
    @Body() body: { query: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiChatService.searchChats(workspace.id, user.id, body.query);
  }

  @HttpCode(HttpStatus.OK)
  @Post('send')
  async sendMessage(
    @Body() body: {
      chatId?: string;
      content: string;
      mentionedPageIds?: string[];
      contextPageId?: string;
      attachmentIds?: string[];
    },
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');
    res.raw.setHeader('X-Accel-Buffering', 'no');

    const sendEvent = (data: any) => {
      res.raw.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    try {
      let chatId = body.chatId;

      if (!chatId) {
        const chat = await this.aiChatService.createChat(
          workspace.id,
          user.id,
          body.content.substring(0, 100),
        );
        chatId = chat.id;
        sendEvent({ type: 'chat_created', chatId: chat.id });
      }

      let provider = null;
      try {
        provider = await this.aiProviderRepo.findDefault(workspace.id);
      } catch (e) {
        provider = null;
      }

      if (!provider) {
        sendEvent({
          type: 'error',
          message: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.',
          code: 'NO_PROVIDER',
        });
        sendEvent({ type: 'done', messageId: `err-${Date.now}` });
        res.raw.end();
        return;
      }

      // Build context from page content
      let contextPrompt = '';
      if (body.contextPageId) {
        try {
          const page = await this.pageRepo.findById(body.contextPageId, {
            includeTextContent: true,
          });
          if (page?.textContent) {
            const pageTitle = page.title || 'Untitled';
            const content = page.textContent.substring(0, 8000);
            contextPrompt = `\n\n[Page: "${pageTitle}"]\n${content}\n[End of page]`;
          }
        } catch (e) {
          // Page not found, skip context
        }
      }

      const userMessage = contextPrompt
        ? `${body.content}${contextPrompt}`
        : body.content;

      const messages: AiChatMessage[] = [
        { role: 'user', content: userMessage },
      ];

      let fullContent = '';

      const stream = this.aiService.chatStream(messages, { provider });

      for await (const chunk of stream) {
        fullContent += chunk;
        sendEvent({ type: 'content', text: chunk });
      }

      const assistantMessage = await this.aiChatService.createAssistantMessage(
        chatId,
        workspace.id,
        fullContent,
      );

      sendEvent({
        type: 'done',
        messageId: assistantMessage.id,
      });

      res.raw.end();
    } catch (error: any) {
      sendEvent({
        type: 'error',
        message: error.message || 'Internal server error',
      });
      sendEvent({ type: 'done', messageId: `err-${Date.now()}` });
      res.raw.end();
    }
  }
}
