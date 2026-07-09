import api from "@/lib/api-client";
import {
  ICreateWebhookRequest,
  IUpdateWebhookRequest,
  IWebhook,
} from "@/features/webhook/types/webhook.types";

export async function fetchWebhooks(): Promise<IWebhook[]> {
  const req = await api.post("/webhooks", {});
  return req.data;
}

export async function createWebhook(
  data: ICreateWebhookRequest,
): Promise<IWebhook> {
  const req = await api.post<IWebhook>("/webhooks/create", data);
  return req.data;
}

export async function updateWebhook(
  data: IUpdateWebhookRequest,
): Promise<IWebhook> {
  const req = await api.post<IWebhook>("/webhooks/update", data);
  return req.data;
}

export async function deleteWebhook(data: { id: string }): Promise<void> {
  await api.post("/webhooks/delete", data);
}
