import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class AddEventCommentDto {
  @IsString()
  @MaxLength(500)
  content: string;

  @IsOptional()
  @IsUUID()
  parentId?: string;
}
