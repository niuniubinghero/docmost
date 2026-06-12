import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
} from '@nestjs/common';
import { UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthUser } from '../../common/decorators/auth-user.decorator';
import { AuthWorkspace } from '../../common/decorators/auth-workspace.decorator';
import { User, Workspace } from '@docmost/db/types/entity.types';
import { AiService, AiChatMessage } from './ai.service';
import { FastifyReply } from 'fastify';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiController {
  constructor(private aiService: AiService) {}

  @HttpCode(HttpStatus.OK)
  @Post('chat')
  async chat(
    @Body() body: { messages: AiChatMessage[]; model?: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.chat(body.messages, { model: body.model });
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

    const stream = this.aiService.chatStream(body.messages, {
      model: body.model,
    });

    for await (const chunk of stream) {
      res.raw.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
    }

    res.raw.write('data: [DONE]\n\n');
    res.raw.end();
  }

  @HttpCode(HttpStatus.OK)
  @Post('improve-writing')
  async improveWriting(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.improveWriting(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('fix-spelling')
  async fixSpelling(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.fixSpelling(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('make-shorter')
  async makeShorter(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.makeShorter(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('make-longer')
  async makeLonger(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.makeLonger(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('simplify')
  async simplify(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.simplify(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('change-tone')
  async changeTone(
    @Body() body: { text: string; tone: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.changeTone(body.text, body.tone);
  }

  @HttpCode(HttpStatus.OK)
  @Post('summarize')
  async summarize(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.summarize(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('explain')
  async explain(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.explain(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('translate')
  async translate(
    @Body() body: { text: string; targetLanguage: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.translate(body.text, body.targetLanguage);
  }

  @HttpCode(HttpStatus.OK)
  @Post('continue-writing')
  async continueWriting(
    @Body() body: { text: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.continueWriting(body.text);
  }

  @HttpCode(HttpStatus.OK)
  @Post('search')
  async aiSearch(
    @Body() body: { query: string; context: string },
    @AuthUser() user: User,
    @AuthWorkspace() workspace: Workspace,
  ) {
    return this.aiService.aiSearch(body.query, body.context);
  }
}
