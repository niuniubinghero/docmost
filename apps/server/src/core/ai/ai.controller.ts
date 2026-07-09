import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { SkipThrottle, Throttle, ThrottlerGuard } from '@nestjs/throttler';
import {
  AI_CHAT_THROTTLER,
  AUTH_THROTTLER,
} from '../../integrations/throttle/throttler-names';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AiService, AiChatMessage } from './ai.service';
import { AiProviderRepo } from '@docmost/db/repos/ai-provider/ai-provider.repo';
import { FastifyReply } from 'fastify';

export enum AiAction {
  IMPROVE_WRITING = 'improve_writing',
  FIX_SPELLING_GRAMMAR = 'fix_spelling_grammar',
  MAKE_SHORTER = 'make_shorter',
  MAKE_LONGER = 'make_longer',
  SIMPLIFY = 'simplify',
  CHANGE_TONE = 'change_tone',
  SUMMARIZE = 'summarize',
  EXPLAIN = 'explain',
  CONTINUE_WRITING = 'continue_writing',
  TRANSLATE = 'translate',
  CUSTOM = 'custom',
}

const ACTION_SYSTEM_PROMPTS: Record<AiAction, string> = {
  [AiAction.IMPROVE_WRITING]:
    'You are a professional writing assistant. Improve the writing quality of the text while maintaining its original meaning and structure. Fix grammar, spelling, punctuation, and improve clarity, flow, and word choice. Return ONLY the improved text without any explanations, notes, or commentary.',
  [AiAction.FIX_SPELLING_GRAMMAR]:
    'You are a spelling and grammar checker. Fix ALL spelling errors, grammar mistakes, punctuation issues, and typos in the text. Return ONLY the corrected text without any explanations, notes, or commentary. Do not change the meaning or style of the text.',
  [AiAction.MAKE_SHORTER]:
    'You are a concise writing assistant. Make the text significantly shorter while preserving all key information and main ideas. Remove redundancy, combine sentences, and use more concise language. Return ONLY the shortened text.',
  [AiAction.MAKE_LONGER]:
    'You are an expandable writing assistant. Expand the text with more details, examples, explanations, and context while maintaining the original meaning. Add relevant information that enhances understanding. Return ONLY the expanded text.',
  [AiAction.SIMPLIFY]:
    'You are a simple language assistant. Simplify the text to make it easier to understand. Use common words, short sentences, and clear explanations. Avoid jargon, technical terms, and complex sentence structures. Return ONLY the simplified text.',
  [AiAction.CHANGE_TONE]:
    'You are a tone adjustment assistant. Change the tone of the text as requested while preserving the core meaning and information. Adapt vocabulary, sentence structure, and style to match the requested tone. Return ONLY the text with the new tone.',
  [AiAction.SUMMARIZE]:
    'You are a summarization assistant. Create a concise, clear summary of the text. Capture all key points, main ideas, and important details. Use bullet points for clarity when appropriate. Return ONLY the summary.',
  [AiAction.EXPLAIN]:
    'You are an explanation assistant. Explain the text in simple, easy-to-understand terms. Break down complex concepts, define technical terms, and provide examples when helpful. Make it accessible to someone unfamiliar with the topic.',
  [AiAction.CONTINUE_WRITING]:
    'You are a creative writing assistant. Continue the text naturally from where it ends. Match the existing style, tone, voice, and context seamlessly. Do not repeat what has already been written. Return ONLY the continuation text.',
  [AiAction.TRANSLATE]:
    'You are a professional translator. Translate the text accurately to the requested language. Maintain the original meaning, tone, and style. Use natural, fluent expressions in the target language. Return ONLY the translated text.',
  [AiAction.CUSTOM]:
    'You are a helpful AI assistant. Follow the user\'s instructions precisely. Return ONLY the requested output without explanations, notes, or commentary unless specifically asked for.',
};

@SkipThrottle({ [AUTH_THROTTLER]: true })
@Throttle({ [AI_CHAT_THROTTLER]: { limit: 25, ttl: 60000 } })
@UseGuards(JwtAuthGuard, ThrottlerGuard)
@Controller('ai')
export class AiController {
  constructor(
    private aiService: AiService,
    private aiProviderRepo: AiProviderRepo,
  ) {}

