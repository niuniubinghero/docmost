import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { AiChatRepo } from '@docmost/db/repos/ai-chat/ai-chat.repo';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { AiService, AiChatMessage } from '../ai/ai.service';

@Injectable()
export class AiChatService {
  private readonly logger = new Logger(AiChatService.name);

  constructor(
    private aiChatRepo: AiChatRepo,
    private aiProviderRepo: AiProviderRepo,
    private aiService: AiService,
  ) {}

  async getChats(workspaceId: string, userId: string, options?: { limit?: number; cursor?: string }) {
    return this.aiChatRepo.findChatsByWorkspace(workspaceId, userId, options);
  }

  async getChatInfo(chatId: string, workspaceId: string) {
    const chat = await this.aiChatRepo.findChatById(chatId, workspaceId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    const messages = await this.aiChatRepo.findMessagesByChatId(chatId, workspaceId);
    return { chat, messages };
  }

  async createChat(workspaceId: string, userId: string, title?: string) {
    return this.aiChatRepo.createChat(workspaceId, userId, title);
  }

  async updateChat(chatId: string, workspaceId: string, data: { title?: string }) {
    const chat = await this.aiChatRepo.findChatById(chatId, workspaceId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.aiChatRepo.updateChat(chatId, workspaceId, data);
    return this.aiChatRepo.findChatById(chatId, workspaceId);
  }

  async deleteChat(chatId: string, workspaceId: string) {
    const chat = await this.aiChatRepo.findChatById(chatId, workspaceId);
    if (!chat) {
      throw new NotFoundException('Chat not found');
    }

    await this.aiChatRepo.deleteChat(chatId, workspaceId);
  }

  async searchChats(workspaceId: string, userId: string, query: string) {
    return this.aiChatRepo.searchChats(workspaceId, userId, query);
  }

  async createAssistantMessage(chatId: string, workspaceId: string, content: string, toolCalls?: any[]) {
    return this.aiChatRepo.createMessage({
      chatId,
      workspaceId,
      role: 'assistant',
      content,
      toolCalls,
    });
  }

  async generateChatTitle(chatId: string, workspaceId: string, userMessage: string): Promise<string> {
    try {
      const provider = await this.aiProviderRepo.findDefault(workspaceId);
      if (!provider) return userMessage.substring(0, 100);

      const messages: AiChatMessage[] = [
        {
          role: 'system',
          content: 'Generate a concise title (max 50 characters) for a conversation based on the user\'s first message. Return ONLY the title, no quotes or explanations.',
        },
        {
          role: 'user',
          content: userMessage,
        },
      ];

      const title = await this.aiService.chat(messages, { provider, maxTokens: 50 });
      return title.substring(0, 100) || userMessage.substring(0, 100);
    } catch (error: any) {
      this.logger.warn(`Failed to generate chat title: ${error.message}`);
      return userMessage.substring(0, 100);
    }
  }

  async updateChatTitleIfFirstMessage(chatId: string, workspaceId: string, userMessage: string): Promise<void> {
    try {
      const chat = await this.aiChatRepo.findChatById(chatId, workspaceId);
      if (chat && (!chat.title || chat.title === userMessage.substring(0, 100))) {
        const title = await this.generateChatTitle(chatId, workspaceId, userMessage);
        await this.aiChatRepo.updateChat(chatId, workspaceId, { title });
      }
    } catch (error: any) {
      this.logger.warn(`Failed to update chat title: ${error.message}`);
    }
  }
}
