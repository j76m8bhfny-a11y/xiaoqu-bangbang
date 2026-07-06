import {
  IsString,
  IsOptional,
  IsArray,
  IsBoolean,
  IsEnum,
  IsNumber,
  MaxLength,
} from 'class-validator';

export class CreateEventDto {
  @IsEnum(['help_request', 'public_welfare', 'lost_found', 'public_feedback', 'discussion'])
  type: string;

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
  @IsArray()
  @IsString({ each: true })
  videos?: string[];

  @IsOptional()
  @IsString()
  rewardType?: string;

  @IsOptional()
  @IsNumber()
  rewardAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  locationText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  expectedTime?: string;

  @IsOptional()
  @IsString()
  eventTime?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  @IsEnum(['public', 'admin_only'])
  visibility?: string;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}
