import {
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  ValidateIf,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export type ContentFormat = 'json' | 'markdown' | 'html';

export class CreatePageDto {
  @ApiProperty({ description: '页面标题', example: '新页面', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ description: '页面图标', example: '📄', required: false })
  @IsOptional()
  @IsString()
  icon?: string;

  @ApiProperty({ description: '父页面 ID', required: false })
  @IsOptional()
  @IsString()
  parentPageId?: string;

  @ApiProperty({ description: '所属空间 ID', example: 'uuid-of-space' })
  @IsUUID()
  spaceId: string;

  @ApiProperty({ description: '页面内容', required: false })
  @IsOptional()
  content?: string | object;

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
