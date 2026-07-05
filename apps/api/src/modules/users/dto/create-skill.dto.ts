import { IsString, IsOptional, MaxLength, IsArray } from 'class-validator';
import type { CreateSkillRequest } from '@xiaoqu-bangbang/shared';

export class CreateSkillDto implements CreateSkillRequest {
  @IsString()
  @MaxLength(50)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];
}
