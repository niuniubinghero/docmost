import {
  IsAlphanumeric,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import {Transform, TransformFnParams} from "class-transformer";
import { ApiProperty } from '@nestjs/swagger';

export class CreateSpaceDto {
  @ApiProperty({ description: '空间名称', example: '我的空间' })
  @MinLength(2)
  @MaxLength(100)
  @IsString()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  name: string;

  @ApiProperty({ description: '空间描述', example: '用于存放项目文档', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: '空间标识 slug', example: 'my-space' })
  @MinLength(2)
  @MaxLength(100)
  @IsAlphanumeric()
  slug: string;
}
