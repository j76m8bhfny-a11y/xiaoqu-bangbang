import { IsString, IsOptional, IsNumber } from 'class-validator';

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
  @IsNumber()
  bannerDisplayCount?: number;

  @IsOptional()
  @IsNumber()
  providerDisplayCount?: number;

  @IsOptional()
  @IsString()
  privacyVersion?: string;

  @IsOptional()
  @IsString()
  defaultReviewPolicy?: string;

  // Allow any additional key-value pairs
  [key: string]: string | number | undefined;
}
