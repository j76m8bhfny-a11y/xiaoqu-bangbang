import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class RespondGroupBuyDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsNumber()
  @Min(1)
  qty?: number;

  @IsOptional()
  @IsString()
  note?: string;
}
