export interface IWebhook {
  id: string;
  workspaceId: string;
  url: string;
  secret: string;
  events: string[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ICreateWebhookRequest {
  url: string;
  events: string[];
  enabled?: boolean;
}

export interface IUpdateWebhookRequest {
  id: string;
  url?: string;
  events?: string[];
  enabled?: boolean;
}

export const WEBHOOK_EVENTS = [
  "page.created",
  "page.updated",
  "page.deleted",
  "page.published",
  "share.created",
] as const;

export const WEBHOOK_EVENT_OPTIONS = WEBHOOK_EVENTS.map((event) => ({
  value: event,
  label: event,
}));
