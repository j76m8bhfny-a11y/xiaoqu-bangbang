import { IsString, IsOptional, MaxLength } from 'class-validator';

export class RespondEventDto {
  @IsString()
  @MaxLength(20)
  actionType: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  message?: string;
}
