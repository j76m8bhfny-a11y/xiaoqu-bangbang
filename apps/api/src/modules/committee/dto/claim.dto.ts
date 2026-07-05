import { IsString, IsOptional, IsArray, IsNotEmpty, MaxLength } from 'class-validator';

export class ClaimDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  statement: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  materialUrls?: string[];
}
