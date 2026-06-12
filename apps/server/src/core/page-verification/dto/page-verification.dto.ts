import { IsNotEmpty, IsOptional, IsString, IsArray, IsDateString } from 'class-validator';

export class CreatePageVerificationDto {
  @IsNotEmpty()
  @IsString()
  pageId: string;

  @IsOptional()
  @IsString()
  type?: string; // 'expiring' or 'qms'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verifierIds?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  recurrence?: string; // 'weekly', 'monthly', 'quarterly', 'yearly', 'none'
}

export class UpdatePageVerificationDto {
  @IsOptional()
  @IsString()
  status?: string; // 'approved', 'rejected', 'expired'

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  verifierIds?: string[];

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
