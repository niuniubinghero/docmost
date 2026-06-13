import api from "@/lib/api-client";

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function webSearch(query: string): Promise<WebSearchResult[]> {
  const req = await api.post<{ results: WebSearchResult[]; error?: string }>(
    "/ai/web-search",
    { query }
  );
  return req.data.results || [];
}
