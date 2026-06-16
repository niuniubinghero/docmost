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
import { AiChatRepo } from '@docmost/db/repos/ai-chat/ai-chat.repo';
import { PageRepo } from '@docmost/db/repos/page/page.repo';
import { AiToolExecutor } from '../ai/ai-tool-executor';
import { FastifyReply } from 'fastify';

const MAX_TOOL_ROUNDS = 5;

@UseGuards(JwtAuthGuard)
@Controller('ai/chats')
export class AiChatController {
  constructor(
    private aiChatService: AiChatService,
    private aiService: AiService,
    private aiProviderRepo: AiProviderRepo,
    private aiChatRepo: AiChatRepo,
    private pageRepo: PageRepo,
    private aiToolExecutor: AiToolExecutor,
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
  @Post('write-to-page')
  async writeToPage(
    @Body() body: { pageId: string; content: string; operation?: 'append' | 'prepend' | 'replace' },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    try {
      await this.aiToolExecutor.executeTool(
        'update_page_content',
        {
          page_id: body.pageId,
          content: body.content,
          operation: body.operation || 'append',
        },
        user,
        workspace.id,
      );
      return { success: true };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
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
        sendEvent({ type: 'done', messageId: `err-${Date.now()}` });
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

      // Build messages with conversation history
      const messages: AiChatMessage[] = [];

      // Add system prompt with tool instructions
      messages.push({
        role: 'system',
        content: `You are an AI assistant for Docmost. You can modify documents using these tools:

TOOLS:
- read_page(page_id) -> reads page content
- update_page_content(page_id, content, operation) -> updates page (operation: append/prepend/replace)
- search_pages(query) -> searches pages
- create_page(title, space_id, content) -> creates new page

WHEN USER ASKS TO MODIFY A DOCUMENT:
1. First use search_pages to find the page ID
2. Then use read_page to see current content
3. Then use update_page_content to add/modify content

OUTPUT FORMAT - when you need to use a tool, output EXACTLY this format:
\`\`\`tool
{"action": "tool_name", "params": {"arg1": "value1"}}
\`\`\`

You can output multiple tool blocks. After tools execute, continue your response.

EXAMPLE - user asks "add content to MyPage":
\`\`\`tool
{"action": "search_pages", "params": {"query": "MyPage"}}
\`\`\`

Then after getting results, output another tool block with the page ID.`,
      });

      // Include conversation history if this is an existing chat
      if (chatId) {
        try {
          const history = await this.aiChatRepo.findMessagesByChatId(chatId, workspace.id);
          // Add previous messages (limit to last 20 for context window management)
          const recentHistory = history.slice(-20);
          for (const msg of recentHistory) {
            if (msg.role === 'user' || msg.role === 'assistant') {
              messages.push({
                role: msg.role as 'user' | 'assistant',
                content: msg.content || '',
              });
            }
          }
        } catch (e) {
          // If history fetch fails, continue with just the current message
        }
      }

      // Add current user message
      messages.push({ role: 'user', content: userMessage });

      // Save user message to database
      // Using a separate try-catch to ensure message save doesn't block AI response
      const saveUserMessage = async () => {
        try {
          const result = await this.aiChatRepo.createMessage({
            chatId,
            workspaceId: workspace.id,
            role: 'user',
            content: body.content,
            userId: user.id,
          });
          return result;
        } catch (error: any) {
          // Log error to stderr which should be visible
          process.stderr.write(`[AI-CHAT-ERROR] Failed to save user message: ${error?.message || String(error)}\n`);
          process.stderr.write(`[AI-CHAT-ERROR] Stack: ${error?.stack || 'N/A'}\n`);
          return null;
        }
      };

      // Execute but don't await - let it run in background
      saveUserMessage().then((result) => {
        if (result) {
          process.stderr.write(`[AI-CHAT] User message saved: ${result.id}\n`);
        }
      });

      let fullContent = '';
      const allToolCalls: any[] = [];
      let lastRoundContent = '';

      // Tool calling loop (prompt-based)
      for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
        // Don't pass tools to API - we handle it via prompt
        const stream = this.aiService.chatStream(messages, { provider });
        let roundContent = '';

        for await (const chunk of stream) {
          if (chunk.type === 'content') {
            roundContent += chunk.content;
            sendEvent({ type: 'content', text: chunk.content });
          }
        }

        lastRoundContent = roundContent;

        // Parse tool blocks from the response (```tool ... ```)
        const toolCallRegex = /```tool\n([\s\S]*?)```/g;
        const toolCalls: { action: string; params: Record<string, any> }[] = [];
        let match;

        while ((match = toolCallRegex.exec(roundContent)) !== null) {
          try {
            const parsed = JSON.parse(match[1]);
            if (parsed.action && parsed.params) {
              toolCalls.push(parsed);
            }
          } catch (e) {
            process.stderr.write(`[AI-TOOL] Failed to parse tool block: ${match[1]}\n`);
          }
        }

        process.stderr.write(`[AI-TOOL] Round ${round}: found ${toolCalls.length} tool calls\n`);

        if (toolCalls.length === 0) {
          // No tool calls found, we're done
          fullContent = roundContent;
          break;
        }

        // Execute each tool call
        const toolResults: string[] = [];
        for (const tc of toolCalls) {
          const toolCallId = `tc-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          sendEvent({ type: 'tool_call', id: toolCallId, name: tc.action, args: tc.params });

          let result;
          try {
            result = await this.aiToolExecutor.executeTool(
              tc.action,
              tc.params,
              user,
              workspace.id,
            );
          } catch (err: any) {
            process.stderr.write(`[AI-TOOL] Error executing ${tc.action}: ${err.message}\n`);
            result = { tool_call_id: toolCallId, name: tc.action, result: `Error: ${err.message}` };
          }

          allToolCalls.push({ id: toolCallId, name: tc.action, arguments: tc.params, result: result.result });
          toolResults.push(`Tool "${tc.action}" result:\n${result.result}`);

          sendEvent({
            type: 'tool_result',
            id: toolCallId,
            name: tc.action,
            result: result.result,
          });
        }

        // Add assistant message with tool calls to history
        messages.push({
          role: 'assistant',
          content: roundContent,
        });

        // Add tool results as user message so AI can continue
        messages.push({
          role: 'user',
          content: `Tool execution results:\n\n${toolResults.join('\n\n')}\n\nNow continue with the user's request based on these results.`,
        });
      }

      const assistantMessage = await this.aiChatService.createAssistantMessage(
        chatId,
        workspace.id,
        fullContent,
        allToolCalls.length > 0 ? allToolCalls : undefined,
      );

      // Auto-generate title for new chats (first message)
      if (!body.chatId && chatId) {
        // Don't await this - fire and forget
        this.aiChatService.updateChatTitleIfFirstMessage(
          chatId,
          workspace.id,
          body.content,
        ).catch(() => {});
      }

      // Auto-write to page when context page exists
      if (body.contextPageId && fullContent) {
        try {
          await this.aiToolExecutor.executeTool(
            'update_page_content',
            { page_id: body.contextPageId, content: fullContent, operation: 'append' },
            user,
            workspace.id,
          );
          sendEvent({ type: 'page_updated', pageId: body.contextPageId });
          process.stderr.write(`[AI-CHAT] Auto-wrote to page ${body.contextPageId}\n`);
        } catch (e: any) {
          process.stderr.write(`[AI-CHAT] Auto-write failed: ${e.message}\n`);
        }
      }

      sendEvent({
        type: 'done',
        messageId: assistantMessage.id,
      });

      res.raw.end();
    } catch (error: any) {
      // Determine error code and retryability
      let errorCode = 'INTERNAL_ERROR';
      let retryable = false;

      if (error.message?.includes('timed out')) {
        errorCode = 'TIMEOUT';
        retryable = true;
      } else if (error.message?.includes('rate limit') || error.status === 429) {
        errorCode = 'RATE_LIMIT';
        retryable = true;
      } else if (error.message?.includes('API key') || error.message?.includes('authentication') || error.status === 401) {
        errorCode = 'AUTH_ERROR';
        retryable = false;
      } else if (error.message?.includes('model not found') || error.status === 404) {
        errorCode = 'MODEL_NOT_FOUND';
        retryable = false;
      } else if (error.message?.includes('provider')) {
        errorCode = 'PROVIDER_ERROR';
        retryable = true;
      }

      sendEvent({
        type: 'error',
        message: error.message || 'Internal server error',
        code: errorCode,
        retryable,
      });
      sendEvent({ type: 'done', messageId: `err-${Date.now()}` });
      res.raw.end();
    }
  }
}
