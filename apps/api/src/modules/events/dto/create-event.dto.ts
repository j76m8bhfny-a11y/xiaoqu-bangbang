import { IsString, IsOptional, IsArray, IsBoolean, IsEnum, IsNumber } from 'class-validator';

export class CreateEventDto {
  @IsEnum([
    'help_request',
    'help_offer',
    'public_welfare',
    'lost_found',
    'public_feedback',
    'discussion',
  ])
  type: string;

  @IsString()
  title: string;

  @IsString()
  description: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  images?: string[];

  @IsOptional()
  @IsString()
  rewardType?: string;

  @IsOptional()
  @IsNumber()
  rewardAmount?: number;

  @IsOptional()
  @IsString()
  locationText?: string;

  @IsOptional()
  @IsString()
  expectedTime?: string;

  @IsOptional()
  @IsBoolean()
  isAnonymous?: boolean;

  @IsOptional()
  @IsString()
  topicId?: string;

  @IsOptional()
  @IsNumber()
  capacity?: number;
}
