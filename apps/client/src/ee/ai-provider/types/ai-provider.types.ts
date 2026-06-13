export type AiProvider = {
  id: string;
  workspaceId: string;
  name: string;
  type: AiProviderType;
  apiKey: string | null;
  baseUrl: string | null;
  modelName: string;
  isDefault: boolean;
  isActive: boolean;
  config: Record<string, any> | null;
  createdAt: string;
  updatedAt: string;
};

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

export interface ICreateAiProviderRequest {
  name: string;
  type: AiProviderType;
  apiKey?: string;
  baseUrl?: string;
  modelName: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: Record<string, any>;
}

export interface IUpdateAiProviderRequest {
  providerId: string;
  name?: string;
  type?: AiProviderType;
  apiKey?: string;
  baseUrl?: string;
  modelName?: string;
  isDefault?: boolean;
  isActive?: boolean;
  config?: Record<string, any>;
}

export const AI_PROVIDER_TYPE_LABELS: Record<AiProviderType, string> = {
  mimo: '小米 MiMo',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  ollama: 'Ollama (本地)',
  claude: 'Claude (官方)',
  'claude-compat': 'Claude (兼容)',
  kimi: 'Kimi (月之暗面)',
  deepseek: 'DeepSeek',
  qwen: '通义千问',
  custom: '自定义 OpenAI 兼容',
};

export const AI_PROVIDER_DEFAULTS: Record<
  AiProviderType,
  { baseUrl: string; modelName: string }
> = {
  mimo: { baseUrl: 'https://api.xiaomi.com/mimo', modelName: 'mimo-7b' },
  openai: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', modelName: 'gemini-pro' },
  ollama: { baseUrl: 'http://localhost:11434', modelName: 'llama3' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', modelName: 'claude-3-sonnet-20240229' },
  'claude-compat': { baseUrl: '', modelName: '' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', modelName: 'moonshot-v1-8k' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-plus' },
  custom: { baseUrl: '', modelName: '' },
};
