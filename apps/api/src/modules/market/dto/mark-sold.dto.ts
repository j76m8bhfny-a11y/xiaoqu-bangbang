import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class MarkSoldDto {
  @IsOptional()
  @IsUUID()
  buyerId?: string;
}

export class AddInterestDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  message?: string;
}
