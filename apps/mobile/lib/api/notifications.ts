import { getApiClient } from '../api-client';
import type { Notification } from '../../types';

export async function getNotifications(): Promise<Notification[]> {
  const res = await getApiClient().post('/notifications/');
  return res.data;
}

export async function getUnreadCount(): Promise<number> {
  const res = await getApiClient().post('/notifications/unread-count');
  return res.data.count;
}

export async function markRead(notificationIds: string[]): Promise<void> {
  await getApiClient().post('/notifications/mark-read', { notificationIds });
}

export async function markAllRead(): Promise<void> {
  await getApiClient().post('/notifications/mark-all-read');
}
