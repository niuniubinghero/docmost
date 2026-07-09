// Docmost API Types

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  workspaceId: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Workspace {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  hostname: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Space {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  icon: string | null;
  visibility: string;
  creatorId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Page {
  id: string;
  title: string;
  slug: string;
  content: any; // ProseMirror JSON
  textContent: string | null;
  icon: string | null;
  coverImage: string | null;
  parentId: string | null;
  spaceId: string;
  creatorId: string;
  workspaceId: string;
  isLocked: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PageMeta {
  id: string;
  title: string;
  slug: string;
  icon: string | null;
  parentId: string | null;
  spaceId: string;
  hasChildren: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Comment {
  id: string;
  content: any;
  pageId: string;
  creatorId: string;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
  creator?: User;
}

export interface SpaceMember {
  id: string;
  spaceId: string;
  userId: string;
  role: string;
  user?: User;
}

export interface Favorite {
  id: string;
  pageId: string | null;
  spaceId: string | null;
  templateId: string | null;
  userId: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  userId: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface AiChat {
  id: string;
  title: string;
  creatorId: string;
  workspaceId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AiChatMessage {
  id: string;
  chatId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface SearchResult {
  id: string;
  title: string;
  textContent: string;
  spaceId: string;
  icon: string | null;
  rank: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  workspace: Workspace;
}

export type AiProviderType =
  | 'mimo'
  | 'openai'
  | 'gemini'
  | 'ollama'
  | 'claude'
  | 'claude-compat'
  | 'kimi'
  | 'deepseek'
  | 'qwen'
  | 'custom';
