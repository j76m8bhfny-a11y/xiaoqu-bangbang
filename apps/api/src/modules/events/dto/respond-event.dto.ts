import { IsString, IsOptional } from 'class-validator';

export class RespondEventDto {
  @IsString()
  actionType: string;

  @IsOptional()
  @IsString()
  message?: string;
}
