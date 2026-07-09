import api from "@/lib/api-client";
import type {
  AiProvider,
  ICreateAiProviderRequest,
  IUpdateAiProviderRequest,
} from "@/ee/ai-provider/types/ai-provider.types";

export async function getAiProviders(): Promise<AiProvider[]> {
  const req = await api.post("/ai-providers");
  return req.data;
}

export async function createAiProvider(
  data: ICreateAiProviderRequest,
): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/create", data);
  return req.data;
}

export async function updateAiProvider(
  data: IUpdateAiProviderRequest,
): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/update", data);
  return req.data;
}

export async function deleteAiProvider(providerId: string): Promise<void> {
  await api.post("/ai-providers/delete", { providerId });
}

export async function setDefaultAiProvider(
  providerId: string,
): Promise<AiProvider> {
  const req = await api.post<AiProvider>("/ai-providers/set-default", {
    providerId,
  });
  return req.data;
}

export async function testAiProviderConnection(
  providerId: string,
): Promise<{ success: boolean; response?: string; error?: string }> {
  const req = await api.post("/ai-providers/test", { providerId });
  return req.data;
}

export async function fetchProviderModels(
  type: string,
  apiKey?: string,
  baseUrl?: string,
): Promise<{ models: string[] }> {
  const req = await api.post("/ai-providers/models", {
    type,
    apiKey,
    baseUrl,
  });
  return req.data;
}
