import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  app_name?: string;

  @IsOptional()
  @IsString()
  default_share_title?: string;

  @IsOptional()
  @IsString()
  default_share_image?: string;

  @IsOptional()
  @IsString()
  banner_count?: string;

  @IsOptional()
  @IsString()
  provider_count?: string;

  @IsOptional()
  @IsString()
  privacy_version?: string;

  @IsOptional()
  @IsString()
  default_review_policy?: string;

  // Allow any additional key-value pairs
  [key: string]: string | undefined;
}
