import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';
import type { UpdateSkillRequest } from '@xiaoqu-bangbang/shared';

export class UpdateSkillDto implements UpdateSkillRequest {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
