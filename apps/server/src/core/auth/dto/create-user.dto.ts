import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { NoUrls } from '../../../common/validators/no-urls.validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty({ description: '用户名称', example: '张三', required: false })
  @IsOptional()
  @MinLength(1)
  @MaxLength(50)
  @IsString()
  @NoUrls()
  @Transform(({ value }: TransformFnParams) => value?.trim())
  name: string;

  @ApiProperty({ description: '用户邮箱', example: 'user@example.com' })
  @IsNotEmpty()
  @IsEmail()
  email: string;

  @ApiProperty({ description: '用户密码', example: 'password123' })
  @IsNotEmpty()
  @MinLength(8)
  @MaxLength(70)
  @IsString()
  password: string;
}
