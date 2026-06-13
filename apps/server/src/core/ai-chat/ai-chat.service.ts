import { Injectable, NotFoundException } from '@nestjs/common';
import { AiChatRepo } from '@docmost/db/repos/ai-chat/ai-chat.repo';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';

@Injectable()
export class AiChatService {
  constructor(
    private aiChatRepo: AiChatRepo,
    private aiProviderRepo: AiProviderRepo,
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

  async createAssistantMessage(chatId: string, workspaceId: string, content: string) {
    return this.aiChatRepo.createMessage({
      chatId,
      workspaceId,
      role: 'assistant',
      content,
    });
  }
}
