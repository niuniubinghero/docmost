import { getApiClient } from '../api-client';

export async function getFavorites(): Promise<any[]> {
  const res = await getApiClient().post('/favorites/');
  return res.data;
}

export async function getFavoriteIds(): Promise<string[]> {
  const res = await getApiClient().post('/favorites/ids');
  return res.data;
}

export async function addFavorite(data: {
  pageId?: string;
  spaceId?: string;
  templateId?: string;
}): Promise<void> {
  await getApiClient().post('/favorites/add', data);
}

export async function removeFavorite(data: {
  pageId?: string;
  spaceId?: string;
  templateId?: string;
}): Promise<void> {
  await getApiClient().post('/favorites/remove', data);
}
