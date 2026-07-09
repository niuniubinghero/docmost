import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { JsonValue } from '@docmost/db/types/db.d';

export const AI_PROVIDER_TYPES = [
  'mimo',
  'openai',
  'gemini',
  'ollama',
  'claude',
  'claude-compat',
  'kimi',
  'deepseek',
  'qwen',
  'custom',
] as const;

export type AiProviderType = (typeof AI_PROVIDER_TYPES)[number];

export const AI_PROVIDER_DEFAULTS: Record<
  AiProviderType,
  { name: string; baseUrl: string; modelName: string }
> = {
  mimo: { name: '小米 MiMo', baseUrl: 'https://api.xiaomi.com/mimo', modelName: 'mimo-v2.5' },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', modelName: 'gpt-4o' },
  gemini: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta', modelName: 'gemini-2.5-flash' },
  ollama: { name: 'Ollama (本地)', baseUrl: 'http://localhost:11434', modelName: 'llama3.3' },
  claude: { name: 'Claude (官方)', baseUrl: 'https://api.anthropic.com/v1', modelName: 'claude-sonnet-4-20250514' },
  'claude-compat': { name: 'Claude (兼容)', baseUrl: '', modelName: '' },
  kimi: { name: 'Kimi (月之暗面)', baseUrl: 'https://api.moonshot.cn/v1', modelName: 'moonshot-v1-8k' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', modelName: 'deepseek-chat' },
  qwen: { name: '通义千问', baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1', modelName: 'qwen-plus' },
  custom: { name: '自定义', baseUrl: '', modelName: '' },
};

export class FetchModelsDto {
  @IsString()
  @IsNotEmpty()
  type: string;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;
}

export class CreateAiProviderDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsIn(AI_PROVIDER_TYPES)
  type: AiProviderType;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsString()
  @IsNotEmpty()
  modelName: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  config?: JsonValue;
}

export class UpdateAiProviderDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  @IsIn(AI_PROVIDER_TYPES)
  type?: AiProviderType;

  @IsOptional()
  @IsString()
  apiKey?: string;

  @IsOptional()
  @IsString()
  baseUrl?: string;

  @IsOptional()
  @IsString()
  modelName?: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  config?: JsonValue;
}
