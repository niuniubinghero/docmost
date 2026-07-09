import { IUser } from "@/features/user/types/user.types.ts";

export interface IApiKey {
  id: string;
  name: string;
  token?: string;
  creatorId: string;
  workspaceId: string;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  creator?: Partial<IUser>;
  scopes?: string[] | null;
}

export interface ICreateApiKeyRequest {
  name: string;
  expiresAt?: string;
  scopes?: string[] | null;
}

export interface IUpdateApiKeyRequest {
  apiKeyId: string;
  name: string;
  scopes?: string[] | null;
}
