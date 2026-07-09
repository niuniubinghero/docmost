import { getApiClient } from '../api-client';
import type { AiChat, AiChatMessage } from '../../types';

export async function getChats(): Promise<AiChat[]> {
  const res = await getApiClient().post('/ai/chats/');
  return res.data;
}

export async function createChat(title?: string): Promise<AiChat> {
  const res = await getApiClient().post('/ai/chats/create', { title });
  return res.data;
}

export async function getChatInfo(chatId: string): Promise<AiChat> {
  const res = await getApiClient().post('/ai/chats/info', { chatId });
  return res.data;
}

export async function deleteChat(chatId: string): Promise<void> {
  await getApiClient().post('/ai/chats/delete', { chatId });
}

export async function getChatMessages(chatId: string): Promise<AiChatMessage[]> {
  const res = await getApiClient().post('/ai/chats/info', { chatId });
  return res.data.messages || [];
}

export async function sendMessage(chatId: string, message: string): Promise<Response> {
  const serverUrl = getApiClient().defaults.baseURL?.replace('/api', '');
  const token = (await import('../storage')).getToken();

  return fetch(`${serverUrl}/api/ai/chats/send`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ chatId, message }),
  });
}
