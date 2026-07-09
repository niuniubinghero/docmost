import {
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PartialType } from '@nestjs/mapped-types';

export class CreateWebhookDto {
  @ApiProperty({
    description: 'Webhook 接收地址',
    example: 'https://example.com/webhook',
  })
  @IsUrl()
  url: string;

  @ApiProperty({
    description: '订阅的事件列表',
    example: ['page.created', 'page.updated'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  events: string[];

  @ApiProperty({
    description: '是否启用',
    required: false,
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateWebhookDto extends PartialType(CreateWebhookDto) {
  @ApiProperty({ description: 'Webhook ID' })
  @IsString()
  id: string;
}
