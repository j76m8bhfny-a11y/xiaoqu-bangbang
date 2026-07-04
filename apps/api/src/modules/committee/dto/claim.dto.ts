import { IsString, IsOptional, IsArray, MaxLength } from 'class-validator';

export class ClaimDto {
  @IsString()
  @MaxLength(2000)
  statement: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialUrls?: string[];
}
