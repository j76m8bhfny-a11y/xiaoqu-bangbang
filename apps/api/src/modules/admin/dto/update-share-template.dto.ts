import { IsString, IsOptional, MaxLength } from 'class-validator';

export class UpdateShareTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titleTemplate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  defaultImageUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  status?: string;
}