  private sanitizePrompt(prompt: string, maxLength = 200): string {
    return prompt.substring(0, maxLength).replace(/[`\$\\]/g, '');
  }

  @HttpCode(HttpStatus.OK)
  @Post('generate')
  async generate(
    @Body() body: { action?: AiAction; content: string; prompt?: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    const action = body.action || AiAction.CUSTOM;
    let systemPrompt = ACTION_SYSTEM_PROMPTS[action];

    if (action === AiAction.CHANGE_TONE && body.prompt) {
      const safePrompt = this.sanitizePrompt(body.prompt);
      systemPrompt = `You are a tone adjustment assistant. Change the tone of the text to be ${safePrompt} while preserving the meaning.`;
    } else if (action === AiAction.TRANSLATE && body.prompt) {
      const safePrompt = this.sanitizePrompt(body.prompt);
      systemPrompt = `You are a professional translator. Translate the text to ${safePrompt}. Maintain the original meaning and tone.`;
    } else if (action === AiAction.CUSTOM && body.prompt) {
      systemPrompt = this.sanitizePrompt(body.prompt, 500);
    }

    const messages: AiChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.content },
    ];

    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      return { content: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.' };
    }

    const result = await this.aiService.chat(messages, { provider });

    return { content: result };
  }

  @HttpCode(HttpStatus.OK)
  @Post('generate/stream')
  async generateStream(
    @Body() body: { action?: AiAction; content: string; prompt?: string },
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    const action = body.action || AiAction.CUSTOM;
    let systemPrompt = ACTION_SYSTEM_PROMPTS[action];

    if (action === AiAction.CHANGE_TONE && body.prompt) {
      const safePrompt = this.sanitizePrompt(body.prompt);
      systemPrompt = `You are a tone adjustment assistant. Change the tone of the text to be ${safePrompt} while preserving the meaning.`;
    } else if (action === AiAction.TRANSLATE && body.prompt) {
      const safePrompt = this.sanitizePrompt(body.prompt);
      systemPrompt = `You are a professional translator. Translate the text to ${safePrompt}. Maintain the original meaning and tone.`;
    } else if (action === AiAction.CUSTOM && body.prompt) {
      systemPrompt = this.sanitizePrompt(body.prompt, 500);
    }

    const messages: AiChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: body.content },
    ];

    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      res.raw.write(
        `data: ${JSON.stringify({ error: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.' })}\n\n`,
      );
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
      return;
    }

    try {
      const stream = this.aiService.chatStream(messages, { provider });
      for await (const chunk of stream) {
        res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    } catch (error: any) {
      res.raw.write(
        `data: ${JSON.stringify({ error: error.message })}\n\n`,
      );
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('answers')
  async answers(
    @Body() body: { query: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      return { answer: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.', sources: [] };
    }

    const messages: AiChatMessage[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant. Answer the user\'s question based on the workspace content. Be concise and helpful.',
      },
      { role: 'user', content: body.query },
    ];

    const result = await this.aiService.chat(messages, { provider });
    return { answer: result, sources: [] };
  }

  @HttpCode(HttpStatus.OK)
  @Post('chat')
  async chat(
    @Body() body: { messages: AiChatMessage[]; model?: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      return { content: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.' };
    }

    return this.aiService.chat(body.messages, { provider, model: body.model });
  }

  @HttpCode(HttpStatus.OK)
  @Post('chat/stream')
  async chatStream(
    @Body() body: { messages: AiChatMessage[]; model?: string },
    @Res() res: FastifyReply,
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    res.raw.setHeader('Content-Type', 'text/event-stream');
    res.raw.setHeader('Cache-Control', 'no-cache');
    res.raw.setHeader('Connection', 'keep-alive');

    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    if (!provider) {
      res.raw.write(
        `data: ${JSON.stringify({ content: 'No AI provider configured. Please ask your workspace administrator to set one up in Settings → AI Providers.' })}\n\n`,
      );
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
      return;
    }

    try {
      const stream = this.aiService.chatStream(body.messages, {
        provider,
        model: body.model,
      });

      for await (const chunk of stream) {
        res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      }

      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    } catch (error: any) {
      res.raw.write(
        `data: ${JSON.stringify({ error: error.message })}\n\n`,
      );
      res.raw.write('data: [DONE]\n\n');
      res.raw.end();
    }
  }

  @HttpCode(HttpStatus.OK)
  @Post('search')
  async aiSearch(
    @Body() body: { query: string; context: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    let provider = null;
    try {
      provider = await this.aiProviderRepo.findDefault(workspace.id);
    } catch (e) {
      provider = null;
    }

    return this.aiService.aiSearch(body.query, body.context, provider);
  }

  @HttpCode(HttpStatus.OK)
  @Post('web-search')
  async webSearch(
    @Body() body: { query: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    try {
      const results = await this.aiService.webSearch(body.query);
      return { results };
    } catch (error: any) {
      return { results: [], error: error.message };
    }
  }
}
