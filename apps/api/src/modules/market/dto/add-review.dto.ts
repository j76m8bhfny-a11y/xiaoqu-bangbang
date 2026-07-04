import { IsUUID, IsInt, Min, Max, IsOptional, IsArray, IsString, MaxLength } from 'class-validator';

export class AddMarketReviewDto {
  @IsUUID()
  revieweeId: string;

  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsString()
  @MaxLength(500)
  content?: string;
}
