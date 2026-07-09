import { IsOptional, IsString, IsDateString, IsArray } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'API Key 名称', example: 'My API Key', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'API Key 过期时间（ISO 8601 日期字符串）',
    example: '2026-12-31T23:59:59Z',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ description: 'API Key 权限范围', example: ['page:read', 'space:read'], required: false })
  scopes?: string[];
}
