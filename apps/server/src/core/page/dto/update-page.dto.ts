import { PartialType } from '@nestjs/mapped-types';
import { CreatePageDto, ContentFormat } from './create-page.dto';
import { IsIn, IsOptional, IsString, ValidateIf } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type ContentOperation = 'append' | 'prepend' | 'replace';

export class UpdatePageDto extends PartialType(CreatePageDto) {
  @ApiProperty({ description: '页面 ID', example: 'uuid-of-page' })
  @IsString()
  pageId: string;

  @ApiProperty({ description: '页面内容', required: false })
  @IsOptional()
  content?: string | object;

  @ApiProperty({
    description: '内容操作方式：append / prepend / replace',
    example: 'replace',
    enum: ['append', 'prepend', 'replace'],
    required: false,
  })
  @ValidateIf((o) => o.content !== undefined)
  @Transform(({ value }) => value?.toLowerCase())
  @IsIn(['append', 'prepend', 'replace'])
  operation?: ContentOperation;

  @ApiProperty({
    description: '内容格式：json / markdown / html',
    example: 'json',
    enum: ['json', 'markdown', 'html'],
    required: false,
  })
  @ValidateIf((o) => o.content !== undefined)
  @Transform(({ value }) => value?.toLowerCase() ?? 'json')
  @IsIn(['json', 'markdown', 'html'])
  format?: ContentFormat;
}
