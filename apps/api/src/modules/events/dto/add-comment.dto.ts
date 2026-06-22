import { IsString, IsOptional, IsUUID } from 'class-validator';

export class AddEventCommentDto {
  @IsString()
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
