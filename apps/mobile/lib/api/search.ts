import { getApiClient } from '../api-client';
import type { SearchResult } from '../../types';

export async function search(query: string, spaceId?: string): Promise<SearchResult[]> {
  const res = await getApiClient().post('/search', { query, spaceId });
  return res.data;
}

export async function searchSuggest(query: string): Promise<any[]> {
  const res = await getApiClient().post('/search/suggest', { query });
  return res.data;
}
