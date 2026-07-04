import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AddMarketCommentDto {
  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
