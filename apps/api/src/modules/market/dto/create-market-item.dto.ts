import { IsString, IsEnum, IsOptional, IsArray, IsNumber, MaxLength } from 'class-validator';

export class CreateMarketItemDto {
  @IsString()
  @IsEnum(['free', 'furniture', 'baby', 'books', 'pet', 'digital', 'other'])
  category: string;

  @IsString()
  @MaxLength(100)
  title: string;

  @IsString()
  @MaxLength(2000)
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  @IsEnum(['sell', 'free', 'exchange'])
  tradeType?: string;

  @IsOptional()
  @IsString()
  @IsEnum(['new', 'like_new', 'good', 'used', 'old'])
  conditionLevel?: string;
}
