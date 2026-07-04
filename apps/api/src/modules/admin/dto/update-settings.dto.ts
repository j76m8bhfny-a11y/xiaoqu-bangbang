import { IsString, IsOptional } from 'class-validator';

export class UpdateSettingsDto {
  @IsOptional()
  @IsString()
  appName?: string;

  @IsOptional()
  @IsString()
  defaultShareTitle?: string;

  @IsOptional()
  @IsString()
  defaultShareImage?: string;

  @IsOptional()
  @IsString()
  bannerDisplayCount?: string;

  @IsOptional()
  @IsString()
  providerDisplayCount?: string;

  @IsOptional()
  @IsString()
  privacyVersion?: string;

  @IsOptional()
  @IsString()
  defaultReviewPolicy?: string;

  // Allow any additional key-value pairs
  [key: string]: string | undefined;
}
