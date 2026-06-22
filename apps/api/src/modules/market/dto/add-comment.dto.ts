import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AddMarketCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
