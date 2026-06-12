import { IsNotEmpty, IsOptional, IsString, IsObject } from 'class-validator';

export class CreateTemplateDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNotEmpty()
  @IsObject()
  content: any;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;
}

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsObject()
  content?: any;

  @IsOptional()
  @IsString()
  icon?: string;

  @IsOptional()
  @IsString()
  spaceId?: string;
}
