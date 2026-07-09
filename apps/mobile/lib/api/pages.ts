import { getApiClient } from '../api-client';
import type { Page, PageMeta } from '../../types';

export async function getPageInfo(pageId: string, format?: string): Promise<Page> {
  const res = await getApiClient().post('/pages/info', { pageId, format });
  return res.data;
}

export async function getRecentPages(): Promise<Page[]> {
  const res = await getApiClient().post('/pages/recent');
  return res.data;
}

export async function getSidebarPages(spaceId: string): Promise<PageMeta[]> {
  const res = await getApiClient().post('/pages/sidebar-pages', { spaceId });
  return res.data;
}

export async function createPage(data: {
  title: string;
  spaceId: string;
  parentId?: string;
  content?: any;
}): Promise<Page> {
  const res = await getApiClient().post('/pages/create', data);
  return res.data;
}

export async function updatePage(data: {
  pageId: string;
  title?: string;
  content?: any;
  icon?: string | null;
  coverImage?: string | null;
}): Promise<Page> {
  const res = await getApiClient().post('/pages/update', data);
  return res.data;
}

export async function deletePage(pageId: string, permanent?: boolean): Promise<void> {
  await getApiClient().post('/pages/delete', { pageId, permanent });
}

export async function restorePage(pageId: string): Promise<void> {
  await getApiClient().post('/pages/restore', { pageId });
}

export async function getTrashPages(spaceId: string): Promise<Page[]> {
  const res = await getApiClient().post('/pages/trash', { spaceId });
  return res.data;
}

export async function duplicatePage(pageId: string): Promise<Page> {
  const res = await getApiClient().post('/pages/duplicate', { pageId });
  return res.data;
}

export async function getBreadcrumbs(pageId: string): Promise<any[]> {
  const res = await getApiClient().post('/pages/breadcrumbs', { pageId });
  return res.data;
}

export async function getBacklinks(pageId: string): Promise<any[]> {
  const res = await getApiClient().post('/pages/backlinks', { pageId });
  return res.data;
}

export async function getCollabToken(): Promise<string> {
  const res = await getApiClient().post('/auth/collab-token');
  return res.data.token;
}
