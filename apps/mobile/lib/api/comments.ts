import { getApiClient } from '../api-client';
import type { Comment } from '../../types';

export async function getComments(pageId: string): Promise<Comment[]> {
  const res = await getApiClient().post('/comments/', { pageId });
  return res.data;
}

export async function createComment(data: {
  pageId: string;
  content: any;
  parentCommentId?: string;
}): Promise<Comment> {
  const res = await getApiClient().post('/comments/create', data);
  return res.data;
}

export async function updateComment(commentId: string, content: any): Promise<Comment> {
  const res = await getApiClient().post('/comments/update', { commentId, content });
  return res.data;
}

export async function deleteComment(commentId: string): Promise<void> {
  await getApiClient().post('/comments/delete', { commentId });
}

export async function resolveComment(commentId: string): Promise<void> {
  await getApiClient().post('/comments/resolve', { commentId });
}

export async function reopenComment(commentId: string): Promise<void> {
  await getApiClient().post('/comments/reopen', { commentId });
}
