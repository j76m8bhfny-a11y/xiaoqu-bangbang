import { IsString, IsOptional } from 'class-validator';

export class UpdateShareTemplateDto {
  @IsOptional()
  @IsString()
  titleTemplate?: string;

  @IsOptional()
  @IsString()
  defaultImageUrl?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
