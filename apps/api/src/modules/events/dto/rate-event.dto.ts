import { IsUUID, IsInt, Min, Max, IsOptional, IsArray, IsString } from 'class-validator';

export class RateEventDto {
  @IsUUID()
  targetUserId: string;

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
  content?: string;
}
