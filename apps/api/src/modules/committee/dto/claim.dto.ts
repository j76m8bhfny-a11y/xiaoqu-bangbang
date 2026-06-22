import { IsString, IsOptional, IsArray } from 'class-validator';

export class ClaimDto {
  @IsString()
  statement: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialUrls?: string[];
}
