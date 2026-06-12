import { IsOptional, IsString, IsDateString } from 'class-validator';

export class CreateApiKeyDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
