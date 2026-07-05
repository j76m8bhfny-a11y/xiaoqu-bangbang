import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class ReportDto {
  @IsEnum(['privacy', 'false_info', 'harassment', 'illegal', 'ad_spam', 'other'])
  reason: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  @IsEnum([
    'event',
    'event_comment',
    'market_item',
    'market_comment',
    'user',
    'topic',
    'topic_comment',
    'vote',
  ])
  targetType: string;

  @IsUUID()
  targetId: string;
}
