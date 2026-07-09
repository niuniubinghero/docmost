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
  mimo: { baseUrl: 'https://api.xiaomi.com/mimo', modelName: 'mimo-v2.5' },
  openai: { baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o' },
  gemini: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', modelName: 'gemini-2.5-flash' },
  ollama: { baseUrl: 'http://localhost:11434', modelName: 'llama3.3' },
  claude: { baseUrl: 'https://api.anthropic.com/v1', modelName: 'claude-sonnet-4-20250514' },
  'claude-compat': { baseUrl: '', modelName: '' },
  kimi: { baseUrl: 'https://api.moonshot.cn/v1', modelName: 'moonshot-v1-8k' },
  deepseek: { baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  qwen: { baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-plus' },
  custom: { baseUrl: '', modelName: '' },
};

export const MODEL_PRESETS: Record<AiProviderType, string[]> = {
  mimo: ['mimo-v2.5'],
  openai: ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o3-mini', 'o4-mini'],
  gemini: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
  ollama: ['llama3.3', 'llama3.2', 'qwen3', 'gemma3', 'phi4', 'mistral', 'codellama', 'deepseek-r1'],
  claude: ['claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219', 'claude-3-5-sonnet-20241022', 'claude-3-5-haiku-20241022'],
  'claude-compat': [],
  kimi: ['moonshot-v1-8k', 'moonshot-v1-32k', 'moonshot-v1-128k'],
  deepseek: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner'],
  qwen: ['qwen-max', 'qwen-plus', 'qwen-turbo', 'qwen-long'],
  custom: [],
};
